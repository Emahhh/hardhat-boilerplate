import React from "react";

export function CreateNewGame({ contract, ethers, updateGameState, GameStates, updateGameID }) {
    async function createGame() {
        try {
            // Send the transaction to create a new game
            const amountInWei = ethers.utils.parseUnits("1000", "wei"); //TODO: specifica l'amount
            const tx = await contract.createGame({ value: amountInWei });
            
            // Update game state to awaiting creation
            updateGameState(GameStates.AWAITING_CREATION); // TODO: controlla se tutti questi GameStates assegnati vanno bene
            
            // Wait for the transaction to be mined
            await tx.wait();
            

        } catch (error) {
            alert("Error creating game:", error);
            updateGameState(GameStates.NOT_CREATED);

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