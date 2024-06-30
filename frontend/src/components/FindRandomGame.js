import React from "react";

export function FindRandomGame({ findRandomGameFunction }) {
    return (

        <button
            type="button"
            className="btn btn-primary"
            onClick={findRandomGameFunction}
        >
            Find a Random Game
        </button>

    );
}
