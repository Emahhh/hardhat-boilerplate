import React, { useState } from "react";

export function CreateNewGame({ contract, ethers, updateGameState, GameStates, updateGameID }) {
    const [amount, setAmount] = useState("");
    const [error, setError] = useState("");
    const amountInEth = amount ? ethers.utils.formatEther(amount) : 0;

    async function createGame() {
        try {
            const amountInWei = ethers.utils.parseUnits(amount, "wei");
            
            if (amountInWei.isZero()) {
                setError("Amount must be greater than 0");
                return;
            }

            // Send the transaction to create a new game
            const tx = await contract.createGame({ value: amountInWei });
            
            // Update game state to awaiting creation
            updateGameState(GameStates.AWAITING_CREATION);
            
            // Wait for the transaction to be mined
            await tx.wait();

        } catch (error) {
            alert("Error creating game:", error);
            updateGameState(GameStates.NOT_CREATED);
        }
    }

    function handleChange(event) {
        setAmount(event.target.value);
        setError(""); // Clear error on new input
    }

    return (
        <div>
            <label htmlFor="stakeAmount">Enter Stake Amount (in Wei):</label>
            <input
                type="number"
                id="stakeAmount"
                value={amount}
                onChange={handleChange}
                placeholder="Enter amount in Wei"
            />
            <p>= {amountInEth} ETH</p>
            {error && <p className="error">{error}</p>}
            <button
                type="button"
                className="btn btn-primary"
                onClick={createGame}
                disabled={!amount || parseInt(amount) <= 0}
            >
                Create New Game
            </button>
        </div>
    );
}