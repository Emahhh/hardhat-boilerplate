import React, { useState } from "react";
import { getRpcErrorMessage } from "../utils";

import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'
const MySwal = withReactContent(Swal);

export function FindRandomGame({ contract, ethers, updateGameState, GameStates, updateOpponentAddress }) {
    const [errorMessage, setErrorMessage] = useState('');

    async function handleClick() {
        try {
            const gameID =  Number(await contract.getRandomGameWithOnePlayer((Math.random() * 100).toFixed(0)));

            if (!gameID) {
                alert("No games found. Please try again in a few seconds!");
                return;
            }

            let gameStake = 0;
            gameStake = Number(await contract.getGameStake(gameID));
            if (gameStake == 0) {
                alert("Please try again in a few seconds! The smart contract is not ready yet.");
                return;
            }

            const creatorAddress = await contract.getCreator(gameID);

            if (!creatorAddress || creatorAddress == ethers.constants.AddressZero) {
                alert("Errror getting creator.");
                return;
            }
            
            // TODO: fare tutti gli alert così con SweetAlert
            const userChoice = await 
            MySwal.fire({
                title: "Wanna join this game?",
                html: 
                <ul className="space-y-2 text-left">
                    <li className="text-lg font-bold text-blue-600">
                        Game ID: <span className="font-normal text-gray-800">{gameID}</span>
                    </li>
                    <li className="text-lg font-bold text-blue-600">
                        Creator: <span className="text-xs font-normal text-gray-800">{creatorAddress}</span>
                    </li>
                    <li className="text-lg font-bold text-blue-600">
                        Stake: <span className="font-normal text-gray-800">{gameStake} Wei</span>
                    </li>
                </ul>,
                icon: "question",
                showDenyButton: true,
                confirmButtonText: 'Yes',
                denyButtonText: 'No',
            });

            if (userChoice.isConfirmed) {
                await contract.joinGame(gameID, { value: gameStake });
                updateGameState(GameStates.AWAITING_JOIN_CONFIRMATION);
                updateOpponentAddress(creatorAddress);
            } else if (userChoice.isDenied) {
                return;
            }


        } catch (error) {
            console.error("Error finding game:", error);

            if (error?.message && error.message.includes("You can't play against yourself!")) {
                alert("Try again! We found your own game, and you can't play against yourself!");
            }

            if (error?.message && error?.message.includes("No games with only one player available")) {
                alert("No games found. Please try again in a few seconds!");
            }
        }
    }

    return (
        <div>
            <button onClick={handleClick}>Find a game</button>
            {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
        </div>
    );
}


