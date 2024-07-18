// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "hardhat/console.sol";

contract Mastermind {
    string public constant name = "Mastermind";
    string public constant symbol = "ETH";
    uint8 public constant decimals = 18;
    receive() external payable {}
    fallback() external payable {
        console.log("Fallback function called. Amount of Ether received:", msg.value);
        console.log("Sender address:", msg.sender);
    }
    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return false;
    }


    // Game parameters
    uint8 public constant N_len_of_code = 4; // Number of colors in the code
    uint8 public constant M_num_possible_colors = 4; // Number of possible colors
    uint8 public constant NT_num_of_turns = 2; // Number of turns
    uint8 public constant NG_num_of_guesses = 3; // Number of guesses per turn
    uint8 public constant K_extra_points = 5; // Extra points for unbroken code
    uint8 public constant TIME_DISPUTE_BLOCKS = 10; //TDisp

    enum GameState { Created, Joined, InProgress, Ended }
    enum TurnPhase { Commit, Guess, Feedback, Reveal, // wait fot the CodeMaker to reveal the code
    WaitingForDispute }

    string[] public colors = ["R", "G", "B", "Y"];
    function getColors() public view returns (string[] memory) {
        return colors;
    }

    struct Game {
        address creator;
        address allowedOpponent; // address(0) if anyone can join the game. If not address(0), only this address can join.
        address opponent;

        uint256 stake;
        bytes32 secretHash;
        string secretCode;
        uint256 creatorScore;
        uint256 opponentScore;
        GameState state;
        TurnPhase phase;
        address codeMakerAddress;
        uint8 guessesCounter;
        uint8 turnsCounter;
        string[NG_num_of_guesses] currentTurnGuesses;
        Feedback[NG_num_of_guesses] currentTurnFeedbacks;

        uint accusationTimestamp;
        address winner;
    }

    function codeBreakerAddress(uint gameId) public view returns (address) {
        Game storage game = games[gameId];
        return game.codeMakerAddress == game.creator ? game.opponent : game.creator; // if you're not the codeMaker, you're the CodeBreaker
    }

    struct Feedback {
        uint8 correctColorAndPositionFeedback;
        uint8 correctColorWrongPositionFeedback;
    }

    // storage for all the different games
    mapping(uint => Game) games;
    uint public gameCount;

    // storage for games with only one player, used for to get a random game id to join
    mapping(uint => uint) private gameIdToIndex;
    uint[] private gamesWithOnePlayer;

    event GameCreated(uint gameId, address creator);
    event GameJoined(uint gameId, address opponent);
    event GameStarted(uint gameId, address codeMakerAddress);
    event CodeCommitted(uint gameId, bytes32 secretHash);
    event CodeGuessed(uint gameId, string guess, uint8 guessesLeft);
    event CodeRevealed(uint gameId, string secretCode);
    event GameEnded(uint gameId, address winner);
    event CodeGuessedSuccessfully(uint gameId, address codeMakerAddress);
    event CodeGuessedUnsccessfully(uint gameId, address codeMakerAddress, uint8 guessesLeft, uint8 correctColorAndPosition, uint8 correctColorWrongPosition);
    event DisputeDenied(uint gameId, address codeMakerAddress, uint8 turnsLeft);
    event AFKAccusation(address accusedUser, uint blocksLeft);
    event DisputeVerdict(uint gameId, address winner);



    // MODIFIERS --------------

    modifier onlyCreator(uint gameId) {
        require(msg.sender == games[gameId].creator, "Only creator can call this function");
        _;
    }

    modifier onlyOpponent(uint gameId) {
        require(msg.sender == games[gameId].opponent, "Only opponent can call this function");
        _;
    }

    modifier onlyPlayers(uint gameId) {
        require(msg.sender == games[gameId].creator || msg.sender == games[gameId].opponent, "Only players can call this function");
        _;
    }

    modifier inState(uint gameId, GameState _state) {
        require(games[gameId].state == _state, "Invalid game state");
        _;
    }

    modifier inPhase(uint gameId, TurnPhase _phase) {
        require(games[gameId].phase == _phase, "Invalid game phase");
        _;
    }

    // END OF MODIFIERS -------



    // GETTERS ----------------
    // creator address
    function getCreator(uint gameId) public view returns (address) {
        Game storage game = games[gameId];
        return game.creator;
    }

    function getOpponent(uint gameId) public view returns (address) {
        Game storage game = games[gameId];
        return game.opponent;
    }

    function getCreatorScore(uint gameId) public view returns (uint256) {
        Game storage game = games[gameId];
        return game.creatorScore;
    }

    function getOpponentScore(uint gameId) public view returns (uint256) {
        Game storage game = games[gameId];
        return game.opponentScore;
    }

    function getGameStake(uint gameId) external view returns (uint stake) {
        Game storage game = games[gameId];
        stake = game.stake;
        return stake;
    }

    function getGuessesAndTurnsLeft(uint gameId) external view returns (uint8, uint8) {
        Game storage game = games[gameId];
        return (NG_num_of_guesses - game.guessesCounter, NT_num_of_turns - game.turnsCounter);
    }
    // END OF GETTERS ----------


    function setWinnerAndEndGame(uint gameId, address payable winner) private {
        Game storage game = games[gameId];

        require(game.winner == address(0), "Winner already set!");

        uint stakeAmount = game.stake * 2;
        bool sent = winner.send(stakeAmount); // Returns false on failure
        require(sent, "Failed to send Ether");
        game.stake = 0;



        game.winner = winner;
        game.state = GameState.Ended;
        emit GameEnded(gameId, msg.sender);
        console.log ("!!! The game ended! The winner is: ", winner);
    }

    // Function to compute the winner of the game
    function computeWinnerBasedOnScore(uint gameId) public returns (address payable) {
        Game storage game = games[gameId];

        // TODO: what if tie?
        if (game.opponentScore > game.creatorScore) {
            return payable(game.creator);
        } else {
            return payable(game.opponent);
        }

    }

    // Function to view the winner of the game
    function getWinner(uint gameId) public view returns (address) {
        Game storage game = games[gameId];
        require(game.state == GameState.Ended, "The game has not finished yet!");
        require(game.winner != address(0), "No winner set!");

        return game.winner;
    }


    function createGame(address addr) external payable {
        require(msg.value > 0, "Stake must be greater than 0");
        require(addr != msg.sender, "You cannot play against yourself!");

        gameCount++;
        Game storage myGame = games[gameCount];
        
        myGame.allowedOpponent = addr;
        myGame.creator = msg.sender;
        myGame.opponent = address(0);
        myGame.stake = msg.value;
        myGame.secretHash = bytes32(0);
        myGame.secretCode = " ";
        myGame.creatorScore = 0;
        myGame.opponentScore = 0;
        myGame.state = GameState.Created;
        myGame.phase = TurnPhase.Commit;
        myGame.codeMakerAddress = msg.sender;
        myGame.guessesCounter = 0;
        myGame.turnsCounter = 0;
        myGame.accusationTimestamp = 0;


        // if anyone can join this game
        // i add this game to the list of games anyone can pick randomly
        if (myGame.allowedOpponent == address(0)) {
            gamesWithOnePlayer.push(gameCount);
            gameIdToIndex[gameCount] = gamesWithOnePlayer.length - 1;
        }

        console.log("!!! Game created with ID: ", gameCount);
        resetAFKAccusation(gameCount);


        emit GameCreated(gameCount, msg.sender);
    }



    function getRandomGameWithOnePlayer(uint8 seed) external view returns (uint) {
        require(gamesWithOnePlayer.length > 0, "No games with only one player available");
        uint randomIndex = uint(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, seed))) % gamesWithOnePlayer.length;
        return gamesWithOnePlayer[randomIndex];
    }


    // al giocatore deve andare bene quella stake
    // TODO: mostrare la stake prima di partire
    function joinGame(uint gameId) external payable inState(gameId, GameState.Created) {
        Game storage game = games[gameId];
        require(msg.value == game.stake, "Stake must match the creator's stake");
        require(msg.sender != game.creator, "You can't play against yourself!");
        require(game.allowedOpponent == address(0) || game.allowedOpponent == msg.sender, "This game is reserved for another opponent");


        game.opponent = msg.sender;
        game.state = GameState.Joined;

        // if the game was public, I have to remove it from the free games list
        if(game.allowedOpponent == address(0)) {
            // Remove game ID from array and mapping
            require(gamesWithOnePlayer.length >= 1, "Array of games with only one player is empty");
            uint index = gameIdToIndex[gameId];
            uint lastGameId = gamesWithOnePlayer[gamesWithOnePlayer.length - 1];

            // Move the last element to the index of the element to be removed
            gamesWithOnePlayer[index] = lastGameId;
            gameIdToIndex[lastGameId] = index;

            // Remove the last element
            gamesWithOnePlayer.pop();
            delete gameIdToIndex[gameId];
        }

        resetAFKAccusation(gameId);

        emit GameJoined(gameId, msg.sender);
    }

    function startGame(uint gameId) external onlyPlayers(gameId) inState(gameId, GameState.Joined) {
        Game storage game = games[gameId];

        // Randomly select roles
        if (block.timestamp % 2 == 0) {
            game.codeMakerAddress = game.creator;
        } else {
            game.codeMakerAddress = game.opponent;
        }
        game.state = GameState.InProgress;
        emit GameStarted(gameId, game.codeMakerAddress);
        resetAFKAccusation(gameId);
        console.log("!!! Fired GameStarted event. Game ID: ", gameId, ", codeMaker: ", game.codeMakerAddress);
    }

    function commitSecretCode(uint gameId, bytes32 secretHash) external onlyPlayers(gameId) inPhase(gameId, TurnPhase.Commit) {
        Game storage game = games[gameId];
        require(game.codeMakerAddress == msg.sender, "Only the CodeMaker can commit the code");

        game.secretHash = secretHash;
        game.phase = TurnPhase.Guess;

        resetAFKAccusation(gameId);

        emit CodeCommitted(gameId, secretHash);
        console.log("!!! Fired CodeCommitted event. Game ID: ", gameId);
    }

    function makeGuess(uint gameId, string memory guess) external onlyPlayers(gameId) inPhase(gameId, TurnPhase.Guess) {
        Game storage game = games[gameId];
        require(codeBreakerAddress(gameId) == msg.sender, "Only the CodeBreaker can make guesses");
        uint8 guessesLeft = NG_num_of_guesses - game.guessesCounter;
        require(guessesLeft > 0, "No tries left");

        uint256 guessesCounterUint256 = uint256(game.guessesCounter);
        game.currentTurnGuesses[guessesCounterUint256] = guess;
        game.guessesCounter++;
        guessesLeft = NG_num_of_guesses - game.guessesCounter;
        game.phase = TurnPhase.Feedback;

        resetAFKAccusation(gameId);

        emit CodeGuessed(gameId, guess, guessesLeft);
        console.log("!!! The codeBreaker has given their guess. emitting the event CodeGuessed");
    }

    
    function giveFeedback(uint gameId, uint8 correctColorAndPosition, uint8 correctColorWrongPosition) external onlyPlayers(gameId) inPhase(gameId, TurnPhase.Feedback) {
        Game storage game = games[gameId];
        require(game.codeMakerAddress == msg.sender, "Only the CodeMaker can give feedback");
        uint8 guessesLeft = NG_num_of_guesses - game.guessesCounter;

        // TODO: Validate feedback
        uint256 guessesCounterUint256 = uint256(game.guessesCounter);
        // string memory guess = game.currentTurnGuesses[guessesCounterUint256-1];
        game.currentTurnFeedbacks[guessesCounterUint256-1] = Feedback(correctColorAndPosition, correctColorWrongPosition); // -1 perché ho già aumentato il contatore di 1 in makeGuess

        game.phase = TurnPhase.Guess;

        if (correctColorAndPosition == N_len_of_code) {
            console.log ("The codeMaker has given feedback, the code is correct! The codeMaker guessed! Time to reveal the code!");
            game.phase = TurnPhase.Reveal;
            emit CodeGuessedSuccessfully(gameId, game.codeMakerAddress);
        } else {
            console.log ("The codeMaker has given feedback, the code is not correct.");

            if (guessesLeft == 0) {
                console.log ("!!! No turns left!");
                game.phase = TurnPhase.Reveal;
            }
            emit CodeGuessedUnsccessfully(gameId, game.codeMakerAddress, guessesLeft, correctColorAndPosition, correctColorWrongPosition);
        }
        resetAFKAccusation(gameId);

    }

    function revealCode(uint gameId, string memory secretCode) external onlyPlayers(gameId) inPhase(gameId, TurnPhase.Reveal) {
        Game storage game = games[gameId];
        require(game.codeMakerAddress == msg.sender, "Only the CodeMaker can reveal the code");
        
        // performing checks on the validity of the code
        // TODO: check if they work
        require(isCodeLegal(secretCode), "The code submitted is not legal!");
        require(keccak256(bytes(secretCode)) == game.secretHash, "This secret code doesn't match the hash submitted initially! Did you try to cheat?");

        game.secretCode = secretCode;
        game.phase = TurnPhase.WaitingForDispute;

        resetAFKAccusation(gameId);

        emit CodeRevealed(gameId, secretCode);
        console.log("!!! The code has been revealed. Emitting CodeRevealed event. The code was: ", secretCode);
    }

    function isCodeLegal(string memory secretCode) public view returns (bool) {
        require(secretCode.length == N_len_of_code, "Invalid secret code length");
        
        // check that every character inside secretCode is also inside string[] public colors = ["R", "G", "B", "Y"];
        bytes memory codeBytes = bytes(secretCode);

        for (uint256 i = 0; i < codeBytes.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < colors.length; j++) {
                if (keccak256(abi.encodePacked(codeBytes[i])) == keccak256(abi.encodePacked(colors[j]))) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return false;
            }
        }

        return true;
    }

    // Request a dispute on a certain feedback. Checks which one of the player is trying to cheat, ends the game and gives the stake to the player that was right.
    // TODO: check and test
    function dispute(uint gameId, uint feedbackIndexToDispute) external onlyPlayers(gameId) inPhase(gameId, TurnPhase.WaitingForDispute) {
        Game storage game = games[gameId];
        require(codeBreakerAddress(gameId) == msg.sender, "Only the CodeBreaker can dispute");

        bool feedbacksAreCorrect = false;
        bool correctCode = false;

        {
            // calculating the values of feedbacksAreCorrect and correctCode
            string memory secretCode = game.secretCode;
            string memory guess = game.currentTurnGuesses[feedbackIndexToDispute];
            uint8 ccpFeedback = game.currentTurnFeedbacks[feedbackIndexToDispute].correctColorAndPositionFeedback;
            uint8 ccwpFeedback = game.currentTurnFeedbacks[feedbackIndexToDispute].correctColorWrongPositionFeedback;

            correctCode = keccak256(bytes(guess)) == keccak256(bytes(secretCode));
            

            uint8 ccp = 0;
            uint8 ccwp = 0;

            // Convert strings to bytes for easier comparison
            bytes memory secretCodeBytes = bytes(secretCode);
            bytes memory guessBytes = bytes(guess);

            // Arrays to keep track of matched characters
            bool[] memory secretMatched = new bool[](secretCodeBytes.length);
            bool[] memory guessMatched = new bool[](guessBytes.length);

            // First pass: Find correct color and position (ccp)
            for (uint8 i = 0; i < secretCodeBytes.length; i++) {
                if (secretCodeBytes[i] == guessBytes[i]) {
                    ccp++;
                    secretMatched[i] = true;
                    guessMatched[i] = true;
                }
            }

            // Second pass: Find correct color but wrong position (ccwp)
            for (uint8 i = 0; i < secretCodeBytes.length; i++) {
                if (!secretMatched[i]) {
                    for (uint8 j = 0; j < guessBytes.length; j++) {
                        if (!guessMatched[j] && secretCodeBytes[i] == guessBytes[j]) {
                            ccwp++;
                            secretMatched[i] = true;
                            guessMatched[j] = true;
                            break;
                        }
                    }
                }
            }

            if(ccp == ccpFeedback && ccwp == ccwpFeedback) {
                feedbacksAreCorrect = true;
            }
        }
        
        if(!feedbacksAreCorrect) {
            console.log("!!! The result of the dispute is: the CodeBreaker was right! The Codemaker cheated. Sending stake to the CodeBreaker.");
            address payable winner = payable(codeBreakerAddress(gameId));
            setWinnerAndEndGame(gameId, winner);
            emit DisputeVerdict(gameId, codeBreakerAddress(gameId));

        } else {
            console.log("!!! The result of the dispute is: the CodeBreaker was wrong and accused of cheating! Sending stake to the Codemaker.");
            address payable winner = payable(game.codeMakerAddress);
            setWinnerAndEndGame(gameId, winner);
            emit DisputeVerdict(gameId, game.codeMakerAddress);
        }
        resetAFKAccusation(gameId);
    }



    function dontDispute(uint gameId) external onlyPlayers(gameId) inPhase(gameId, TurnPhase.WaitingForDispute) {
        Game storage game = games[gameId];
        require(codeBreakerAddress(gameId) == msg.sender, "Only the CodeBreaker can dispute");

        // assign points
        {
            uint256 points = uint256(game.guessesCounter);
            uint8 lastFeedback = game.currentTurnFeedbacks[uint256(game.guessesCounter)-1].correctColorAndPositionFeedback;
            if(lastFeedback != N_len_of_code) {
                points += K_extra_points;
                console.log("Since the code was not guessed correctly, the points will be increased by ", K_extra_points, " points.");
            }

            if(game.codeMakerAddress == game.creator) {
                game.creatorScore += points;
            } else {
                game.opponentScore += points;
            }
            console.log("!!! Points awarded: ", points, " points to the codeMaker.");
        }


        uint8 turnsLeft = NT_num_of_turns - game.turnsCounter;
        game.turnsCounter++;

        if (turnsLeft == 0) {
            game.state = GameState.Ended;
            address payable winnerAdd = payable(computeWinnerBasedOnScore(gameId)); // TODO: controllare che il numero di turni sia giusto, perché avevo ottenuto errore Error: reverted with reason string 'No winner set!'
            setWinnerAndEndGame(gameId, winnerAdd);
        } else {
            // prepare for next turn
            game.guessesCounter = 0; // reset guesses and feedbacks
            game.phase = TurnPhase.Commit;
            game.codeMakerAddress = codeBreakerAddress(gameId); // Swap roles
        }


        emit DisputeDenied(gameId, game.codeMakerAddress, turnsLeft);
        console.log("!!! The CodeBreaker doesnt want to dispte. Moving to the next turn. Fired DisputeDenied event. Game ID: ", gameId);
        resetAFKAccusation(gameId);

    }



    // returns the user that is supposed to make their move right now
    function getCurrentActiveUser(uint gameId) public view returns (address) {
        Game storage game = games[gameId];
        require(game.state == GameState.InProgress || game.state == GameState.Joined, "This game isnt in progress or joined");

        if (game.state == GameState.Joined) {
            // we are waiting for the cretor to call startGame()
            return game.creator;
        }

        // for each turnphase, I return the active user
        //enum TurnPhase { Commit, Guess, Feedback, Reveal, WaitingForDispute } 
        if(game.phase == TurnPhase.Commit) {
            return game.codeMakerAddress;
        } else if(game.phase == TurnPhase.Guess) {
            return codeBreakerAddress(gameId);
        } else if(game.phase == TurnPhase.Feedback) {
            return game.codeMakerAddress;
        } else if(game.phase == TurnPhase.Reveal) {
            return game.codeMakerAddress;
        } else if(game.phase == TurnPhase.WaitingForDispute) {
            return codeBreakerAddress(gameId);
        } else {
            require(false, "Error: Unknown TurnPhase");
        }

        return address(0);
    }

    // Function to start accusing AFK
    function startAccuseAFK(uint gameId, address accusedUser) public {
        Game storage game = games[gameId];

        address currentActiveUser = getCurrentActiveUser(gameId);
        require(accusedUser == currentActiveUser, "You can only accuse of AFK if it is their turn!");

        require(game.creator == accusedUser || game.opponent == accusedUser, "You accused an user that is not part of the game!");
        require(accusedUser != msg.sender, "You cannot accuse yourself!");
        require(game.state == GameState.InProgress || game.state == GameState.Joined, "You can only accuse AFK if the game is in progress or joined (waiting to start)!");
        require(game.accusationTimestamp == 0, "You already accused of AFK!");

        resetAFKAccusation(gameId);

        uint nowTimestamp = block.timestamp;
        game.accusationTimestamp = nowTimestamp;

        uint deadlineTimestamp = nowTimestamp + TIME_DISPUTE_BLOCKS;
        emit AFKAccusation(accusedUser, TIME_DISPUTE_BLOCKS);
    }

    // Function to reset AFK accusation status
    // Should be called when the TurnPhase changes
    function resetAFKAccusation(uint gameId) internal {
        Game storage game = games[gameId];
        game.accusationTimestamp = 0;
    }

    // Function to end AFK accusation and determine penalty
    // must be called after startAccuseAFK
    function endAccuseAFK(uint gameId) public returns (bool) {
        Game storage game = games[gameId];
        require(msg.sender != getCurrentActiveUser(gameId), "You cannot accuse of AFK while it is your turn to make a move!");
        require(game.state == GameState.InProgress || game.state == GameState.Joined, "You can only end AFK accusation during InProgress or Joined!");
        require(game.accusationTimestamp != 0, "No AFK accusation running right now. Maybe the other player made a move in time.");
        
        uint nowTimestamp = block.timestamp;

        require(nowTimestamp >= game.accusationTimestamp + TIME_DISPUTE_BLOCKS, "Not enough time passed since accusation! The opponent still has time to make their move.");

        // If all conditions met, declare the accuser as the winner
        setWinnerAndEndGame(gameId, payable(msg.sender));

        resetAFKAccusation(gameId);
        return true;
    }

}
