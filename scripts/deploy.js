// This is a script for deploying the contract and placing its artifacts in the /frontend folder

const path = require("path");

async function main() {
  // This is just a convenience check
  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which" +
        "gets automatically created and destroyed every time. Use the Hardhat" +
        " option '--network localhost'"
    );
  }

  // ethers is available in the global scope
  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );

  console.log("Deployer account balance:", (await deployer.getBalance()).toString());

  const Mastermind = await ethers.getContractFactory("Mastermind");
  const mastermind = await Mastermind.deploy();
  await mastermind.deployed();

  console.log("Mastermind contract address:", mastermind.address);

  // We also save the contract's artifacts and address in the frontend directory
  saveFrontendFiles(mastermind);
}

function saveFrontendFiles(mastermind) {
  const fs = require("fs");
  const contractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ Mastermind: mastermind.address }, undefined, 2)
  );

  const MastermindArtifact = artifacts.readArtifactSync("Mastermind");

  fs.writeFileSync(
    path.join(contractsDir, "Mastermind.json"),
    JSON.stringify(MastermindArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
