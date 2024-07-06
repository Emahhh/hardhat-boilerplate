import React, { useState } from "react";

export function MakeGuess({ contract, gameId, onGuessMade }) {
    const [guess, setGuess] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const handleGuess = async (event) => {
        event.preventDefault();

        if (!guess) {
            setErrorMessage("Guess cannot be empty");
            return;
        }

        try {
            await contract.makeGuess(gameId, guess);
            onGuessMade();
        } catch (error) {
            console.error("Error making guess:", error);
            setErrorMessage("Failed to make guess");
        }
    };

    return (
        <div>
            <form onSubmit={handleGuess}>
                <div>
                    <label>Guess:</label>
                    <input
                        type="text"
                        value={guess}
                        onChange={(e) => setGuess(e.target.value)}
                        required
                    />
                </div>
                {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
                <button type="submit">Make Guess</button>
            </form>
        </div>
    );
}