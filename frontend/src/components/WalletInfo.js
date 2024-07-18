import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CopyToClipboard } from 'react-copy-to-clipboard';

export function WalletInfo({ provider, account }) {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (account) {
      fetchBalance();
      const interval = setInterval(fetchBalance, 3000); // Update balance every 3 seconds
      return () => clearInterval(interval);
    }
  }, [account]);

  const fetchBalance = async () => {
    if (provider && account) {
      const balance = await provider.getBalance(account);
      setBalance(ethers.utils.formatEther(balance));
    }
  };

  const handleCopy = () => {
    window.Toast.fire({
      title: 'Copied to clipboard!',
      icon: 'success',
    });
  };

  return (
    <>
      <h3>Your wallet info</h3>

      {/* Address Section */}
      <div className="p-4 mb-4 border border-gray-200 rounded-lg">
        <p className="mb-2 text-gray-600">Your address is:</p>
        <div className="flex items-center space-x-2 overflow-hidden">
          <span className="flex-grow px-2 py-1 font-mono text-gray-800 truncate bg-gray-100 rounded">
            {account}
          </span>
          <CopyToClipboard text={account} onCopy={handleCopy}>
            <button className="px-4 py-2 text-white">
              Copy
            </button>
          </CopyToClipboard>
        </div>
      </div>

      {/* Balance Section */}
      <div className="p-4 mb-4 border border-gray-200 rounded-lg">
        <p className="mb-2 text-gray-600">
          Your balance is: <span className="font-semibold text-gray-800">{balance}</span>
        </p>
      </div>

      {/* Instructions Section */}
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <p className="mb-2 text-gray-600">
          If your wallet is empty, get some ETH by running this command while in the root of the repository:
        </p>
        <div className="flex items-center space-x-2">
          <textarea 
            readOnly 
            value={`npx hardhat --network localhost faucet ${account}`}
            className="w-full h-24 p-2 overflow-auto font-mono text-sm bg-gray-100 border border-gray-300 rounded resize-none"
          />
          <CopyToClipboard text={`npx hardhat --network localhost faucet ${account}`} onCopy={handleCopy}>
            <button className="px-4 py-2 ml-2 text-white">
              Copy
            </button>
          </CopyToClipboard>
        </div>
      </div>
    </>
  );
}