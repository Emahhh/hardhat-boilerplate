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
        uint lastActionTimestamp;
        address winner;
    }

    function codeBreakerAddress(uint gameId) public view returns (address) {
        Game storage game = games[gameId];
        return game.codeMakerAddress == game.creator ? game.opponent : game.creator;
    }

    struct Feedback {
        uint8 correctColorAndPositionFeedback;
        uint8 correctColorWrongPositionFeedback;
    }

    // storage for all the different games
    mapping(uint => Game) public games;
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
    event AFKAccusation(address accusedUser, uint deadlineTimestamp);



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




    // Function to compute the winner of the game
    function computeAndSetWinner(uint gameId) public returns (address) {
        Game storage game = games[gameId];
        require(game.winner == address(0), "Winner already set!");
        require(game.state == GameState.Ended, "Game is not ended yet!");

        // TODO: what if tie?
        if (game.opponentScore > game.creatorScore) {
            return game.creator;
        } else {
            return game.opponent;
        }

        game.state = GameState.Ended;
    }

    // Function to view the winner of the game
    // TODO. cambia client per usare questo
    function getWinner(uint gameId) public view returns (address) {
        Game storage game = games[gameId];
        require(game.state == GameState.Ended, "The game has not finished yet!");
        require(game.winner != address(0), "No winner set!");

        return game.winner;
    }


    function createGame() external payable {
        require(msg.value > 0, "Stake must be greater than 0");

        gameCount++;
        Game storage myGame = games[gameCount];

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

        // Add game ID to array and mapping
        gamesWithOnePlayer.push(gameCount);
        gameIdToIndex[gameCount] = gamesWithOnePlayer.length - 1;

        console.log("!!! Game created with ID: ", gameCount);

        emit GameCreated(gameCount, msg.sender);
    }



    function getRandomGameWithOnePlayer() external view returns (uint) {
        require(gamesWithOnePlayer.length > 0, "No games with only one player available");
        uint randomIndex = uint(keccak256(abi.encodePacked(block.timestamp, block.difficulty))) % gamesWithOnePlayer.length;
        return gamesWithOnePlayer[randomIndex];
    }


    // al giocatore deve andare bene quella stake
    // TODO: mostrare la stake prima di partire
    function joinGame(uint gameId) external payable inState(gameId, GameState.Created) {
        Game storage game = games[gameId];
        require(msg.sender != game.creator, "You can't play against yourself!");
        require(msg.value == game.stake, "Stake must match the creator's stake");

        game.opponent = msg.sender;
        game.state = GameState.Joined;

        // Remove game ID from array and mapping
        uint index = gameIdToIndex[gameId];
        uint lastGameId = gamesWithOnePlayer[gamesWithOnePlayer.length - 1];

        // Move the last element to the index of the element to be removed
        gamesWithOnePlayer[index] = lastGameId;
        gameIdToIndex[lastGameId] = index;

        // Remove the last element
        gamesWithOnePlayer.pop();
        delete gameIdToIndex[gameId];

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
        console.log("!!! Fired GameStarted event. Game ID: ", gameId, ", codeMaker: ", game.codeMakerAddress);
    }

    function commitSecretCode(uint gameId, bytes32 secretHash) external onlyPlayers(gameId) inPhase(gameId, TurnPhase.Commit) {
        Game storage game = games[gameId];
        require(game.codeMakerAddress == msg.sender, "Only the CodeMaker can commit the code");

        game.secretHash = secretHash;
        game.phase = TurnPhase.Guess;

        emit CodeCommitted(gameId, secretHash); // TODO: dire chi è il codemaker
        console.log("!!! Fired CodeCommitted event. Game ID: ", gameId);
    }

    function makeGuess(uint gameId, string memory guess) external onlyPlayers(gameId) inPhase(gameId, TurnPhase.Guess) {
        Game storage game = games[gameId];
        // TODO: what if the codemaker tries to call thid function? build a test case on it
        require(codeBreakerAddress(gameId) == msg.sender, "Only the CodeBreaker can make guesses");
        uint8 guessesLeft = NG_num_of_guesses - game.guessesCounter;
        require(guessesLeft > 0, "No tries left");

        // TODO: è necessario validare la lunghezza o è solo una spesa inutile di gas?
        // require(guess.length == N, "Invalid guess length");
        uint256 guessesCounterUint256 = uint256(game.guessesCounter);
        game.currentTurnGuesses[guessesCounterUint256] = guess;
        game.guessesCounter++;
        guessesLeft = NG_num_of_guesses - game.guessesCounter;
        game.phase = TurnPhase.Feedback;

        emit CodeGuessed(gameId, guess, guessesLeft); // TODO: dire di chi è il turno di dare il feedback
        console.log("!!! The codeBreaker has given their guess. emitting the event CodeGuessed");
    }

    
    function giveFeedback(uint gameId, uint8 correctColorAndPosition, uint8 correctColorWrongPosition) external onlyPlayers(gameId) inPhase(gameId, TurnPhase.Feedback) {
        Game storage game = games[gameId];
        require(game.codeMakerAddress == msg.sender, "Only the CodeMaker can give feedback");
        uint8 guessesLeft = NG_num_of_guesses - game.guessesCounter;

        // TODO: Validate feedback
        uint256 guessesCounterUint256 = uint256(game.guessesCounter);
        string memory guess = game.currentTurnGuesses[guessesCounterUint256-1];
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

    }

    function revealCode(uint gameId, string memory secretCode) external onlyPlayers(gameId) inPhase(gameId, TurnPhase.Reveal) {
        Game storage game = games[gameId];
        require(game.codeMakerAddress == msg.sender, "Only the CodeMaker can reveal the code");

        require(keccak256(bytes(secretCode)) == game.secretHash, "This secret code doesn't match the hash submitted initially! Did you try to cheat?");

        game.secretCode = secretCode;
        game.phase = TurnPhase.WaitingForDispute;

        emit CodeRevealed(gameId, secretCode);
        console.log("!!! The code has been revealed. Emitting CodeRevealed event. The code was: ", secretCode);
        // TODO: call endTurn(gameId)? maybe after the second for dispute
        // call endTurn after DISPUTE_SECONDS

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
        
        if(correctCode || !feedbacksAreCorrect) {
            console.log("!!! The result of the dispute is: the CodeBreaker was right! The Codemaker cheated. Sending stake to the CodeBreaker.");

            game.state = GameState.Ended;
            address payable winnerAdd = payable(codeBreakerAddress(gameId));
            uint stakeAmount = game.stake * 2;
            bool sent = winnerAdd.send(stakeAmount); // Returns false on failure
            require(sent, "Failed to send Ether");

        } else {
            console.log("!!! The result of the dispute is: the CodeBreaker was wrong and accused of cheating! Sending stake to the Codemaker.");
            game.state = GameState.Ended;
            address payable winnerAdd = payable(game.codeMakerAddress);
            uint stakeAmount = game.stake * 2;
            bool sent = winnerAdd.send(stakeAmount); // Returns false on failure
            require(sent, "Failed to send Ether");
        }
    }


    // TODO: QUI VA LA LOGICA PER LA ASSEGNAZIONE DEI PUNTI E DEL NUOVO TURNO
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


        game.turnsCounter++;
        uint8 turnsLeft = NT_num_of_turns - game.turnsCounter;

        if (turnsLeft == 0) {
            game.state = GameState.Ended;
            address payable winnerAdd = payable(getWinner(gameId));
            console.log ("!!! The game ended! The winner is: ", winnerAdd);

            // Transfer the stake to the winner TODO: fare una funzione "redeem"?
            uint stakeAmount = game.stake * 2;
            bool sent = winnerAdd.send(stakeAmount); // Returns false on failure
            require(sent, "Failed to send Ether");

            console.log ("Successfully sent stake to: ", winnerAdd, ". Stake amount: ", stakeAmount);

            // Reset the stake for the game
            game.stake = 0;

        } else {

            game.phase = TurnPhase.Commit;

            // reset guesses and feedbacks
            game.guessesCounter = 0;

            // Swap roles
            game.codeMakerAddress = codeBreakerAddress(gameId);
        }

        // TODO: 

        emit DisputeDenied(gameId, game.codeMakerAddress, turnsLeft);
        console.log("!!! The CodeBreaker doesnt want to dispte. Moving to the next turn. Fired DisputeDenied event. Game ID: ", gameId);
    }



    // returns the user that is supposed to make their move right now
    function getCurrentActiveUser(uint gameId) public view returns (address) {
        Game storage game = games[gameId];
        require(game.state == GameState.InProgress, "Game is not in progress");

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
    }

    // Function to start accusing AFK
    function startAccuseAFK(uint gameId, address accusedUser) public {
        Game storage game = games[gameId];

        address currentActiveUser = getCurrentActiveUser(gameId);
        require(accusedUser == currentActiveUser, "You can only accuse of AFK if it is their turn!");

        require(game.creator == accusedUser || game.opponent == accusedUser, "You accused an user that is not part of the game!");
        require(accusedUser != msg.sender, "You cannot accuse yourself!");
        require(game.phase == TurnPhase.Guess, "You can only accuse AFK during the Guess phase!");
        require(game.accusationTimestamp == 0, "You already accused of AFK!");
        require(game.lastActionTimestamp == 0, "The opponent has already made their move!");

        uint nowTimestamp = block.timestamp;
        game.accusationTimestamp = nowTimestamp;

        uint deadlineTimestamp = nowTimestamp + TIME_DISPUTE_BLOCKS;
        emit AFKAccusation(accusedUser, deadlineTimestamp);
    }

    // Function to reset AFK accusation status
    // Should be called when the TurnPhase changes // TODO: check that i did this everyehwere
    function resetAFKAccusation(uint gameId) internal {
        Game storage game = games[gameId];
        game.accusationTimestamp = 0;
        game.lastActionTimestamp = 0;
    }

    // Function to end AFK accusation and determine penalty
    function endAccuseAFK(uint gameId) public {
        Game storage game = games[gameId];
        require(msg.sender != game.codeMakerAddress, "You cannot accuse of AFK while it is your turn to make a move!");
        require(game.phase == TurnPhase.Guess, "You can only end AFK accusation during the Guess phase!");
        require(game.accusationTimestamp != 0, "No AFK accusation started! You must call startAccuseAFK first.");
        
        uint nowTimestamp = block.timestamp;

        require(nowTimestamp >= game.accusationTimestamp + TIME_DISPUTE_BLOCKS, "Not enough time passed since accusation! The opponent still has time to make their move.");
        require(nowTimestamp <= game.lastActionTimestamp + TIME_DISPUTE_BLOCKS, "Opponent made their move in time! AFK penalty cannot be confirmed.");

        // If all conditions met, declare the accuser as the winner
        game.winner = msg.sender;
        game.state = GameState.Ended;

        emit GameEnded(gameId, msg.sender);
    }

}
