import React, { useState } from "react";
import { getRpcErrorMessage } from "../utils";


export function CreateNewGame({ isPrivate, contract, ethers, updateGameState, GameStates, updateGameID }) {
    const [amount, setAmount] = useState("");
    const [oppAddressInput, setOppAddressInput] = useState("");
    const [error, setError] = useState("");
    const amountInEth = amount ? ethers.utils.formatEther(amount) : 0;

    async function createGame() {
        try {
            const emptyAddress = ethers.constants.AddressZero;

            if (isPrivate && !oppAddressInput) {
                setError("Opponent address is required");
                return;
            }

            if (isPrivate &&!ethers.utils.isAddress(oppAddressInput)) {
                setError("Opponent address is not a valid address");
                return;
            }

            const amountInWei = ethers.utils.parseUnits(amount, "wei");

            if (amountInWei.isZero()) {
                setError("Amount must be greater than 0");
                return;
            }

            // Send the transaction to create a new game
            const oppAdd = isPrivate ? oppAddressInput : emptyAddress;
            const tx = await contract.createGame(oppAdd, { value: amountInWei });

            // Update game state to awaiting creation
            updateGameState(GameStates.AWAITING_CREATION);

            // Wait for the transaction to be mined
            await tx.wait();

            console.log("Game created, reserved for address:", oppAdd);

        } catch (error) {
            console.log(error);
            window.MySwal.fire({
                icon: "error",
                title: "Error",
                text: getRpcErrorMessage(error),
            })
            updateGameState(GameStates.NOT_CREATED);
        }
    }

    function handleChange(event) {
        setAmount(event.target.value);
        setError(""); // Clear error on new input
    }

    return (
        <div>
            {isPrivate &&
                <>
                    <label>Opponent Address</label>
                    <input
                        type="text"
                        value={oppAddressInput}
                        onChange={(event) => setOppAddressInput(event.target.value)}
                    />
                </>
            }
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