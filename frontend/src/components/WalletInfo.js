import React from "react";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

export function WalletInfo({ provider, account }) {

  const [balance, setBalance] = useState("");

  useEffect(() => {
    if (account) {
      fetchBalance();
      const interval = setInterval(fetchBalance, 1000); // Update balance every 1 secs
      return () => clearInterval(interval);
    }
  }, [account]);

  const fetchBalance = async () => {
    if (provider && account) {
      const balance = await provider.getBalance(account);
      setBalance(ethers.utils.formatEther(balance));
    }
  };



  return (

    <div>
      <p>Your address is: {account}</p>
      <p>Your balance is: {balance}</p>
      <p>If your wallet is empty, get some ETH by running this command while in the root of the repository... <b>npx hardhat --network localhost faucet {account}</b></p>
    </div>

  );
}
