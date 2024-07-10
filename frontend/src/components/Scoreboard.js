import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

export const Scoreboard = ({ contract, gameId, updateGameState, gameState }) => {
    const totalTurns = gameState.totalTurns;
    const totalGuesses = gameState.totalGuesses;

    const [myScore, setMyScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);

    const [guessesLeft, setGuessesLeft] = useState(0);
    const [turnsLeft, setTurnsLeft] = useState(0);


    // Function to fetch all necessary data from the contract
    const fetchData = async () => {
        try {
            // Fetch data from contract
            const [guessesLeft, turnsLeft] = await contract.getGuessesAndTurnsLeft(gameId);
            const myScore = await contract.getCreatorScore(gameId);
            const opponentScore = await contract.getOpponentScore(gameId);

            // Convert BigNumber to numbers
            const formattedData = {
                guessesLeft: Number(guessesLeft),
                turnsLeft: Number(turnsLeft),
                myScore: myScore.toNumber(),
                opponentScore: opponentScore.toNumber(),
            };

            updateGameState(formattedData);

            setGuessesLeft(formattedData.guessesLeft);
            setTurnsLeft(formattedData.turnsLeft);
            setMyScore(formattedData.myScore);
            setOpponentScore(formattedData.opponentScore);//

            console.log("Fetched data from contract:", formattedData);
        } catch (error) {
            console.error("Error fetching data from contract:", error);
            // Handle error appropriately
        }
    };

    // Fetch data from contract when component mounts and when gameState changes
    useEffect(() => {
        fetchData();
    }, [gameState]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="fixed bottom-0 left-0 w-full p-4 text-white bg-gray-300 shadow-lg">
            <div className="flex items-center justify-between">
                <div>
                    {totalTurns !== undefined && turnsLeft !== undefined && (
                        <p className="text-md !text-white">
                            Turn {totalTurns - turnsLeft + 1} of {totalTurns}
                        </p>
                    )}
                </div>
                <div>
                    {guessesLeft !== undefined && (
                        <p className="text-sm">
                            {guessesLeft} guesses left
                        </p>
                    )}
                </div>
                <div>
                    {myScore !== undefined && opponentScore !== undefined && (
                        <p className="text-sm">
                            Your score: {myScore}, Opponent's score: {opponentScore}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Scoreboard;