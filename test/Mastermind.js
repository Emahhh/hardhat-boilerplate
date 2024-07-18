const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Mastermind contract", function () {
    async function deployMastermindFixture() {
        const Mastermind = await ethers.getContractFactory("Mastermind");
        const [owner, addr1, addr2] = await ethers.getSigners();
        const mastermind = await Mastermind.deploy();
        await mastermind.deployed();
        return { mastermind, owner, addr1, addr2 };
    }

    describe("Deployment", function () {
        it("Should deploy with correct initial values", async function () {
            const { mastermind, owner } = await loadFixture(deployMastermindFixture);
            expect(await mastermind.name()).to.equal("Mastermind");
            expect(await mastermind.symbol()).to.equal("ETH");
            expect(await mastermind.decimals()).to.equal(18);
        });
    });

    describe("Game Management", function () {
        it("Should create a game and emit GameCreated event", async function () {
            const { mastermind, owner } = await loadFixture(deployMastermindFixture);
            const depositAmount = ethers.utils.parseEther("1.0");

            await expect(mastermind.createGame(ethers.constants.AddressZero,{ value: depositAmount }))
                .to.emit(mastermind, "GameCreated")
                .withArgs(1, owner.address);

            const creator = await mastermind.getCreator(1);
            const stake = await mastermind.getGameStake(1);
            expect(creator).to.equal(owner.address);
            expect(stake).to.equal(depositAmount);
        });

        it("Should join a game and emit GameJoined event", async function () {
            const { mastermind, owner, addr1 } = await loadFixture(deployMastermindFixture);
            const depositAmount = ethers.utils.parseEther("1.0");

            await mastermind.createGame({ value: depositAmount });
            await expect(mastermind.connect(addr1).joinGame(1, { value: depositAmount }))
                .to.emit(mastermind, "GameJoined")
                .withArgs(1, addr1.address);

            const game = await mastermind.games(1);
            expect(game.opponent).to.equal(addr1.address);
            expect(game.state).to.equal(1); // Joined
        });

        it("Should start a game and emit GameStarted event", async function () {
            const { mastermind, owner, addr1 } = await loadFixture(deployMastermindFixture);
            const depositAmount = ethers.utils.parseEther("1.0");

            await mastermind.createGame({ value: depositAmount });
            await mastermind.connect(addr1).joinGame(1, { value: depositAmount });
            await expect(mastermind.connect(owner).startGame(1))
                .to.emit(mastermind, "GameStarted");

            const game = await mastermind.games(1);
            expect(game.state).to.equal(2); // InProgress
        });

        it("Should commit a secret code and emit CodeCommitted event", async function () {
            const { mastermind, owner, addr1 } = await loadFixture(deployMastermindFixture);
            const depositAmount = ethers.utils.parseEther("1.0");
            const secretHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("secretCode"));

            await mastermind.createGame({ value: depositAmount });
            await mastermind.connect(addr1).joinGame(1, { value: depositAmount });
            await mastermind.connect(owner).startGame(1);

            await expect(mastermind.connect(owner).commitSecretCode(1, secretHash))
                .to.emit(mastermind, "CodeCommitted")
                .withArgs(1, secretHash);

            const game = await mastermind.games(1);
            expect(game.secretHash).to.equal(secretHash);
            expect(game.phase).to.equal(1); // Guess
        });

        it("Should make a guess and emit CodeGuessed event", async function () {
            const { mastermind, owner, addr1 } = await loadFixture(deployMastermindFixture);
            const depositAmount = ethers.utils.parseEther("1.0");
            const secretHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("secretCode"));

            await mastermind.createGame({ value: depositAmount });
            await mastermind.connect(addr1).joinGame(1, { value: depositAmount });
            await mastermind.connect(owner).startGame(1);
            await mastermind.connect(owner).commitSecretCode(1, secretHash);

            await expect(mastermind.connect(addr1).makeGuess(1, "RGBY"))
                .to.emit(mastermind, "CodeGuessed")
                .withArgs(1, "RGBY", 2);

            const game = await mastermind.games(1);
            expect(game.currentTurnGuesses[0]).to.equal("RGBY");
            expect(game.phase).to.equal(2); // Feedback
        });

        it("Should give feedback and emit CodeGuessedSuccessfully or CodeGuessedUnsuccessfully event", async function () {
            const { mastermind, owner, addr1 } = await loadFixture(deployMastermindFixture);
            const depositAmount = ethers.utils.parseEther("1.0");
            const secretHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("RGBY"));

            await mastermind.createGame({ value: depositAmount });
            await mastermind.connect(addr1).joinGame(1, { value: depositAmount });
            await mastermind.connect(owner).startGame(1);
            await mastermind.connect(owner).commitSecretCode(1, secretHash);
            await mastermind.connect(addr1).makeGuess(1, "RGBY");

            await expect(mastermind.connect(owner).giveFeedback(1, 4, 0))
                .to.emit(mastermind, "CodeGuessedSuccessfully");

            const game = await mastermind.games(1);
            expect(game.currentTurnFeedbacks[0].correctColorAndPositionFeedback).to.equal(4);
            expect(game.currentTurnFeedbacks[0].correctColorWrongPositionFeedback).to.equal(0);
            expect(game.phase).to.equal(3); // Reveal
        });

        it("Should reveal code and emit CodeRevealed event", async function () {
            const { mastermind, owner, addr1 } = await loadFixture(deployMastermindFixture);
            const depositAmount = ethers.utils.parseEther("1.0");
            const secretHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("RGBY"));

            await mastermind.createGame({ value: depositAmount });
            await mastermind.connect(addr1).joinGame(1, { value: depositAmount });
            await mastermind.connect(owner).startGame(1);
            await mastermind.connect(owner).commitSecretCode(1, secretHash);
            await mastermind.connect(addr1).makeGuess(1, "RGBY");
            await mastermind.connect(owner).giveFeedback(1, 4, 0);

            await expect(mastermind.connect(owner).revealCode(1, "RGBY"))
                .to.emit(mastermind, "CodeRevealed")
                .withArgs(1, "RGBY");

            const game = await mastermind.games(1);
            expect(game.secretCode).to.equal("RGBY");
            expect(game.phase).to.equal(4); // WaitingForDispute
        });

        it("Should handle disputes correctly and emit DisputeVerdict event", async function () {
            const { mastermind, owner, addr1 } = await loadFixture(deployMastermindFixture);
            const depositAmount = ethers.utils.parseEther("1.0");
            const secretHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("RGBY"));

            await mastermind.createGame({ value: depositAmount });
            await mastermind.connect(addr1).joinGame(1, { value: depositAmount });
            await mastermind.connect(owner).startGame(1);
            await mastermind.connect(owner).commitSecretCode(1, secretHash);
            await mastermind.connect(addr1).makeGuess(1, "RGBY");
            await mastermind.connect(owner).giveFeedback(1, 4, 0);
            await mastermind.connect(owner).revealCode(1, "RGBY");

            await expect(mastermind.connect(addr1).dispute(1, 0))
                .to.emit(mastermind, "DisputeVerdict");

            const game = await mastermind.games(1);
            expect(game.state).to.equal(3); // Ended
        });

        it("Should end game and compute winner correctly", async function () {
            const { mastermind, owner, addr1 } = await loadFixture(deployMastermindFixture);
            const depositAmount = ethers.utils.parseEther("1.0");
            const secretHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("RGBY"));

            await mastermind.createGame({ value: depositAmount });
            await mastermind.connect(addr1).joinGame(1, { value: depositAmount });
            await mastermind.connect(owner).startGame(1);
            await mastermind.connect(owner).commitSecretCode(1, secretHash);
            await mastermind.connect(addr1).makeGuess(1, "RGBY");
            await mastermind.connect(owner).giveFeedback(1, 4, 0);
            await mastermind.connect(owner).revealCode(1, "RGBY");

            await mastermind.connect(addr1).dontDispute(1);
            await mastermind.connect(owner).commitSecretCode(1, secretHash);
            await mastermind.connect(addr1).makeGuess(1, "RGBY");
            await mastermind.connect(owner).giveFeedback(1, 4, 0);
            await mastermind.connect(owner).revealCode(1, "RGBY");

            const game = await mastermind.games(1);
            expect(game.state).to.equal(3); // Ended

            const winner = await mastermind.winner(1);
            expect(winner).to.equal(owner.address);
        });
    });
});
