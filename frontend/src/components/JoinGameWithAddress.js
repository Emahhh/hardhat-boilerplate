import React, { useState } from "react";

export function JoinGameWithAddress({ contract }) {
    const [address, setAddress] = useState("");

    function joinGame() {
        if (!address) {
            alert("Please enter a game ID.");
            return;
        }
        console.log(contract);
        contract.joinGame(address);
    }

    return (
        <>
            <input
                id="address"
                className="form-control"
                placeholder="Game ID"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
            />
            <button
                type="button"
                className="btn btn-primary"
                onClick={joinGame}
            >
                Join this game
            </button>
        </>
    );
}