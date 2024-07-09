import React, { useState } from "react";
import { ethers } from "ethers";

export const CommitSecretCode = ({ contract, gameId, onCommit, updateSecretCode, myGuessesAndFeedbacks, colors, codeLength }) => {
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

        selectedColors.map((color, index) => {
            if (!color) {
                setErrorMessage("You must pick a color for each position");
                return;
            }
        });

        const secretCode = selectedColors.map(color => color.letter).join("");
        if (secretCode.length !== codeLength) {
            setErrorMessage("You must pick a color for each position");
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
        <div className="p-4 mt-8 bg-gray-100 rounded-lg shadow-md">
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block mb-2 text-lg font-bold">Pick Your Secret Code:</label>
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
                <button type="submit" className="!font-bold">
                    Commit Secret Code
                </button>
            </form>
        </div>
    );
};