import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

export const Scoreboard = ({ contract, gameId, updateGameState, gameState }) => {
    const [totalTurns, setTotalTurns] = useState(undefined);
    const [totalGuesses, setTotalGuesses] = useState(undefined);
    const [guessesLeft, setGuessesLeft] = useState(undefined);
    const [turnsLeft, setTurnsLeft] = useState(undefined);
    const [myScore, setMyScore] = useState(undefined);
    const [opponentScore, setOpponentScore] = useState(undefined);

    // Function to fetch all necessary data from the contract
    const fetchData = async () => {
        try {
            // Fetch total turns and total guesses from contract
            const [guessesLeftFromContract, turnsLeftFromContract] = await contract.getGuessesAndTurnsLeft(gameId);
            const totalTurnsFromContract = await contract.getGameStake(gameId);
            const totalGuessesFromContract = await contract.getGameStake(gameId);
            const myScoreFromContract = await contract.getCreatorScore(gameId);
            const opponentScoreFromContract = await contract.getOpponentScore(gameId);

            // Update state with fetched data
            setTotalTurns(totalTurnsFromContract);
            setTotalGuesses(totalGuessesFromContract);
            setGuessesLeft(guessesLeftFromContract);
            setTurnsLeft(turnsLeftFromContract);
            setMyScore(myScoreFromContract);
            setOpponentScore(opponentScoreFromContract);

            // Update gameState in parent component if updateGameState is provided
            if (updateGameState) {
                updateGameState({
                    ...gameState,
                    totalTurns: totalTurnsFromContract,
                    totalGuesses: totalGuessesFromContract,
                    guessesLeft: guessesLeftFromContract,
                    turnsLeft: turnsLeftFromContract,
                    myScore: myScoreFromContract,
                    opponentScore: opponentScoreFromContract
                });
            }
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
        <div className="fixed bottom-0 left-0 w-full p-4 text-white bg-gray-800">
            <div className="flex items-center justify-between">
                <div>
                    {totalTurns !== undefined && (
                        <p className="text-sm">Turn {turnsLeft} of {totalTurns}</p>
                    )}
                    {guessesLeft !== undefined && (
                        <p className="text-sm">{guessesLeft} guesses left</p>
                    )}
                </div>
                <div>
                    {myScore !== undefined && opponentScore !== undefined && (
                        <p className="text-sm">Your score: {myScore}, Opponent's score: {opponentScore}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Scoreboard;