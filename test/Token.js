// This is an example test file. Hardhat will run every *.js file in `test/`,
// so feel free to add new ones.

// Hardhat tests are normally written with Mocha and Chai.

// We import Chai to use its asserting functions here.
const { expect } = require("chai");

// We use `loadFixture` to share common setups (or fixtures) between tests.
// Using this simplifies your tests and makes them run faster, by taking
// advantage or Hardhat Network's snapshot functionality.
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");






// `describe` is a Mocha function that allows you to organize your tests.
// Having your tests organized makes debugging them easier. All Mocha
// functions are available in the global scope.
//
// `describe` receives the name of a section of your test suite, and a
// callback. The callback must define the tests of that section. This callback
// can't be an async function.
describe("Token contract", function () {




  // We define a fixture to reuse the same setup in every test. We use
  // loadFixture to run this setup once, snapshot that state, and reset Hardhat
  // Network to that snapshot in every test.
  async function deployTokenFixture() {
    // Get the ContractFactory and Signers here.
    const Mastermind = await ethers.getContractFactory("Mastermind");
    const [owner, addr1, addr2] = await ethers.getSigners();

    // To deploy our contract, we just have to call Token.deploy() and await
    // for it to be deployed(), which happens onces its transaction has been mined.
    const hardhatContract = await Mastermind.deploy();

    await hardhatContract.deployed();

    // Fixtures can return anything you consider useful for your tests
    return { Mastermind, hardhatContract, owner, addr1, addr2 };
  }


  describe("Colors", function () {

    it("Should return some colors", async function () {
      const { hardhatContract, owner } = await loadFixture(deployTokenFixture);
      try {
        const colors = await hardhatContract.getColors();
        console.log("Colors returned by getColors:", colors);
        expect(colors.length).to.be.greaterThan(3);
      } catch (error) {
        console.log(error);
      }

    });

  });



  // You can nest describe calls to create subsections.
  describe("Deployment", function () {
    // `it` is another Mocha function. This is the one you use to define your  tests. It receives the test name, and a callback function. If the callback function is async, Mocha will `await` it.
    it("Number of games should initially be zero", async function () {
      // We use loadFixture to setup our environment, and then assert that things went well
      const { hardhatContract, owner } = await loadFixture(deployTokenFixture);

      expect(await hardhatContract.games.length).to.equal(0);
    });

    
  });




});
