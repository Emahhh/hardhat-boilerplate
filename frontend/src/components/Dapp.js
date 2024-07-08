import React from "react";

// We'll use ethers to interact with the Ethereum network and our contract
import { ethers } from "ethers";

// DEFINE THE CONTRACT'S ADDRESS AND ABI
// We import the contract's artifacts and address here, as we are going to be using them with ethers
import MastermindArtifact from "../contracts/Mastermind.json";
import contractAddress from "../contracts/contract-address.json";

// OTHER REACT COMPONENTS
import { NoWalletDetected } from "./NoWalletDetected";
import { ConnectWallet } from "./ConnectWallet";
import { Loading } from "./Loading";
import { TransactionErrorMessage } from "./TransactionErrorMessage";
import { WaitingForTransactionMessage } from "./WaitingForTransactionMessage";
import { FindRandomGame } from "./FindRandomGame";
import { JoinGameWithAddress } from "./JoinGameWithAddress";
import { WalletInfo } from "./WalletInfo";
import { CreateNewGame } from "./CreateNewGame";
import { CommitSecretCode } from "./CommitSecretCode";
import { MakeGuess } from "./MakeGuess";
import { ShowResults } from "./ShowResults";

// This is the default id used by the Hardhat Network
const HARDHAT_NETWORK_ID = '31337';

// This is an error code that indicates that the user canceled a transaction
const ERROR_CODE_TX_REJECTED_BY_USER = 4001;


const N_len_of_code = 4; // Number of colors in the code
const M_num_possible_colors = 4; // Number of possible colors
const NT_num_of_turns = 2; // Number of turns
const NG_num_of_guesses = 2; // Number of guesses per turn
const K_extra_points = 5; // Extra points for unbroken code
const DISPUTE_SECONDS = 10; //TDisp


const COLORS_DATA = [
  { name: "Red", hex: "#FF0000" },
  { name: "Green", hex: "#00FF00" },
  { name: "Blue", hex: "#0000FF" },
  { name: "Yellow", hex: "#FFFF00" },
];

// an onject used as an enum (since we don't have enums in JS)
const GameStates = Object.freeze({
  NOT_CREATED: 'Not Created - the user hasnt clicked the createGame button or join one',
  AWAITING_CREATION: 'Awaiting Creation - the user has requested the creation of the game. Waiting for the SC to confirm its creation.',
  CREATED: 'Created and Awaiting Opponent - the user has created a game, but there is still not an opponent. waiting for someone to join.',
  AWAITING_JOIN_CONFIRMATION: 'Awaiting Join Confirmation - the user has requested to join a game. Waiting for the SC to confirm its joining.',
  JOINED: 'Joined, Opponent Found - there are finally 2 players in this game',
  AWAITING_YOUR_COMMIT: 'Awaiting Your Commit - the other player is waiting for you to commit the secret code',
  AWAITING_OPPONENTS_COMMIT: 'Awaiting Other Player Commit - we are waiting for the other player to commit the secret code',
  AWAITING_YOUR_GUESS: 'Awaiting Your Guess - we have recieved the event CodeCommitted and it is your turn to guess.',
  AWAITING_OPPONENTS_GUESS: 'Awaiting Other Player Guess - we are waiting for the other player to guess',
  AWAITING_YOUR_FEEDBACK: 'Awaiting Your Feedback - it is your turn to give feedback.',
  AWAITING_OPPONENTS_FEEDBACK: 'Awaiting Other Player Feedback - we are waiting for the other player to give feedback',
  AWAITING_YOUR_REVEAL: 'Awaiting Your Reveal - it is your turn to reveal the secret code.',
  AWAITING_OPPONENTS_REVEAL: 'Awaiting Other Player Reveal - we are waiting for the other player to reveal the secret code',
  AWAITING_OPPONENTS_DISPUTE: 'Awaiting Other Player to choose to dispute or not',
  AWAITING_YOUR_DISPUTE: 'Awaiting for you to choose to dispute or not',
  AWAITING_YOUR_DISPUTE_DENIED: 'You choose not to dispute. Waiting for the SC to tell us the number of turns left.',
  GAME_ENDED_SHOW_RESULTS: 'Game ended - we can now show the results',
});




// This component is in charge of doing these things:
//   1. It connects to the user's wallet
//   2. Initializes ethers and the Mastermind contract
//   3. Interacts with the contract
//   4. Renders the whole application
export class Dapp extends React.Component {
  constructor(props) {
    super(props);

    // initial state of the dApp
    this.initialState = {
      userAddress: undefined, // The user's address
      transactionError: undefined,
      networkError: undefined,
      colorsData: COLORS_DATA,
      contractName: undefined,
      txBeingSent: false,
      gameState: GameStates.NOT_CREATED,
      colorsVerified: false,
      currentGameID: undefined,
      secretCode: undefined,
      guessesLeft: undefined,
      turnsLeft: undefined,
    };

    this.state = this.initialState;
  }

  componentWillUnmount() {
    // We poll the user's balance, so we have to stop doing that when Dapp gets unmounted
    // this._stopPollingData();
  }


  render() {

    if (!this.state) {
      return <p>ERROR: gameState is undefined</p>
    }

    // CHECK IF A WALLET IS INSTALLED - if not, ask the user
    // Ethereum wallets inject the window.ethereum object. If it hasn't been injected, we instruct the user to install a wallet.
    if (window.ethereum === undefined) {
      return <NoWalletDetected />;
    }

    if (this.state.gameState === undefined) {
      return <p>ERROR: gameState is undefined</p>
    }

    // ASK TO CONNECT TO THE USER'S WALLET
    // When the wallet gets connected, we are going to save the users's address in the component's state. So, if it hasn't been saved yet, we have to show the ConnectWallet component.
    //
    // Note that we pass it a callback that is going to be called when the user clicks a button. This callback just calls the _connectWallet method.
    if (!this.state.userAddress) {
      return (
        <ConnectWallet
          connectWallet={() => this._connectWallet()}
          networkError={this.state.networkError}
          dismiss={() => this._dismissNetworkError()}
        />
      );
    }

    if (this.colorsVerified === false) {
      return <Loading message={"Verifying colors..."} />
    }

    if (this.state.gameState === GameStates.AWAITING_CREATION) {
      return <Loading message={"Waiting for the Smart Contract to create the game..."} />
    }

    // JOIN OR CREATE A GAME
    // if there is no game in progress, show buttons to join one
    if (this.state.gameState === GameStates.NOT_CREATED) {
      return (
        <div className="container">
          <article>

            <h1>Welcome to Mastermind!</h1>

            <hr />
            <WalletInfo
              provider={this._ethersProvider}
              account={this.state.userAddress}
            />

            <hr />

            <h4>Create a Game</h4>
            <CreateNewGame
              contract={this._contract}
              ethers={ethers}
              updateGameState={(gameState) => this.setState({ gameState })}
              updateGameID={(gameID) => this.setState({ currentGameID: gameID })}
              GameStates={GameStates}
              currentGameID={this.state.currentGameID}
            />

            <hr />
            <h4>Find a random Game</h4>

            {/* TODO: implement*/}
            <FindRandomGame
            />

            <hr />

            <h4>Join an existing Game</h4>

            <JoinGameWithAddress
              contract={this._contract}
              updateGameState={(gameState) => this.setState({ gameState })}
              GameStates={GameStates}
            />

            {this.state.transactionError && (
              <TransactionErrorMessage
                message={this._getRpcErrorMessage(this.state.transactionError)}
                dismiss={() => this._dismissTransactionError()}
              />
            )}

          </article>
        </div>
      );
    }

    // GAME CREATED, WAIT FOR ANOTHER PLAYER
    if (this.state.gameState === GameStates.CREATED) {
      return (
        <div className="row">
          <div className="col-12">
            <h1>Game created!</h1>
            <p>The game ID is: {this.state.currentGameID}</p>
            <p>Waiting for another player to join...</p>
          </div>
        </div>
      );
    }

    if (this.state.gameState === GameStates.AWAITING_JOIN_CONFIRMATION) {
      return <Loading message={"You are joining the game..."} />
    }


    // 2 PLAYERS ARE IN THE GAME
    if (this.state.gameState === GameStates.JOINED) {
      return <Loading message={"Waiting for the game to start..."} />
    }

    // THE GAME HAS STARTED, waiting for your commit
    if (this.state.gameState === GameStates.AWAITING_YOUR_COMMIT) {
      return <CommitSecretCode
        contract={this._contract}
        gameId={this.state.currentGameID}
        onCommit={() => this.setState({ gameState: GameStates.AWAITING_OPPONENTS_GUESS })}
        updateSecretCode={(code) => this.setState({ secretCode: code })}
      />
    }

    // THE GAME HAS STARTED, waiting for opponent's commit
    if (this.state.gameState === GameStates.AWAITING_OPPONENTS_COMMIT) {
      return (
        <Loading message={"Waiting for the other platyer to commit their secret code..."} />

      );
    }

    if (this.state.gameState === GameStates.AWAITING_YOUR_GUESS) {
      return (
        <article>
          <MakeGuess
            contract={this._contract}
            gameId={this.state.currentGameID}
            onGuessMade={() => this.setState({ gameState: GameStates.AWAITING_OPPONENTS_FEEDBACK })}
          />
          <p>Guesses left: {this.state.guessesLeft}. Turns left: {this.state.turnsLeft}</p>
        </article>
      );
    }


    // WAITING FOR OPPONENTS' GUESS
    if (this.state.gameState === GameStates.AWAITING_OPPONENTS_GUESS) {
      return (
        <Loading message={"Waiting for the other player to make their guess..."} />

      );
    }


    if (this.state.gameState === GameStates.AWAITING_OPPONENTS_FEEDBACK) {
      return (
        <Loading message={"Waiting for the other player to give feedback on your guess..."} />
      );
    }

    if (this.state.gameState === GameStates.AWAITING_YOUR_FEEDBACK) {
      return (
        <Loading message={"Recieved the opponent's guess. Giving feedback..."} />
      );
    }

    if (this.state.gameState === GameStates.AWAITING_OPPONENTS_REVEAL) {
      return (
        <Loading
          message={"Waiting for the other player to reveal their secret code..."}
        />
      );
    }

    // SEND A DISPUTE
    // se mi viene detto che non ho indovinato, ho qualche secondo per fare una disputa, o accettare il fatto che non ho indovinato
    if (this.state.gameState === GameStates.AWAITING_YOUR_DISPUTE) {
      return (
        <div>
          <button onClick={function () { alert("TODO: implement dispute") }}>Dispute</button>
          <button
            onClick={
              function () {
                this._contract.dontDispute(this.state.currentGameID);
                this.setState({ gameState: GameStates.AWAITING_YOUR_DISPUTE_DENIED });
              }
            }
          >Dont dispute</button>
          <p>Guesses left: {this.state.guessesLeft}. Turns left: {this.state.turnsLeft}</p>
        </div>
      );
    }

    // AWAITING A POSSIBLE DISPUTE
    // FINCHé non arriva endTurn, l'altro giocatore potrebbe fare una disputa
    if (this.state.gameState == GameStates.AWAITING_OPPONENTS_DISPUTE) {
      return (
        <article>
          <Loading message={"Waiting for the other player to choose if they want to make a dispute"} />
          <p>Guesses left: {this.state.guessesLeft}. Turns left: {this.state.turnsLeft}</p>
        </article>
      );
    }


    if (this.state.gameState === GameStates.AWAITING_YOUR_DISPUTE_DENIED) {
      return (
        <article>
          <Loading message={"Waiting for next phase..."} />
          <p>Guesses left: {this.state.guessesLeft}. Turns left: {this.state.turnsLeft}</p>
        </article>
      );

    }

    if (this.state.gameState === GameStates.GAME_ENDED_SHOW_RESULTS) {
      return <ShowResults contract={this._contract} gameId={this.state.currentGameID} />
    }



    // DEFAULT
    return (
      <p>ERROR: gameState has an unexpected value: {this.state.gameState}</p>
    );

  }
  // end of render()







  // This method initializes the dapp
  _initialize(userAddress) {

    // We first store the user's address in the component's state
    this.setState({
      userAddress: userAddress.toString().toLowerCase(),
    });

    // ETHERS INITIALIZATION
    // We first initialize ethers by creating a provider using window.ethereum
    this._ethersProvider = new ethers.providers.Web3Provider(window.ethereum);

    // Then, we initialize the contract using that provider and the contract's artifact.
    this._contract = new ethers.Contract(
      contractAddress.Mastermind,
      MastermindArtifact.abi,
      this._ethersProvider.getSigner(0)
    );

    // FETCHING DATA
    // fetch some data from the contract
    const cName = this._contract.name();
    if (!cName) {
      console.log("Contract name not found");
    }
    this.setState({ contractName: cName });

    this._verifyColors();
    this.initListeners();

  }













  // EVENT LISTENERS --------------------
  initListeners() {

    // Set up an event listener for the GameCreated event
    this._contract.on("GameCreated", async (myGameIDFromEvent, creator) => {


      console.log(`A game was created with ID: ${myGameIDFromEvent}, by: ${creator}`);

      if (!addressesEqual(creator, this.state.userAddress)) {
        console.log("I am not the creator, so not updating the game state");
        return;
      }

      if (this.state.gameState !== GameStates.AWAITING_CREATION) {
        console.log("Not awaiting creation, so not updating the game state");
        return;
      }

      const [newGuessesLeft, newTurnsLeft] = await this._contract.getGuessesAndTurnsLeft(myGameIDFromEvent);


      // Update the game state to indicate the game creation is complete
      this.setState({
        gameState: GameStates.CREATED,
        currentGameID: myGameIDFromEvent.toNumber(),
        guessesLeft: newGuessesLeft,
        turnsLeft: newTurnsLeft,
      });
    });

    // I JOINED THE GAME, OR SOMEONE ELSE JOINED THE GAME
    // listen to the EVENT that is fired when any player joins any game. TODO: is it any?
    this._contract.on("GameJoined", (eventGameID, player) => {


      if (this.state.gameState == GameStates.CREATED) {
        if (this.state.currentGameID != eventGameID.toNumber()) return;

        this.setState({ gameState: GameStates.JOINED });
        this.setState({ currentGameID: eventGameID.toNumber() });

        this._contract.startGame(this.state.currentGameID);
      }

      if (this.state.gameState == GameStates.AWAITING_JOIN_CONFIRMATION) {
        if (!addressesEqual(player, this.state.userAddress)) return;

        this.setState({ gameState: GameStates.JOINED });
        this.setState({ currentGameID: eventGameID.toNumber() });
      }

    });


    // the game is started and the roles have been assigned
    this._contract.on("GameStarted", (eventGameID, codeMakerAddress) => {
      if (this.state.gameState != GameStates.JOINED) return;
      if (this.state.currentGameID != eventGameID) {
        console.log("Recieved a GameStarted event for a game that is not the current game. Ignoring. The current game is: ", this.state.currentGameID, " and the event's gameID is: ", eventGameID.toNumber());
        return;
      }

      console.log(`Event GameStarted recieved. GameID: ${eventGameID}, The codeMaker is: ${codeMakerAddress}`);

      if (addressesEqual(codeMakerAddress, this.state.userAddress)) {
        this.setState({ gameState: GameStates.AWAITING_YOUR_COMMIT });
      } else {
        this.setState({ gameState: GameStates.AWAITING_OPPONENTS_COMMIT });
      }

    });


    this._contract.on("CodeCommitted", (eventGameID, codeHash) => {
      if (this.state.gameState != GameStates.AWAITING_YOUR_COMMIT && this.state.gameState != GameStates.AWAITING_OPPONENTS_COMMIT) return;
      if (this.state.currentGameID != eventGameID) return;

      console.log(`Event CodeCommitted recieved. GameID: ${eventGameID}, The code hash is: ${codeHash}`);

      if (this.state.gameState == GameStates.AWAITING_YOUR_COMMIT) {
        // se ho committato il codice, ora devo attendere che l'altro giocatore propornga la sua guess
        this.setState({ gameState: GameStates.AWAITING_OPPONENTS_GUESS });

      } else if (this.state.gameState == GameStates.AWAITING_OPPONENTS_COMMIT) {
        // se l'altro giocatore ha committato il suo codice, ora devo dare la mia guess
        this.setState({ gameState: GameStates.AWAITING_YOUR_GUESS });
      } else {
        alert("Error in on CodeCommitted");
      }

      this.refreshTurnsAndGuessesLeft();

    });



    this._contract.on("CodeGuessed", async (eventGameID, guessedCode, turnsLeft) => {
      if (this.state.gameState !== GameStates.AWAITING_OPPONENTS_GUESS) return;
      if (this.state.currentGameID != eventGameID) return;

      console.log(`Event CodeGuessed received. GameID: ${eventGameID}, The guessed code is: ${guessedCode}`);

      this.setState({ turnsLeft: turnsLeft });

      const secretCode = this.state.secretCode;
      const { correctColorAndPosition, correctColorWrongPosition } = calculateFeedback(secretCode, guessedCode);

      try {
        this.setState({ gameState: GameStates.AWAITING_YOUR_FEEDBACK });

        await this._contract.giveFeedback(eventGameID, correctColorAndPosition, correctColorWrongPosition);
        console.log("Feedback given successfully. correctColorAndPosition:", correctColorAndPosition, "correctColorWrongPosition:", correctColorWrongPosition);

        if (correctColorAndPosition == N_len_of_code) {
          alert("THE OTHER PLAYER HAS GUESSED CORRECTLY!");
          await this._contract.revealCode(eventGameID, this.state.secretCode);
          this.setState({ gameState: GameStates.AWAITING_OPPONENTS_DISPUTE });
        } else if (turnsLeft == 0) {
          console.log("The other player has ran out of guesses. Revealing code.");
          await this._contract.revealCode(eventGameID, this.state.secretCode);
          this.setState({ gameState: GameStates.AWAITING_OPPONENTS_DISPUTE });
        } else {
          console.log("Waiting for other player to give their next guess.");
          this.setState({ gameState: GameStates.AWAITING_OPPONENTS_GUESS });
        }

        this.refreshTurnsAndGuessesLeft();
      } catch (error) {
        console.error("Error giving feedback:", error);
      }
    });




    this._contract.on("CodeGuessedSuccessfully", (eventGameID) => {
      if (this.state.gameState != GameStates.AWAITING_OPPONENTS_FEEDBACK) return;
      if (this.state.currentGameID != eventGameID) return;

      alert("Your guess was correct! Congratulations!"); 
      this.setState({ gameState: GameStates.AWAITING_OPPONENTS_REVEAL });
    });

    this._contract.on("CodeGuessedUnsccessfully", (eventGameID, codeMakerAddress, guessesLeft) => {
      if (this.state.gameState != GameStates.AWAITING_OPPONENTS_FEEDBACK) return;
      if (this.state.currentGameID != eventGameID) return;

      if (guessesLeft == 0) {
        alert("Your guess was not correct, and you have run out of guesses.");
        this.setState({ gameState: GameStates.AWAITING_OPPONENTS_REVEAL });
      } else {
        alert("Your guess was not correct, but you have " + guessesLeft + " guesses left!");
        this.setState({ guessesLeft: guessesLeft });
        this.setState({ gameState: GameStates.AWAITING_YOUR_GUESS });
      }
    });

    this._contract.on("CodeRevealed", async (eventGameID, secretCode) => {
      if (this.state.gameState != GameStates.AWAITING_OPPONENTS_REVEAL && this.state.gameState != GameStates.AWAITING_OPPONENTS_FEEDBACK) return;
      if (this.state.currentGameID != eventGameID) return;

      console.log("The other player has revealed their secret code!");

      if (this.didTheyCheat(secretCode)) {
        alert("L'altro sembra aver barato! ora facciamo ricorso"); // TODO: handle RICORSO
      } else {
        alert("Tutto regolare! Non facciamo ricorso");
        this._contract.dontDispute(eventGameID);
        this.setState({ gameState: GameStates.AWAITING_YOUR_DISPUTE_DENIED });
        this.refreshTurnsAndGuessesLeft();
      }
    });


    this._contract.on("DisputeDenied", (eventGameID, codeMaker, turnsLeft) => {
      if (this.state.gameState != GameStates.AWAITING_OPPONENTS_DISPUTE && this.state.gameState != GameStates.AWAITING_YOUR_DISPUTE_DENIED) return;
      if (this.state.currentGameID != eventGameID) return;

      if (turnsLeft == 0) {
        alert("Gioco finito!");
        this.setState({ gameState: GameStates.GAME_ENDED_SHOW_RESULTS });
      } else {
        if (addressesEqual(this.state.userAddress, codeMaker)) {
          console.log("You are the codeMaker now!");
          this.setState({ gameState: GameStates.AWAITING_YOUR_COMMIT });
        } else {
          this.setState({ gameState: GameStates.AWAITING_OPPONENTS_COMMIT });
        }

      }
    });


  }
  // END OF EVENT LISTENERS ------------------

  // OTHER METHODS ---------------------------

  async refreshTurnsAndGuessesLeft() {
    const [myGuessesLeft, myTurnsLeft] = await this._contract.getGuessesAndTurnsLeft(this.state.currentGameID);
    this.setState({ guessesLeft: myGuessesLeft, turnsLeft: myTurnsLeft });
  }



  // function run when the user clicks "connect wallet"
  async _connectWallet() {

    // To connect to the user's wallet, we have to run this method. It returns a promise that will resolve to the user's address.
    const [userAddress] = await window.ethereum.request({ method: 'eth_requestAccounts' });

    if (!userAddress) {
      alert("There was an error connecting to your wallet. Please try again.");
      return;
    }

    // Once we have the address, we can initialize the application.

    // First we check the network
    this._checkNetwork();

    this._initialize(userAddress);

    // We reinitialize it whenever the user changes their account.
    window.ethereum.on("accountsChanged", ([newAddress]) => {
      // this._stopPollingData();
      // `accountsChanged` event can be triggered with an undefined newAddress. To avoid errors, we reset the dapp state 
      if (newAddress === undefined) {
        return this._resetState();
      }

      this._initialize(newAddress);
    });
  }



  // Function to verify that the colors from the contract match COLORS_DATA
  async _verifyColors() {

    try {
      // get colors from the contract
      const onChainColors = await this._contract.getColors();

      // Check if the length of colors matches
      if (onChainColors.length !== COLORS_DATA.length) {
        throw new Error("Color arrays do not match in length");
      }

      // Check if each color matches in name and order
      for (let i = 0; i < onChainColors.length; i++) {
        if (onChainColors[i] !== COLORS_DATA[i].name) {
          throw new Error(`Color mismatch at index ${i}: ${onChainColors[i]} !== ${COLORS_DATA[i].name}`);
        }
      }

      console.log("Check successful! All colors match!");
      this.state.colorsVerified = true;
    } catch (error) {
      console.error("Error verifying colors:", error);
    }
  }

  didTheyCheat(secretCode) {
    // TODO: implementare
    return false;
  }


  // This method checks if the selected network is Localhost:8545
  _checkNetwork() {
    if (window.ethereum.networkVersion !== HARDHAT_NETWORK_ID) {
      this._switchChain();
    }
  }



  // This method just clears part of the state.
  _dismissTransactionError() {
    this.setState({ transactionError: undefined });
  }

  // This method just clears part of the state.
  _dismissNetworkError() {
    this.setState({ networkError: undefined });
  }

  // This is an utility method that turns an RPC error into a human readable message.
  _getRpcErrorMessage(error) {
    if (error.data) {
      return error.data.message;
    }

    return error.message;
  }

  // This method resets the state
  _resetState() {
    this.setState(this.initialState);
  }

  async _switchChain() {
    const chainIdHex = `0x${HARDHAT_NETWORK_ID.toString(16)}`
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    await this._initialize(this.state.userAddress);
  }

  // END OF OTHER METHODS

}
// END OF CLASS DEFINITION



// HELPER FUNCTIONS

function addressesEqual(addr1, addr2) {
  return addr1.toString().toLowerCase() === addr2.toString().toLowerCase();
}





function calculateFeedback(secretCode, guessedCode) {
  let correctColorAndPosition = 0;
  let correctColorWrongPosition = 0;

  // Convert to arrays
  const secretArray = secretCode.split("");
  const guessedArray = guessedCode.split("");

  // Create arrays to track used positions
  const secretUsed = Array(secretArray.length).fill(false);
  const guessedUsed = Array(guessedArray.length).fill(false);

  // First pass: check for correct color and position
  for (let i = 0; i < secretArray.length; i++) {
    if (secretArray[i] === guessedArray[i]) {
      correctColorAndPosition++;
      secretUsed[i] = true;
      guessedUsed[i] = true;
    }
  }

  // Second pass: check for correct color but wrong position
  for (let i = 0; i < secretArray.length; i++) {
    if (!secretUsed[i]) {
      for (let j = 0; j < guessedArray.length; j++) {
        if (!guessedUsed[j] && secretArray[i] === guessedArray[j]) {
          correctColorWrongPosition++;
          secretUsed[i] = true;
          guessedUsed[j] = true;
          break;
        }
      }
    }
  }

  return { correctColorAndPosition, correctColorWrongPosition };
}
