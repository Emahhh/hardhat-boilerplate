import React, { useState } from "react";
// import { ethers } from "ethers";

export const MakeGuess = ({ contract, gameId, onGuessMade, myGuessesAndFeedbacks, setMyGuessesAndFeedbacks, codeLength, colors }) => {
    const [selectedColors, setSelectedColors] = useState(Array(codeLength).fill(colors[0]));
    const [errorMessage, setErrorMessage] = useState("");

    const handleColorClick = (index) => {
        const currentColorIndex = colors.findIndex(c => c === selectedColors[index]);
        const nextColor = colors[(currentColorIndex + 1) % colors.length];
        const newColors = [...selectedColors];
        newColors[index] = nextColor;
        setSelectedColors(newColors);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const guess = selectedColors.map(color => color.letter).join("");
        if (guess.length !== codeLength) {
            setErrorMessage("You must pick a color for each position");
            return;
        }

        try {
            await contract.makeGuess(gameId, guess);
            onGuessMade();
            setMyGuessesAndFeedbacks([
                ...myGuessesAndFeedbacks,
                { guess: guess, correctColorAndPosition: undefined, correctColorWrongPosition: undefined }
            ]);
        } catch (error) {
            console.error("Error making guess:", error);
            setErrorMessage("Failed to make guess");
        }
    };

    return (
        <div className="p-4 mt-8 bg-gray-100 rounded-lg shadow-md">
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block mb-2 text-lg font-bold">Make Your Guess:</label>
                    <div className="flex space-x-2">
                        {selectedColors.map((color, index) => (
                            <div key={index} className="flex flex-col items-center">
                                <div
                                    className="w-12 h-12 border-2 border-gray-300 rounded-full cursor-pointer"
                                    style={{ backgroundColor: color ? color.hex : "transparent" }}
                                    onClick={() => handleColorClick(index)}
                                ></div>
                            </div>
                        ))}
                    </div>
                </div>
                {errorMessage && <p className="mb-4 text-red-500">{errorMessage}</p>}
                <button type="submit" className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-600">
                    Make Guess
                </button>
            </form>
            <div className="mt-4">
                <h2 className="mb-2 text-lg font-bold">Previous Guesses:</h2>
                <ul>
                    {myGuessesAndFeedbacks.map && myGuessesAndFeedbacks.map((item, index) => (
                        <li key={index} className="flex items-center mb-2">
                            <span className="flex space-x-2">
                                {item.guess.split("").map((letter, i) => {
                                    const color = colors.find(c => c.letter === letter);
                                    return (
                                        <div
                                            key={i}
                                            className="w-6 h-6 border-2 border-gray-300 rounded-full"
                                            style={{ backgroundColor: color.hex }}
                                        ></div>
                                    );
                                })}
                            </span>
                            <span className="ml-4">
                                <span className="font-semibold">Correct Color and Position:</span> {item.correctColorAndPosition},
                                <span className="ml-2 font-semibold">Correct Color Wrong Position:</span> {item.correctColorWrongPosition}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default MakeGuess;