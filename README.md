# Hardhat Boilerplate

- project taken from: [Hardhat Beginners Tutorial](https://hardhat.org/tutorial)
- for this projects, I used pnpm, but npm should work fine

## Quick start

First thing: install dependencies

```sh
# while in the root of the project
pnpm install
```

Once installed, let's run Hardhat's testing network:

```sh
# while in the root of the project
npx hardhat node
```

Then, on a new terminal, go to the repository's root folder and run this to deploy the contract:

```sh
# while in the root of the project
npx hardhat run scripts/deploy.js --network localhost
```

Finally, we can run the frontend with:

```sh
cd frontend
pnpm install
pnpm run start
```

- now, open [http://localhost:3000/](http://localhost:3000/) to see your react Dapp run on the browser.
- You will need to have [Coinbase Wallet](https://www.coinbase.com/wallet) or [Metamask](https://metamask.io) installed and listening to `localhost 8545`.



## Useful links
- Deploy and interact with your contracts using [ethers.js](https://docs.ethers.io/v5/) and the [`hardhat-ethers`](https://hardhat.org/hardhat-runner/plugins/nomiclabs-hardhat-ethers) plugin.
- Verify the source code of your contracts with the [hardhat-etherscan](https://hardhat.org/hardhat-runner/plugins/nomiclabs-hardhat-etherscan) plugin.
- Get metrics on the gas used by your contracts with the [hardhat-gas-reporter](https://github.com/cgewecke/hardhat-gas-reporter) plugin.
- Measure your tests coverage with [solidity-coverage](https://github.com/sc-forks/solidity-coverage).
