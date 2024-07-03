import React from "react";

export function CreateNewGame({ contract, ethers, updateGameState, GameStates, updateGameID }) {
    async function createGame() {
        try {
            // Send the transaction to create a new game
            const amountInWei = ethers.utils.parseUnits("1000", "wei");
            const tx = await contract.createGame({ value: amountInWei });
            
            // Update game state to awaiting creation
            updateGameState(GameStates.AWAITING_CREATION);
            
            // Wait for the transaction to be mined
            await tx.wait();
            
            let myGameID = -1;

            // Set up an event listener for the GameCreated event
            contract.once("GameCreated", (myGameIDFromEvent, creator) => {
                console.log(`Game created with count: ${myGameIDFromEvent}, by: ${creator}`);
                
                // Update the game state to indicate the game creation is complete
                updateGameState(GameStates.CREATED);
                updateGameID(myGameIDFromEvent.toNumber());
                myGameID = myGameIDFromEvent.toNumber();
            });

            // listen to the EVENT that is fired when another player joins
            contract.once("GameJoined", (eventGameID, player) => {
                if (eventGameID.toNumber() != myGameID) return;
                alert(`Another player joined this game (gameID ${eventGameID})! The player is: ${player}.`);
                updateGameState(GameStates.JOINED);
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