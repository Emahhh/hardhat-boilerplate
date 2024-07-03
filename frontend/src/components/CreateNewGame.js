import React from "react";

export function CreateNewGame({ contract, ethers, updateGameState, GameStates, updateGameID }) {
    async function createGame() {
        try {
            // Send the transaction to create a new game
            const tx = await contract.createGame({ value: ethers.utils.parseEther("1") });
            
            // Update game state to awaiting creation
            updateGameState(GameStates.AWAITING_CREATION);
            
            // Wait for the transaction to be mined
            await tx.wait();
            
            // Set up an event listener for the GameCreated event
            contract.once("GameCreated", (gameCount, creator) => {
                console.log(`Game created with count: ${gameCount}, by: ${creator}`);
                
                // Update the game state to indicate the game creation is complete
                updateGameState(GameStates.CREATED);
                updateGameID(gameCount.toNumber());
            });
        } catch (error) {
            console.error("Error creating game:", error);
            // Optionally update game state to an error state
            updateGameState(GameStates.ERROR);
        }
    }

    return (
        <button
            type="button"
            className="btn btn-primary"
            onClick={createGame}
        >
            Create New Game
        </button>
    );
}