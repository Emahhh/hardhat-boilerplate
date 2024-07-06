import React, { useState } from "react";

export function JoinGameWithAddress({ contract }) {
    const [gameID, setGameID] = useState("");

    async function joinGame() {
        if (!gameID) {
            alert("Please enter a game ID.");
            return;
        }
        const gameStake = await contract.getGameStake(gameID);

        alert(`The other player has decided a steak of ${gameStake} Wei. Do you want to join?`);
        // TODO: make em choose
        
        // Join the game
        contract.joinGame(gameID, { value: gameStake });

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