import React, { useState } from "react";
import { getRpcErrorMessage } from "../utils";

export function JoinGameWithAddress({ contract, updateGameState, GameStates, updateOpponentAddress }) {
    const [gameID, setGameID] = useState("");

    async function joinGame() {
        if (!gameID) {
            alert("Please enter a game ID.");
            return;
        }
        try {
            let gameStake = 0;
            gameStake = await contract.getGameStake(gameID);
            if (gameStake == 0) {
                window.MySwal.fire({
                    title: "Please try again in a few seconds!",
                    text: "The smart contract is not ready yet.",
                    icon: "error", 
                });
                return;
            }

            const { isConfirmed } = await window.MySwal.fire({
                title: "Wanna join?",
                text: "The other player has decided a stake of " + gameStake + " Wei.",
                icon: "info",
                showCancelButton: true,
            });
            
            if (!isConfirmed) return;

            // Join the game
            await contract.joinGame(gameID, { value: gameStake });
            updateGameState(GameStates.AWAITING_JOIN_CONFIRMATION);

            const opponentAddress = await contract.getCreator(gameID);
            updateOpponentAddress(opponentAddress);
        } catch (error) {
            const errorMessage = getRpcErrorMessage(error);
            window.MySwal.fire({
                title: "Error joining game",
                text: errorMessage,
                icon: "error",
            });
            console.error("Error joining game:", error);
        }
    }

    return (
        <>
            <input
                id="address"
                className="form-control"
                placeholder="Game ID"
                value={gameID}
                onChange={(e) => setGameID(e.target.value)}
            />
            <button
                type="button"
                className="btn btn-primary"
                onClick={joinGame}
            >
                Join this game
            </button>
        </>
    );
}