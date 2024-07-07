import React, { useState, useEffect } from 'react';

export function ShowResults({ contract, gameId }) {
    const [winner, setWinner] = useState(null);

    useEffect(() => {
        const fetchWinner = async () => {
            try {
                const winner = await contract.winner(gameId);
                setWinner(winner);
            } catch (error) {
                console.error('Error fetching winner:', error);
            }
        };

        fetchWinner();
    }, []);


    return <p>Game ended! The winner is {winner || 'loading...'}</p>;


};
