import React, { useState } from "react";

export function JoinGameWithAddress({ contract, updateGameState, GameStates, updateGameID }) {
    const [gameID, setGameID] = useState("");

    async function joinGame() {
        if (!gameID) {
            alert("Please enter a game ID.");
            return;
        }
        const gameStake = await contract.getGameStake(gameID);

        alert(`The other player has decided a steak of ${gameStake} Wei. Do you want to join?`);
        
        // Join the game
        contract.joinGame(gameID, { value: gameStake });
        contract.once("GameJoined", (joinedGameID) => {
            console.log(`Someone joined game ${joinedGameID.toNumber()}`);
            if(joinedGameID.toNumber() != gameID) return;
            alert("Joined the game");
            updateGameID(gameID);
            updateGameState(GameStates.JOINED);
        })
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