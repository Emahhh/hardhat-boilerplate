require("@nomicfoundation/hardhat-toolbox");

require("./tasks/faucet");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
    hardhat: {
      mining: {
        auto: true,
        interval: 3000,
      },
    },
  },
};
