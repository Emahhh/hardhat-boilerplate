import React, { useState, useEffect } from 'react';

export function ShowResults({ contract, gameId, currUser }) {
    const [winner, setWinner] = useState(null);

    useEffect(() => {
        const fetchWinner = async () => {
            try {
                const winner = await contract.getWinner(gameId);
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

    let message;

    if (winner && currUser){
        if(addressesEqual(winner, currUser)){
            message = <p>You won! Congratulations.</p> 
        } else {
            message = <p>You lost! The winner is {winner}.</p> 
        }
    } else {
        message = <p aria-busy="true">The winner is...</p>
    }

    return (
        <div className="container">
            <div className="card">
                <header>
                    <h2>Game ended!</h2>
                </header>
                {message}
                <footer>
                    <button onClick={handlePlayAgain} className="button primary">
                        Play Again
                    </button>
                </footer>
            </div>
        </div>
    );


};


function addressesEqual(addr1, addr2) {
    return addr1.toString().toLowerCase() === addr2.toString().toLowerCase();
  }
