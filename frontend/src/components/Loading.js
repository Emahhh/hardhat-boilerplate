import React, { useState, useEffect } from "react";

export function Loading({ message, showAfkButton, gameID, opponent }) {
  const [turnOffButton, setTurnOffButton] = useState(false);
  const [accusationStarted, setAccusationStarted] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  async function handleAfkClick() {
    try {
      await window.contract.startAccuseAFK(gameID, opponent);
      setAccusationStarted(true);
      setTimeElapsed(0); // Reset timer when accusation is started

      window.MySwal.fire({
        title: "AFK accusation sent",
        text: "The other player has some time to make a move. Wait some time, then click on the 'End AFK' button to try to declare the opponent as AFK.",
        icon: "success",
      });
    } catch (error) {
      window.MySwal.fire({
        title: "AFK error",
        icon: "error",
        text: error.message,
      });
      console.error("AFK error:", error);
    }
  }

  async function handleEndAccuseAfkClick() {
    try {
      const success = await window.contract.endAccuseAFK(gameID);

      if (success) {
        window.Toast.fire({
          icon: "success",
          title: "The opponent has been declared AFK!",
        });
        setTurnOffButton(true);
        setAccusationStarted(false);
      } else {
        window.Toast.fire({
          title:  "endAccuseAFK returned: " + success,
        });
      }
    } catch (error) {
      if (error?.message && error.message.includes("Not enough time passed since accusation!")) {
        window.Toast.fire({
          title: "Not enough time passed since accusation. Please try again later.",
        });
      } else {
        window.MySwal.fire({
          title: "AFK error",
          icon: "error",
          text: error.message,
        });
        console.error("AFK error:", error);
      }
    }
  }

  useEffect(() => {
    let timer;
    if (accusationStarted) {
      timer = setInterval(() => {
        setTimeElapsed(prevTime => prevTime + 1);
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [accusationStarted]);

  return (
    <div className="container">
      <article>
        <span aria-busy="true">{message}</span>
        {showAfkButton && !accusationStarted && (
          <button
            disabled={turnOffButton}
            onClick={handleAfkClick}
            data-tooltip="Accuse the other player of AFK. They'll have a certain amount of time to make their move, starting from the press of this button."
          >
            Accuse of AFK
          </button>
        )}
        {accusationStarted && (
          <div>
            <button onClick={handleEndAccuseAfkClick}>
              End AFK Accusation
            </button>
            <div>Time elapsed since accusation: {timeElapsed} seconds</div>
          </div>
        )}
      </article>
    </div>
  );
}