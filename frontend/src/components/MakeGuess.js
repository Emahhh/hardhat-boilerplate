import React, { useState } from "react";

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
                { guess: guess, correctColorAndPosition: 0, correctColorWrongPosition: 0 }
            ]);
        } catch (error) {
            console.error("Error making guess:", error);
            setErrorMessage("Failed to make guess");
        }
    };

    return (
        <div className="p-8 mt-2 bg-gray-100 rounded-lg shadow-md neumorphic">

            <div className="mt-2">
                <h2 className="mb-4 text-lg font-bold">Previous hints:</h2>
                <ul className="space-y-4">
                    {myGuessesAndFeedbacks && myGuessesAndFeedbacks.length > 0 && myGuessesAndFeedbacks.map((item, index) => (
                        <li key={index} className="flex items-center p-4 bg-gray-200 rounded-lg shadow-inner neumorphic">
                            <div className="flex space-x-4">
                                {item.guess.split("").map((letter, i) => {
                                    const color = colors.find(c => c.letter === letter);
                                    return (
                                        <div
                                            key={i}
                                            className="w-8 h-8 border-2 border-gray-300 rounded-full neumorphic-inner"
                                            style={{ backgroundColor: color ? color.hex : "transparent" }}
                                        ></div>
                                    );
                                })}
                            </div>
                            <div className="flex items-center ml-8 space-x-2" data-tooltip={`Correct Color and Position: ${item.correctColorAndPosition}, Correct Color Wrong Position: ${item.correctColorWrongPosition}`}>
                                {Array.from({ length: item.correctColorAndPosition }).map((_, i) => (
                                    <div
                                        key={`black-${i}`}
                                        className="w-4 h-4 bg-gray-800 border-2 border-gray-400 rounded-full neumorphic-peg"
                                    ></div>
                                ))}
                                {Array.from({ length: item.correctColorWrongPosition }).map((_, i) => (
                                    <div
                                        key={`white-${i}`}
                                        className="w-4 h-4 bg-gray-100 border-2 border-gray-400 rounded-full neumorphic-peg"
                                    ></div>
                                ))}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <h1 className="mt-12">Make Your Guess</h1>
            <p>Click on the colors to change them.</p>
            <div className="flex items-center justify-between p-4 bg-gray-200 rounded-lg shadow-inner neumorphic">
                <div className="flex space-x-4">
                    {selectedColors.map((color, index) => (
                        <div key={index} className="flex flex-col items-center">
                            <div
                                className="w-12 h-12 border-2 border-gray-300 rounded-full shadow-md cursor-pointer neumorphic-inner"
                                style={{ backgroundColor: color ? color.hex : "transparent" }}
                                onClick={() => handleColorClick(index)}
                            ></div>
                        </div>
                    ))}
                </div>
                {errorMessage && <p className="mb-4 text-red-500">{errorMessage}</p>}
                <button onClick={handleSubmit} className="!w-40 !rounded-3xl !shadow-lg">
                    Submit guess
                </button>
            </div>
        </div>
    );
}

export default MakeGuess;