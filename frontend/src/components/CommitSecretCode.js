// CommitSecretCode.js

import React, { useState } from "react";
import { ethers } from "ethers";

export function CommitSecretCode({ contract, gameId, onCommit, updateSecretCode }) {
    const [secretCode, setSecretCode] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const handleCommit = async (event) => {
        event.preventDefault();

        if (!secretCode) {
            setErrorMessage("Secret code cannot be empty");
            return;
        }

        try {
            const secretHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(secretCode));
            await contract.commitSecretCode(gameId, secretHash);
            updateSecretCode(secretCode);
            onCommit();
        } catch (error) {
            console.error("Error committing secret code:", error);
            setErrorMessage("Failed to commit secret code");
        }
    };

    return (
        <div>
            <form onSubmit={handleCommit}>
                <div>
                    <label>Secret Code:</label>
                    <input
                        type="text"
                        value={secretCode}
                        onChange={(e) => setSecretCode(e.target.value)}
                        required
                    />
                </div>
                {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
                <button type="submit">Commit Secret Code</button>
            </form>
        </div>
    );
}