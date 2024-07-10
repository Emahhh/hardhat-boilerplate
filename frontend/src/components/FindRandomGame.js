import React, { useState } from "react";
import { getRpcErrorMessage } from "../utils";

export function FindRandomGame({ contract, ethers, updateGameState, GameStates }) {
    const [errorMessage, setErrorMessage] = useState('');

    async function handleClick() {
        try {
            const gameID = await contract.getRandomGameWithOnePlayer();

            if (!gameID) {
                alert("No games found. Please try again in a few seconds!");
                return;
            }

            let gameStake = 0;
            gameStake = await contract.getGameStake(gameID);
            if (gameStake == 0) {
                alert("Please try again in a few seconds! The smart contract is not ready yet.");
                return;
            }
            alert(`The other player has decided a steak of ${gameStake} Wei. Do you want to join?`);

            await contract.joinGame(gameID, { value: gameStake });
            updateGameState(GameStates.AWAITING_JOIN_CONFIRMATION);

        } catch (error) {
            if(error?.message && error.message.includes("You can't play against yourself!")) {
                alert("Try again! We found your own game, and you can't play against yourself!");
                return;
            }

            console.error("Error finding game:", error);
            setErrorMessage("Error finding game: " + error);

            if(error?.message && error?.message.includes("No games with only one player available")) {
                setErrorMessage("No games found. Please try again in a few seconds!");
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


