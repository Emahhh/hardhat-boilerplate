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
                // try again in 2 seconds
                setTimeout(fetchWinner, 2000);
            }
        };

        fetchWinner();
    }, []);


    const handlePlayAgain = () => {
        window.location.reload(); // This refreshes the page
    };

    return (
        <div className="container">
            <div className="card">
                <header>
                    <h2>Game ended!</h2>
                </header>
                <p>The winner is {winner || 'loading...'}</p>
                <footer>
                    <button onClick={handlePlayAgain} className="button primary">
                        Play Again
                    </button>
                </footer>
            </div>
        </div>
    );


};
