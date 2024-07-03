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

// This is the default id used by the Hardhat Network
const HARDHAT_NETWORK_ID = '31337';

// This is an error code that indicates that the user canceled a transaction
const ERROR_CODE_TX_REJECTED_BY_USER = 4001;


const COLORS_DATA = [
  { name: "Red", hex: "#FF0000" },
  { name: "Green", hex: "#00FF00" },
  { name: "Blue", hex: "#0000FF" },
  { name: "Yellow", hex: "#FFFF00" },
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" }
];

const GameStates = Object.freeze({
  NOT_CREATED: 100,
  AWAITING_CREATION: 200,
  CREATED: 300, // created and waiting for an opponent to join
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
    };

    this.state = this.initialState;
  }

  render() {
    // CHECK IF A WALLET IS INSTALLED - if not, ask the user
    // Ethereum wallets inject the window.ethereum object. If it hasn't been injected, we instruct the user to install a wallet.
    if (window.ethereum === undefined) {
      return <NoWalletDetected />;
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

    // SHOW LOADING
    // se ancora non sono state caricate queste cose, mostrare loading
    // TODO: decidere cosa aspettare 
    if (this.colorsVerified === false || this.state.gameState === GameStates.AWAITING_CREATION) {
      return <Loading />;
    }

    // JOIN OR CREATE A GAME
    // if there is no game in progress, show buttons to join one
    if(this.state.gameState === GameStates.NOT_CREATED) {
      return(
        <div className="row">
          <div className="col-12">



            <WalletInfo
              provider={this._ethersProvider}
              account={this.state.userAddress}
            />

            <CreateNewGame
              contract={this._contract}
              ethers={ethers}
              updateGameState={(gameState) => this.setState({gameState})}
              updateGameID={(gameID) => this.setState({currentGameID: gameID})}
              GameStates={GameStates}
            />

            {/* TODO: implement*/}
            <FindRandomGame
              findRandomGameFunction={() => this._findRandomGame()}
            />

            <hr />

            <JoinGameWithAddress
              contract={this._contract}
              ethers={ethers}
            />

          </div>
        </div>
      );
    }

    // GAME CREATED, WAIT FOR ANOTHER PLAYER
    if(this.state.gameState === GameStates.CREATED) {
      return(
        <div className="row">
          <div className="col-12">
            <h1>Game created!</h1>
            <p>The game ID is: {this.state.currentGameID}</p>
            <p>Waiting for another player to join...</p>
          </div>
        </div>
      );
    }

    // MAIN APP
    // If everything is loaded, we finally render the actual application.
    return (
      <div className="container p-4">
        <div className="row">
          <div className="col-12">
            <h1>
              Welcome to {this.state.contractName}!
            </h1>
            <p>
              You can choose between these colors {this.colorsData.map(color => color.name).join(", ")}.
            </p>
          </div>
        </div>

        <hr />

        <div className="row">
          <div className="col-12">

              
            {/*
              WAITING FOR TRANSACTION MESSAGE
              Sending a transaction isn't an immediate action. You have to wait for it to be mined. If we are waiting for one, we show a message here.
            */}
            {this.state.txBeingSent && (
              <WaitingForTransactionMessage txHash={this.state.txBeingSent} />
            )}

            {/*
              TRANSACTION ERROR
              Sending a transaction can fail in multiple ways. If that happened, we show a message here.
            */}
            {this.state.transactionError && (
              <TransactionErrorMessage
                message={this._getRpcErrorMessage(this.state.transactionError)}
                dismiss={() => this._dismissTransactionError()}
              />
            )}
          </div>
        </div>



              
      </div>
    );
  }

  componentWillUnmount() {
    // We poll the user's balance, so we have to stop doing that when Dapp gets unmounted
    // this._stopPollingData();
  }






  // function run when the user clicks "connect wallet"
  async _connectWallet() {

    // To connect to the user's wallet, we have to run this method. It returns a promise that will resolve to the user's address.
    const [userAddress] = await window.ethereum.request({ method: 'eth_requestAccounts' });

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

  // This method initializes the dapp
  _initialize(userAddress) {

    // We first store the user's address in the component's state
    this.setState({
      userAddress: userAddress,
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
    this.setState({ contractName: cName });
    
    this._verifyColors();
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



  // other functions

  _findRandomGame() {
    this._contract.findRandomGame();
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

  // This method checks if the selected network is Localhost:8545
  _checkNetwork() {
    if (window.ethereum.networkVersion !== HARDHAT_NETWORK_ID) {
      this._switchChain();
    }
  }




}
