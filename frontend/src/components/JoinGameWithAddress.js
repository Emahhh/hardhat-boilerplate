import React, { useState } from "react";
import { getRpcErrorMessage } from "../utils";

export function JoinGameWithAddress({ contract, updateGameState, GameStates }) {
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
                alert("Please try again in a few seconds! The smart contract is not ready yet.");
                return;
            }
            alert(`The other player has decided a steak of ${gameStake} Wei. Do you want to join?`);
            // TODO: make em choose
            
            // Join the game

            await contract.joinGame(gameID, { value: gameStake });
            updateGameState(GameStates.AWAITING_JOIN_CONFIRMATION);
        } catch (error) {
            const errorMessage = getRpcErrorMessage(error);
            alert("Error joining game:", errorMessage);
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