require("@nomicfoundation/hardhat-toolbox");

require("./tasks/faucet");

console.log("Hardhat configuration loaded!");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {
      mining: {
        auto: true,
        interval: 3000,
      },
    },
  },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      
    }
  },
};
