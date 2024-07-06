//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import "hardhat/console.sol";


contract Mastermind {
    string public constant name = "Mastermind";

    // Game parameters
    uint public constant N = 4; // Number of colors in the code
    uint public constant M = 6; // Number of possible colors
    uint public constant NT = 10; // Number of turns
    uint public constant NG = 12; // Number of guesses per turn
    uint public constant K = 5; // Extra points for unbroken code
    uint public constant DISPUTE_SECONDS = 10; //TDisp

    enum GameState { Created, Joined, InProgress, Ended }
    enum TurnPhase { Commit, Guess, Feedback, Reveal, // wait fot the CodeMaker to reveal the code
    WaitingForDispute }

    string[] public colors = ["Red", "Green", "Blue", "Yellow", "Black", "White"];
    function getColors() public view returns (string[] memory) {
        return colors;
    }

    struct Game {
        address creator;
        address opponent;
        uint256 stake;
        bytes32 secretHash;
        string secretCode;
        uint256 codeBreakerScore;
        uint256 codeMakerScore;
        GameState state;
        TurnPhase phase;
        address codeMakerAddress;
        uint256 guessesCounter;
        string[NG] currentTurnGuesses;
        Feedback[NG] currentTurnFeedbacks;
    }

    struct Feedback {
        uint256 correctColorAndPositionFeedback;
        uint256 correctColorWrongPositionFeedback;
    }

    // storage for all the different games
    mapping(uint => Game) public games;
    uint public gameCount;

    event GameCreated(uint gameId, address creator);
    event GameJoined(uint gameId, address opponent);
    event GameStarted(uint gameId, address codeMakerAddress);
    event CodeCommitted(uint gameId, bytes32 secretHash);
    event CodeGuessed(uint gameId, string guess);
    event FeedbackGiven(uint gameId, uint correctColorAndPosition, uint correctColorWrongPosition);
    event CodeRevealed(uint gameId, string secretCode);
    event GameEnded(uint gameId, address winner);
    event CodeGuessedSuccessfully(uint gameId, address codeMakerAddress);
    event CodeGuessedUnsccessfully(uint gameId, address codeMakerAddress, uint triesLeft);


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

    receive() external payable {} // to support receiving ETH by default
    fallback() external payable {}

    function createGame() external payable {
        require(msg.value > 0, "Stake must be greater than 0");

        gameCount++;
        Game storage myGame = games[gameCount];

        myGame.creator= msg.sender;
        myGame.opponent= address(0);
        myGame.stake= msg.value;
        myGame.secretHash= bytes32(0);
        myGame.secretCode = " ";
        myGame.codeBreakerScore= 0;
        myGame.codeMakerScore= 0;
        myGame.state= GameState.Created;
        myGame.phase= TurnPhase.Commit;
        myGame.codeMakerAddress = msg.sender;
        myGame.guessesCounter= 0;

        // for (uint32 i=0; i < NG; i++) {
        //     myGame.currentTurnFeedbacks[i] = Feedback(0, 0);
        //     myGame.currentTurnGuesses[i] = " ";
        // }

        console.log("!!! Game created with ID: ", gameCount);
        
        emit GameCreated(gameCount, msg.sender);
    }

    function getGameStake(uint gameId) external view returns (uint stake) {
        Game storage game = games[gameId];
        stake = game.stake;
        return stake;
    }


    // al giocatore deve andare bene quella stake
    // TODO: mostrare la stake prima di partire
    function joinGame(uint gameId) external payable inState(gameId, GameState.Created) {
        Game storage game = games[gameId];
        require(msg.sender != game.creator, "You can't play against yourself!");
        require(msg.value == game.stake, "Stake must match the creator's stake");

        game.opponent = msg.sender;
        game.state = GameState.Joined;

        emit GameJoined(gameId, msg.sender);
    }

    function startGame(uint gameId) external onlyPlayers(gameId) inState(gameId, GameState.Joined) {
        Game storage game = games[gameId];

        // Randomly select roles
        if (block.timestamp % 2 == 0) {
            game.codeMakerAddress = msg.sender;
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
    }

    function makeGuess(uint gameId, string memory guess) external onlyPlayers(gameId) inPhase(gameId, TurnPhase.Guess) {
        Game storage game = games[gameId];
        // TODO: what if the codemaker tries to call thid function? build a test case on it
        require(game.codeMakerAddress != msg.sender, "Only the CodeBreaker can make guesses");
        require(game.currentTurnFeedbacks.length >= NG, "No tries left");

        // TODO: è necessario validare la lunghezza o è solo una spesa inutile di gas?
        // require(guess.length == N, "Invalid guess length");

        game.currentTurnGuesses[game.guessesCounter] = guess;
        game.guessesCounter++;
        game.phase = TurnPhase.Feedback;

        emit CodeGuessed(gameId, guess); // TODO: dire di chi è il turno di dare il feedback
        console.log("!!! The codeBreaker has given their guess. emitting the event CodeGuessed");
    }

    
    function giveFeedback(uint gameId, uint correctColorAndPosition, uint correctColorWrongPosition) external onlyPlayers(gameId) inPhase(gameId, TurnPhase.Feedback) {
        Game storage game = games[gameId];
        require(game.codeMakerAddress == msg.sender, "Only the CodeMaker can give feedback");
        require(game.currentTurnFeedbacks.length >= NG, "No tries left");

        // TODO: Validate feedback
        game.currentTurnFeedbacks[game.guessesCounter-1] = Feedback(correctColorAndPosition, correctColorWrongPosition); // -1 perché ho già aumentato il contatore di 1 in makeGuess


        uint triesLeft = NG - game.guessesCounter;

        if (correctColorAndPosition == N) {
            console.log ("The codeMaker has given feedback, the code is correct! The codeMaker guessed! Time to reveal the code!");
            game.phase = TurnPhase.Reveal;
            emit CodeGuessedSuccessfully(gameId, game.codeMakerAddress);
        } else {
            console.log ("The codeMaker has given feedback, the code is not correct.");

            if (triesLeft == 0) {
                console.log ("!!! No turns left!");
                game.phase = TurnPhase.Reveal;
                emit CodeGuessedUnsccessfully(gameId, game.codeMakerAddress, triesLeft);
            }
        }

    }

    function revealCode(uint gameId, string memory secretCode) external onlyPlayers(gameId) inPhase(gameId, TurnPhase.Reveal) {
        Game storage game = games[gameId];
        require(game.codeMakerAddress == msg.sender, "Only the CodeMaker can reveal the code");

        require(keccak256(bytes(secretCode)) == game.secretHash, "This secret code doesn't match the hash submitted initially! Did you try to cheat?");

        game.secretCode = secretCode;
        game.phase = TurnPhase.WaitingForDispute;

        emit CodeRevealed(gameId, secretCode);
        // TODO: call endTurn(gameId)? maybe after the second for dispute
        // call endTurn after DISPUTE_SECONDS

    }

    // fa la disputa ad un certo feedback, controlla e da i soldi a chi ha ragione
    // TODO: implement
    function dispute(uint gameId, uint feedbackIndexToDispute) external onlyPlayers(gameId) inPhase(gameId, TurnPhase.WaitingForDispute) {
        Game storage game = games[gameId];
        require(game.codeMakerAddress != msg.sender, "Only the CodeBreaker can dispute");

        // TODO: end the whole game
    }

    // assigns the points, ends this turn and prepares the next turn
    // TODO: il client del codebreaker mnostrerà 2 bottoni: disputa o finisci turno
    function endTurn(uint gameId) external onlyPlayers(gameId) inPhase(gameId, TurnPhase.WaitingForDispute) {
        Game storage game = games[gameId];

        // Calculate points and update scores
        // TODO: what if the codemaker cheated and didnt say anything when they guessed?
        uint lastGuessIndex = game.guessesCounter - 1;
        if(game.currentTurnFeedbacks[lastGuessIndex].correctColorAndPositionFeedback == N) {
            game.codeMakerScore++;
        } else {
            game.codeBreakerScore++;
        }

        // reset guesses and feedbacks
        // game.currentTurnGuesses = new string[](NG);
        // game.currentTurnFeedbacks = new Feedback[](NG);
        game.guessesCounter = 0;

        // Swap roles
        if (game.codeMakerAddress == msg.sender) {
            game.codeMakerAddress = game.opponent;
        } else {
            game.codeMakerAddress = msg.sender;
        }

        // if the number of turns ended, let's announce the winner
        if (game.codeBreakerScore + game.codeMakerScore >= NT) {
            game.state = GameState.Ended;
            address winner = game.codeBreakerScore > game.codeMakerScore ? game.creator : game.opponent;
            emit GameEnded(gameId, winner);
        } else {
            game.phase = TurnPhase.Commit;
            // TODO: emit evento per dire che: nuovo turno è iniziato, e quali sono i punteggi
        }
    }

    function accuseAFK(uint gameId) external onlyPlayers(gameId) inState(gameId, GameState.InProgress) {
        // Implement AFK accusation logic
    }

}
