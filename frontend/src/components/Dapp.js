import React from "react";

// We'll use ethers to interact with the Ethereum network and our contract
import { ethers } from "ethers";

import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'



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
import { Scoreboard } from "./Scoreboard";

const MySwal = withReactContent(Swal)
window.MySwal = MySwal;

window.Toast = MySwal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 5000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

// This is the default id used by the Hardhat Network
const HARDHAT_NETWORK_ID = '31337';

// This is an error code that indicates that the user canceled a transaction 
// TODO: handle this
const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

const COLORS_CHOICES = [
  { name: "Red", letter: "R", hex: "#E74C3C" },   
  { name: "Green", letter: "G", hex: "#2ECC71" }, 
  { name: "Blue", letter: "B", hex: "#3498DB" }, 
  { name: "Yellow", letter: "Y", hex: "#F1C40F" }
];

//TODO: fare dei test per controllare che tutti gli AFK
// an onject used as an enum (since we don't have enums in JS)
const GameStates = Object.freeze({
  NOT_CREATED: {
    description: 'Not Created - the user hasnt clicked the createGame button or join one',
    showAfkButton: false,
  },
  AWAITING_CREATION: {
    description: 'Awaiting Creation - the user has requested the creation of the game. Waiting for the SC to confirm its creation.',
    showAfkButton: false,
  },
  CREATED: {
    description: 'Created and Awaiting Opponent - the user has created a game, but there is still not an opponent. waiting for someone to join.',
    showAfkButton: false,
  },
  AWAITING_JOIN_CONFIRMATION: {
    description: 'Awaiting Join Confirmation - the user has requested to join a game. Waiting for the SC to confirm its joining.',
    showAfkButton: false,
  },
  JOINED_WAITING_OPPONENTS_START: {
    description: 'I Joined - waiting for the other player to start the game',
    showAfkButton: true,
  },
  JOINED_WAITING_YOUR_START: {
    description: 'Another player JOINED - waiting for you to start the game',
    showAfkButton: false
  },
  AWAITING_YOUR_COMMIT: {
    description: 'Awaiting Your Commit - the other player is waiting for you to commit the secret code',
    showAfkButton: false,
  },
  AWAITING_OPPONENTS_COMMIT: {
    description: 'Awaiting Other Player Commit - we are waiting for the other player to commit the secret code',
    showAfkButton: true,
  },
  AWAITING_YOUR_GUESS: {
    description: 'Awaiting Your Guess - we have received the event CodeCommitted and it is your turn to guess.',
    showAfkButton: false,
  },
  AWAITING_OPPONENTS_GUESS: {
    description: 'Awaiting Other Player Guess - we are waiting for the other player to guess',
    showAfkButton: true,
  },
  AWAITING_YOUR_FEEDBACK: {
    description: 'Awaiting Your Feedback - it is your turn to give feedback.',
    showAfkButton: false,
  },
  AWAITING_OPPONENTS_FEEDBACK: {
    description: 'Awaiting Other Player Feedback - we are waiting for the other player to give feedback',
    showAfkButton: true,
  },
  AWAITING_YOUR_REVEAL: {
    description: 'Awaiting Your Reveal - it is your turn to reveal the secret code.',
    showAfkButton: false,
  },
  AWAITING_OPPONENTS_REVEAL: {
    description: 'Awaiting Other Player Reveal - we are waiting for the other player to reveal the secret code',
    showAfkButton: true,
  },
  AWAITING_OPPONENTS_DISPUTE: {
    description: 'Awaiting Other Player to choose to dispute or not',
    showAfkButton: true,
  },
  AWAITING_YOUR_DISPUTE: {
    description: 'Awaiting for you to choose to dispute or not',
    showAfkButton: false,
  },
  AWAITING_FEEDBACK_FOR_YOUR_DISPUTE: {
    description: 'You choose to dispute. Waiting for the SC to tell us if you have won or not.',
    showAfkButton: false,
  },
  AWAITING_YOUR_DISPUTE_DENIED: {
    description: 'You choose not to dispute. Waiting for the SC to tell us the number of turns left.',
    showAfkButton: false,
  },
  GAME_ENDED_SHOW_RESULTS: {
    description: 'Game ended - we can now show the results',
    showAfkButton: false,
  }
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
      userAddress: undefined, // The current user's address
      opponentAddress: undefined,
      transactionError: undefined,
      networkError: undefined,
      colorsData: COLORS_CHOICES,
      contractName: undefined,
      txBeingSent: false,
      gameState: GameStates.NOT_CREATED,
      colorsVerified: false,
      currentGameID: undefined,
      secretCode: undefined,

      codeLen: undefined,

      totalTurns: undefined,
      totalGuesses: undefined,
      guessesLeft: undefined,
      turnsLeft: undefined,

      myScore: undefined,
      opponentScore: undefined,


      myGuessesAndFeedbacks: [],

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
      return <Loading gameID={this.state.currentGameID} message={"Verifying colors..."} showAfkButton={this.state.gameState.showAfkButton} opponent={this.state.opponentAddress}/>
    }

    if (this.state.gameState === GameStates.AWAITING_CREATION) {
      return <Loading gameID={this.state.currentGameID}  message={"Waiting for the Smart Contract to create the game..."} showAfkButton={this.state.gameState.showAfkButton} opponent={this.state.opponentAddress}/>
    }

    // JOIN OR CREATE A GAME
    // if there is no game in progress, show buttons to join one
    if (this.state.gameState === GameStates.NOT_CREATED) {
      return (
        <div className="container max-w-3xl p-6 mx-auto">
          <article className="space-y-6">
            <header className="text-center">
              <h1 className="mb-4 text-3xl font-bold">Mastermind</h1>
            </header>
            
            {/* Wallet Information */}
            <section className="p-4 rounded-lg shadow-lg bg-slate-50">
              <WalletInfo
                provider={this._ethersProvider}
                account={this.state.userAddress}
              />
            </section>
            
            <hr className="my-6" />

            <h3>Create or join a game</h3>
            <p>Use one of the buttons below to create or join a game.</p>
            
            {/* Join a Random Public Game */}
            <section className="p-4 rounded-lg shadow-lg bg-slate-50">
              <h4 className="mb-2 text-xl font-semibold">Join a Random Public Game</h4>
              <p>You'll have the option to join a random game from the available.</p>
              <FindRandomGame
                contract={this._contract}
                updateGameState={(gameState) => this.setState({ gameState })}
                GameStates={GameStates}
                ethers={ethers}
                updateOpponentAddress={(opponentAddress) => this.setState({ opponentAddress })}
              />
            </section>
            
            <hr className="my-6" />
            
            {/* Create a Public Game */}
            <section className="p-4 rounded-lg shadow-lg bg-slate-50">
              <h4 className="mb-2 text-xl font-semibold">Create a Public Game</h4>
              <p>Anyone can join.</p>
              <CreateNewGame
                isPrivate={false}
                contract={this._contract}
                ethers={ethers}
                updateGameState={(gameState) => this.setState({ gameState })}
                updateGameID={(gameID) => this.setState({ currentGameID: gameID })}
                GameStates={GameStates}
                currentGameID={this.state.currentGameID}
              />
            </section>
            
            <hr className="my-6" />
            
            {/* Create a Private Game */}
            <section className="p-4 rounded-lg shadow-lg bg-slate-50">
              <h4 className="mb-2 text-xl font-semibold">Create a Private Game</h4>
              <p>Only the player you choose can join.</p>
              <CreateNewGame
                isPrivate={true}
                contract={this._contract}
                ethers={ethers}
                updateGameState={(gameState) => this.setState({ gameState })}
                updateGameID={(gameID) => this.setState({ currentGameID: gameID })}
                GameStates={GameStates}
                currentGameID={this.state.currentGameID}
              />
            </section>
            
            <hr className="my-6" />
            
            {/* Join a Private Game */}
            <section className="p-4 rounded-lg shadow-lg bg-slate-50">
              <h4 className="mb-2 text-xl font-semibold">Join a Private Game</h4>
              <p>Enter the game ID to join. You can only join a game if the creator choose your address when creating a game.</p>
              <JoinGameWithAddress
                contract={this._contract}
                updateGameState={(gameState) => this.setState({ gameState })}
                GameStates={GameStates}
                updateOpponentAddress={(opponentAddress) => this.setState({ opponentAddress })}
              />
            </section>
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
      return <Loading gameID={this.state.currentGameID}  message={"You are joining the game..."} showAfkButton={this.state.gameState.showAfkButton} opponent={this.state.opponentAddress}/>
    }


    if (this.state.gameState === GameStates.JOINED_WAITING_OPPONENTS_START) {
      return <Loading gameID={this.state.currentGameID}  
        message={"Waiting for the opponent to start the game..."}
        showAfkButton={this.state.gameState.showAfkButton}
        opponent={this.state.opponentAddress}
      />
    }

    if (this.state.gameState === GameStates.JOINED_WAITING_YOUR_START) {
      return <Loading gameID={this.state.currentGameID}  
        message={"Waiting for you to start the game..."}
        showAfkButton={this.state.gameState.showAfkButton}
        opponent={this.state.opponentAddress}
      />
    }


    // THE GAME HAS STARTED, waiting for your commit
    if (this.state.gameState === GameStates.AWAITING_YOUR_COMMIT) {

      return(
        <div>
          <CommitSecretCode
            contract={this._contract}
            gameId={this.state.currentGameID}
            onCommit={() => this.setState({ gameState: GameStates.AWAITING_OPPONENTS_GUESS })}
            updateSecretCode={(code) => this.setState({ secretCode: code })}
            myGuessesAndFeedbacks={this.state.myGuessesAndFeedbacks}
            colors={COLORS_CHOICES}
            codeLength={this.state.codeLen}
          />
          {/* <Scoreboard
            contract={this._contract}
            gameId={this.state.currentGameID}
            updateGameState={(gameState) => this.setState({ gameState })}
            gameState={this.state.gameState}
            ></Scoreboard> */}
        </div>
      );
    }

    // THE GAME HAS STARTED, waiting for opponent's commit
    if (this.state.gameState === GameStates.AWAITING_OPPONENTS_COMMIT) {
      return (
        <Loading gameID={this.state.currentGameID}  
        message={"Waiting for the other platyer to commit their secret code..."}
        showAfkButton={this.state.gameState.showAfkButton}
        opponent={this.state.opponentAddress}
        />

      );
    }

    if (this.state.gameState === GameStates.AWAITING_YOUR_GUESS) {
      return (
        <article>
          <MakeGuess
            contract={this._contract}
            gameId={this.state.currentGameID}
            onGuessMade={() => this.setState({ gameState: GameStates.AWAITING_OPPONENTS_FEEDBACK })}
            myGuessesAndFeedbacks={this.state.myGuessesAndFeedbacks}
            setMyGuessesAndFeedbacks={(guesses) => this.setState({ myGuessesAndFeedbacks: guesses })}
            colors={COLORS_CHOICES}
            codeLength={this.state.codeLen}
          />
          <p>Guesses left: {this.state.guessesLeft}. Turns left: {this.state.turnsLeft}</p>
        </article>
      );
    }


    // WAITING FOR OPPONENTS' GUESS
    if (this.state.gameState === GameStates.AWAITING_OPPONENTS_GUESS) {
      return (
        <Loading 
        gameID={this.state.currentGameID} 
        message={"Waiting for the other player to make their guess..."} 
        showAfkButton={this.state.gameState.showAfkButton}
        opponent={this.state.opponentAddress}
        />

      );
    }


    if (this.state.gameState === GameStates.AWAITING_OPPONENTS_FEEDBACK) {
      return (
        <Loading gameID={this.state.currentGameID} 
        message={"Waiting for the other player to give feedback on your guess..."}
        showAfkButton={this.state.gameState.showAfkButton}
        opponent={this.state.opponentAddress}
        />
      );
    }

    if (this.state.gameState === GameStates.AWAITING_YOUR_FEEDBACK) {
      return (
        <Loading gameID={this.state.currentGameID} 
        message={"Recieved the opponent's guess. Giving feedback..."}
        showAfkButton={this.state.gameState.showAfkButton}
        opponent={this.state.opponentAddress}
        />
      );
    }

    if (this.state.gameState === GameStates.AWAITING_OPPONENTS_REVEAL) {
      return (
        <Loading gameID={this.state.currentGameID} 
          message={"Waiting for the other player to reveal their secret code..."}
          showAfkButton={this.state.gameState.showAfkButton}
          opponent={this.state.opponentAddress}
        />
      );
    }

    // SEND A DISPUTE TODO: ma serve o non si apre mai?
    // se mi viene detto che non ho indovinato, ho qualche secondo per fare una disputa, o accettare il fatto che non ho indovinato
    if (this.state.gameState === GameStates.AWAITING_YOUR_DISPUTE) {
      return (
        <div>
          <button onClick={function () { alert("TODO: implement dispute") }}>Dispute</button>
          <button
            onClick={
              function () {
                this._contract.dontDispute(this.state.currentGameID, {
                  gasLimit: 100000
                });
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
          <Loading gameID={this.state.currentGameID} 
          message={"Waiting for the other player to choose if they want to make a dispute"}
          showAfkButton={this.state.gameState.showAfkButton}
          opponent={this.state.opponentAddress}
          />
          <p>Guesses left: {this.state.guessesLeft}. Turns left: {this.state.turnsLeft}</p>
        </article>
      );
    }


    if (this.state.gameState === GameStates.AWAITING_YOUR_DISPUTE_DENIED) {
      return (
        <article>
          <Loading gameID={this.state.currentGameID} 
          message={"Waiting for next phase..."}
          showAfkButton={this.state.gameState.showAfkButton}
          opponent={this.state.opponentAddress}
          />
          <p>Guesses left: {this.state.guessesLeft}. Turns left: {this.state.turnsLeft}</p>
        </article>
      );

    }


    if (this.state.gameState === GameStates.AWAITING_FEEDBACK_FOR_YOUR_DISPUTE) {
      return (
        <article>
          <Loading gameID={this.state.currentGameID} 
          message={"Waiting for the smart contract to decide who wins the dispute..."}
          showAfkButton={this.state.gameState.showAfkButton}
          opponent={this.state.opponentAddress}
          />
        </article>
      );
    }

    if (this.state.gameState === GameStates.GAME_ENDED_SHOW_RESULTS) {
      return <ShowResults 
      contract={this._contract} 
      gameId={this.state.currentGameID} 
      currUser={this.state.userAddress}/>
    }



    // DEFAULT
    return (
      <p>ERROR: gameState has an unexpected value: {this.state.gameState}</p>
    );

  }
  // end of render()







  // This method initializes the dapp
  async _initialize(userAddress) {

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

    window.contract = this._contract;

    // FETCHING DATA
    // fetch some data from the contract
    const cName = await this._contract.name();
    const totalTurns = await this._contract.NT_num_of_turns();
    const totalGuesses = await this._contract.NG_num_of_guesses();
    const codeLen = await this._contract.N_len_of_code();

    if (cName === undefined || totalTurns === undefined || totalGuesses === undefined || codeLen === undefined) {
      alert("Error fetching data from the contract. Please try again later.");
      return;
    }

    this.setState({ contractName: cName, totalTurns: totalTurns, totalGuesses: totalGuesses, codeLen: codeLen });

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

    this._contract.on("GameEnded", async (eventGameID) => {
      if (!addressesEqual(eventGameID, this.state.currentGameID)) return;
      this.setState({ gameState: GameStates.GAME_ENDED_SHOW_RESULTS });
    });

    // I JOINED THE GAME, OR SOMEONE ELSE JOINED THE GAME
    // listen to the EVENT that is fired when any player joins any game.
    this._contract.on("GameJoined", async (eventGameID, player) => {

      if (this.state.gameState == GameStates.CREATED) {
        if (!addressesEqual(eventGameID, this.state.currentGameID)) return;
        if (addressesEqual(player, this.state.userAddress)) return;

        this.setState({ gameState: GameStates.JOINED_WAITING_YOUR_START });

        this.setState({ currentGameID: eventGameID.toNumber() });

        const oppAddress = await this._contract.getOpponent(eventGameID);
        this.setState({ opponentAddress: oppAddress });

        this._contract.startGame(this.state.currentGameID, {
          gasLimit: 100000
        });
      }

      if (this.state.gameState == GameStates.AWAITING_JOIN_CONFIRMATION) {
        if (!addressesEqual(player, this.state.userAddress)) return;

        this.setState({ gameState: GameStates.JOINED_WAITING_OPPONENTS_START });
        this.setState({ currentGameID: eventGameID.toNumber() });
      }

    });


    // the game is started and the roles have been assigned
    this._contract.on("GameStarted", (eventGameID, codeMakerAddress) => {
      if (this.state.currentGameID != eventGameID) {
        console.log("Someone else started a game. Ignoring.");
        return;
      }

      console.log(`Event GameStarted recieved. GameID: ${eventGameID}, The codeMaker is: ${codeMakerAddress}`);

      if (addressesEqual(codeMakerAddress, this.state.userAddress)) {
        this.setState({ gameState: GameStates.AWAITING_YOUR_COMMIT });
      } else {
        this.setState({ gameState: GameStates.AWAITING_OPPONENTS_COMMIT });
      }

    });

    this._contract.on("AFKAccusation", async (accusedUser, deadlineTimestamp) => {

      if (!addressesEqual(accusedUser, this.state.userAddress)) return;

      let currBlock = await this._ethersProvider.getBlockNumber();
      let diff = deadlineTimestamp - currBlock;

      window.Toast.fire({
        icon: "warning",
        title: "AFK warning. Make a move!",
        text: `Make a move in ${diff} blocks, or you will be declared as AFK.`,
      });
      
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

        if (correctColorAndPosition == this.state.codeLen) {
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

    this._contract.on("CodeGuessedUnsccessfully", (eventGameID, codeMakerAddress, guessesLeft, correctColorAndPosition, correctColorWrongPosition) => {
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

      // store the feedbacks in the state
      const updatedGuesses = [...this.state.myGuessesAndFeedbacks];
      const lastIndex = updatedGuesses.length - 1;
      updatedGuesses[lastIndex].correctColorAndPosition = correctColorAndPosition;
      updatedGuesses[lastIndex].correctColorWrongPosition = correctColorWrongPosition;
      this.setState({ myGuessesAndFeedbacks: updatedGuesses });
    });

    this._contract.on("CodeRevealed", async (eventGameID, secretCode) => {
      if (this.state.gameState != GameStates.AWAITING_OPPONENTS_REVEAL && this.state.gameState != GameStates.AWAITING_OPPONENTS_FEEDBACK) return;
      if (this.state.currentGameID != eventGameID) return;

      // options to choose from. they specify which feedback i want to dispute.
      const myInputOptions = {};
      let i =0;
      for (const f of this.state.myGuessesAndFeedbacks){
        const value = `guessId: ${i}, Your guess was ${f.guess}. The feedback was ${f.correctColorAndPosition} correct color and ${f.correctColorWrongPosition} correct color wrong position`; //TODO: cambia in " i think they cheated in feedback 1..."
        myInputOptions[i] = value;
        i++;
      }

      console.log(`this.state.myGuessesAndFeedbacks: ${this.state.myGuessesAndFeedbacks}`);
      console.log(`myInputOptions: ${myInputOptions}`);

      const userChoice = await 
      MySwal.fire({
          title: "Wanna open a dispute?",
          text: "The other player has revealed their secret code. They claim that the code is " + secretCode + ". Do you want to open a dispute? If so, please select the feedback you want to dispute.",
          icon: "question",
          showDenyButton: true,
          confirmButtonText: 'Yes',
          denyButtonText: 'No',
          input: "select",
          inputOptions: myInputOptions,
      });

      if (userChoice.isConfirmed) {
        const guessId = userChoice?.value;
        console.log("Selected choice, guessId: " + guessId);
        if (guessId === undefined) alert("Error, no guessId option selected");
        this._contract.dispute(eventGameID, guessId, {
          gasLimit: 100000
        })
        this.setState({ gameState: GameStates.AWAITING_FEEDBACK_FOR_YOUR_DISPUTE });
        return;
      } else if (userChoice.isDenied) {
        this._contract.dontDispute(eventGameID, {
          gasLimit: 100000
        });
        this.setState({ gameState: GameStates.AWAITING_YOUR_DISPUTE_DENIED });
        this.refreshTurnsAndGuessesLeft();
        return;
      }


    });


    this._contract.on("DisputeDenied", (eventGameID, codeMaker, turnsLeft) => {
      if (this.state.gameState != GameStates.AWAITING_OPPONENTS_DISPUTE && this.state.gameState != GameStates.AWAITING_YOUR_DISPUTE_DENIED && this.state.gameState != GameStates.AWAITING_FEEDBACK_FOR_YOUR_DISPUTE) return;
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

    this._contract.on("DisputeVerdict", (gameId, winner) => {
      if (this.state.currentGameID != gameId) return;
      const amWinner = addressesEqual(this.state.userAddress, winner);

      if (amWinner) {
        this.setState({ gameState: GameStates.GAME_ENDED_SHOW_RESULTS });
        MySwal.fire({
          title: "You won the dispute!",
          text: "The smart contract decided that you were right.",
          icon: "success",
        })
      } else {
        MySwal.fire({
          title: "You lost the dispute!",
          text: "The smart contract decided that you were wrong.",
          icon: "error",
        })
        this.setState({ gameState: GameStates.GAME_ENDED_SHOW_RESULTS });
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
      if (onChainColors.length !== COLORS_CHOICES.length) {
        throw new Error("Color arrays do not match in length");
      }

      // Check if each color matches in name and order
      for (let i = 0; i < onChainColors.length; i++) {
        if (onChainColors[i] !== COLORS_CHOICES[i].letter) {
          throw new Error(`Color mismatch at index ${i}: ${onChainColors[i]} !== ${COLORS_CHOICES[i].letter}`);
        }
      }

      console.log("Check _verifyColors() successful! All colors match!");
      this.state.colorsVerified = true;
    } catch (error) {
      console.error("Error verifying colors:", error);
    }
  }

  didTheyCheat(secretCode) {
    // TODO: implementare

    // check that the length is correct
    // check that it is made by admitted colors
    // check that the hashes match
    
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
