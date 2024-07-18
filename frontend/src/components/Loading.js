import React, { useState, useEffect } from "react";
import { getRpcErrorMessage } from "../utils";


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
      console.error("AFK error:", getRpcErrorMessage(error));
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
<div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100">
  <article className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
    <div className="text-center">
      <span
        aria-busy="true"
        className="text-lg font-semibold text-gray-700 !text-wrap"
      >
        {message}
      </span>
    </div>

    {/* AFK Button */}
    {showAfkButton && !accusationStarted && (
      <div className="mt-6 text-center">
        <button
          disabled={turnOffButton}
          onClick={handleAfkClick}
          className="px-4 py-2 transition duration-300 ease-in-out rounded-lg shadow disabled:bg-gray-300"
        >
          Accuse of AFK
        </button>
      </div>
    )}

    {/* Accusation Status */}
    {accusationStarted && (
      <div className="mt-6 text-center">
        <button
          onClick={handleEndAccuseAfkClick}
          className="px-4 py-2 transition duration-300 ease-in-out rounded-lg shadow"
        >
          End AFK Accusation
        </button>
        <div className="mt-4 text-gray-600">
          Time elapsed since accusation: <span className="font-semibold">{timeElapsed} seconds</span>
        </div>
      </div>
    )}
  </article>
</div>
  );
}