import { ethers } from "hardhat";
import chai from "chai";
import {
  ERC20Mock,
  ERC20Mock__factory,
  LinkToken,
  LinkToken__factory,
  UbiGamesOracle,
  UbiGamesOracle__factory,
  UbiGamesVault,
  UbiGamesVault__factory,
  Ubiroll,
  Ubiroll__factory,
  VRFCoordinatorMock,
  VRFCoordinatorMock__factory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Logger, parseUnits } from "ethers/lib/utils";
import { BigNumber } from "ethers";

const { expect } = chai;
const { expectRevert } = require("@openzeppelin/test-helpers");
Logger.setLogLevel(Logger.levels.ERROR); // LINK double Transfer event log

describe("Ubiroll", () => {
  let owner: SignerWithAddress,
    player: SignerWithAddress,
    burner: SignerWithAddress;
  let ownerAddress: string, playerAddress: string, burnerAddress: string;

  let ubiroll: Ubiroll;
  let oracle: UbiGamesOracle;
  let vault: UbiGamesVault;
  let vrfCoordinator: VRFCoordinatorMock;
  let link: LinkToken;
  let ubi: ERC20Mock;

  const distributeUBIAndApprove = async () => {
    await ubi.connect(owner).mint(vault.address, parseUnits("10000", 18));
    await ubi.connect(owner).mint(playerAddress, parseUnits("10", 18));
    await ubi.connect(player).approve(vault.address, parseUnits("10", 18));
  };

  beforeEach(async () => {
    [owner, player, burner] = await ethers.getSigners();
    ownerAddress = owner.address;
    playerAddress = player.address;
    burnerAddress = burner.address;

    const LinkTokenFactory = (await ethers.getContractFactory(
      "LinkToken",
      owner
    )) as LinkToken__factory;
    link = await LinkTokenFactory.connect(owner).deploy();

    const ERC20MockFactory = (await ethers.getContractFactory(
      "ERC20Mock",
      owner
    )) as ERC20Mock__factory;
    ubi = await ERC20MockFactory.connect(owner).deploy(
      "UBI",
      "UBI",
      ownerAddress,
      parseUnits("1000", 18)
    );

    const VRFCoordinatorFactory = (await ethers.getContractFactory(
      "VRFCoordinatorMock",
      owner
    )) as VRFCoordinatorMock__factory;
    vrfCoordinator = await VRFCoordinatorFactory.connect(owner).deploy(
      link.address
    );

    const OracleFactory = (await ethers.getContractFactory(
      "UbiGamesOracle",
      owner
    )) as UbiGamesOracle__factory;
    oracle = await OracleFactory.connect(owner).deploy(
      vrfCoordinator.address,
      link.address,
      "0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f3",
      parseUnits("0.1", 18)
    );

    const VaultFactory = (await ethers.getContractFactory(
      "UbiGamesVault",
      owner
    )) as UbiGamesVault__factory;
    vault = await VaultFactory.connect(owner).deploy(ubi.address, 25);

    const UbirollFactory = (await ethers.getContractFactory(
      "Ubiroll",
      owner
    )) as Ubiroll__factory;
    ubiroll = await UbirollFactory.connect(owner).deploy(
      oracle.address,
      vault.address
    );

    await oracle.connect(owner).setRegistered(ubiroll.address, true);
    await vault.connect(owner).setRegisteredGame(ubiroll.address, true);
    await link.connect(owner).transfer(oracle.address, parseUnits("100", 18));
  });

  describe("createBet()", async () => {
    it("should revert if game is paused", async () => {
      await ubiroll.connect(owner).setGamePause(true);
      await expectRevert(
        ubiroll.connect(player).createBet(50, 1),
        "Game is paused"
      );
    });
    it("should revert if amount is 0", async () => {
      await expectRevert(
        ubiroll.connect(player).createBet(50, 0),
        "Bet amount must be greater than 0"
      );
    });
    it("should revert if chance is 0", async () => {
      await expectRevert(
        ubiroll.connect(player).createBet(0, 1),
        "Winning chance must be greater than 0"
      );
    });
    it("should revert if chance + houseEdge are greater than 99", async () => {
      await expectRevert(
        ubiroll.connect(player).createBet(101, 1),
        "Winning chance must be lower"
      );

      const houseEdge = await ubiroll.houseEdge();
      const chance = 100 - houseEdge;
      await expectRevert(
        ubiroll.connect(player).createBet(chance, 1),
        "Winning chance must be lower"
      );
    });
    it("should revert if bet prize is higher than maxPrize", async () => {
      await expectRevert(
        ubiroll.connect(player).createBet(1, 1),
        "Prize must be lower than maxPrize"
      );

      await distributeUBIAndApprove();

      const maxPrize = await ubiroll.maxPrize();
      const chance = 1;
      const amountAllowed = parseUnits("1", 18);
      const amountNotAllowed = parseUnits("2", 18);

      const prizeAllowed = await ubiroll.calculatePrize(chance, amountAllowed);
      expect(prizeAllowed).lt(maxPrize);
      expect(await ubiroll.connect(player).createBet(chance, amountAllowed)).to
        .be.ok;
      const prizeNotAllowed = await ubiroll.calculatePrize(
        chance,
        amountNotAllowed
      );

      expect(prizeNotAllowed).gt(maxPrize);
      await expectRevert(
        ubiroll.connect(player).createBet(chance, amountNotAllowed),
        "Prize must be lower than maxPrize"
      );
    });
    it("should revert if oracle can't request randomness", async () => {
      await distributeUBIAndApprove();

      await oracle.connect(owner).withdrawLINK();
      await expectRevert(
        ubiroll.connect(player).createBet(1, parseUnits("1", 18)),
        "Not enough LINK - fill contract with faucet"
      );
    });
    it("should succesfully create bet", async () => {
      await distributeUBIAndApprove();

      const chance = 1;
      const amount = parseUnits("1", 18);
      const tx = await ubiroll.connect(player).createBet(chance, amount);
      const receipt = await tx.wait();
      const betEvent = receipt.events!.filter(
        (event) => event.event == "BetCreated"
      )[0];
      expect(betEvent.args![1] == playerAddress);
      expect(betEvent.args![2] == chance);
      expect(betEvent.args![3] == amount);
    });
  });

  describe("finalizeBet()", async () => {
    it("should revert if not called by oracle", async () => {
      await expectRevert(
        ubiroll
          .connect(player)
          .finalizeBet(
            "0x02a78c06fd8389fd861eb5aa94d9a9284e348c2a586b4a8b6735eee4bf19850e",
            1
          ),
        "Sender must be oracle"
      );
    });
    it("should revert if bet doesn't exist", async () => {
      await ubiroll.setOracle(ownerAddress);
      await expectRevert(
        ubiroll
          .connect(owner)
          .finalizeBet(
            "0x02a78c06fd8389fd861eb5aa94d9a9284e348c2a586b4a8b6735eee4bf19850e",
            1
          ),
        "invalid opcode"
      );
    });
    it("should succesfully finalise losing bet", async () => {
      await distributeUBIAndApprove();
      const tx = await ubiroll
        .connect(player)
        .createBet(1, parseUnits("1", 18));
      const receipt = await tx.wait();
      const betEvent = receipt.events!.filter(
        (event) => event.event == "BetCreated"
      )[0];
      const betId = betEvent.args![0];
      const requestId = betEvent.args![4];

      await vrfCoordinator.callBackWithRandomness(requestId, 1, oracle.address);
      const bet = await ubiroll.bets(betId);
      expect(bet[3]).to.be.gt(bet[2]); // result > chance, player lose
      expect(bet[6]).to.be.true; // finished
      expect(bet[7]).to.be.eq(requestId);
    });
    it("should succesfully finalise winning bet and transfer prize", async () => {
      await distributeUBIAndApprove();
      const chance = 1;
      const betAmount = parseUnits("1", 18);
      const tx = await ubiroll.connect(player).createBet(chance, betAmount);
      const receipt = await tx.wait();
      const betEvent = receipt.events!.filter(
        (event) => event.event == "BetCreated"
      )[0];
      const betId = betEvent.args![0];
      const requestId = betEvent.args![4];

      const playerUbiBalance = await ubi.balanceOf(playerAddress);

      await vrfCoordinator.callBackWithRandomness(requestId, 0, oracle.address);
      const bet = await ubiroll.bets(betId);
      expect(bet[3]).to.be.lte(bet[2]); // result <= chance, player win
      expect(bet[6]).to.be.true; // finished
      expect(bet[7]).to.be.eq(requestId);

      const expectedPrize = await ubiroll.calculatePrize(chance, betAmount);
      expect(await ubi.balanceOf(playerAddress)).to.be.eq(
        playerUbiBalance.add(expectedPrize)
      );
    });
  });

  describe("maxPrize()", async () => {
    it("should return maxPrize", async () => {
      await ubi.mint(vault.address, parseUnits("100", 18));
      const ubiBalance = await ubi.balanceOf(vault.address);
      const maxPrize = ubiBalance.div(100); // 1% of balance
      expect(await ubiroll.maxPrize()).to.be.eq(maxPrize);
    });
  });

  describe("calculatePrize()", async () => {
    const calculatePrize = (
      chance: number,
      amount: BigNumber,
      houseEdge: number
    ) => {
      return amount.mul(BigNumber.from(100).sub(houseEdge)).div(chance);
    };

    it("should return correct prize", async () => {
      expect(calculatePrize(50, BigNumber.from(1), 0)).to.be.eq(2);
      expect(calculatePrize(50, BigNumber.from(100), 1)).to.be.eq(198);

      const amount = BigNumber.from(100);
      await ubiroll.connect(owner).setHouseEdge(0);
      expect(await ubiroll.calculatePrize(50, amount)).to.be.eq(
        calculatePrize(50, amount, 0)
      );
      expect(await ubiroll.calculatePrize(98, amount)).to.be.eq(
        calculatePrize(98, amount, 0)
      );
      expect(await ubiroll.calculatePrize(1, amount)).to.be.eq(
        calculatePrize(1, amount, 0)
      );

      await ubiroll.connect(owner).setHouseEdge(1);
      expect(await ubiroll.calculatePrize(50, amount)).to.be.eq(
        calculatePrize(50, amount, 1)
      );
      expect(await ubiroll.calculatePrize(98, amount)).to.be.eq(
        calculatePrize(98, amount, 1)
      );
      expect(await ubiroll.calculatePrize(1, amount)).to.be.eq(
        calculatePrize(1, amount, 1)
      );

      await ubiroll.connect(owner).setHouseEdge(5);
      expect(await ubiroll.calculatePrize(50, amount)).to.be.eq(
        calculatePrize(50, amount, 5)
      );
      expect(await ubiroll.calculatePrize(98, amount)).to.be.eq(
        calculatePrize(98, amount, 5)
      );
      expect(await ubiroll.calculatePrize(1, amount)).to.be.eq(
        calculatePrize(1, amount, 5)
      );
    });
  });

  describe("setOracle()", async () => {
    it("should revert if not called by owner", async () => {
      await expectRevert(
        ubiroll.connect(player).setOracle(playerAddress),
        "Ownable: caller is not the owner"
      );
    });
    it("should set new oracle address if called by owner", async () => {
      const oldUbi = await ubiroll.oracle();
      const newOracle = playerAddress;
      expect(oldUbi).to.be.not.eq(newOracle);
      await ubiroll.connect(owner).setOracle(newOracle);
      expect(await ubiroll.oracle()).to.be.eq(newOracle);
    });
  });
  describe("setGamePause()", async () => {
    it("should revert if not called by owner", async () => {
      await expectRevert(
        ubiroll.connect(player).setGamePause(true),
        "Ownable: caller is not the owner"
      );
    });
    it("should set new oracle address if called by owner", async () => {
      const gamePaused = await ubiroll.gamePaused();
      await ubiroll.connect(owner).setGamePause(!gamePaused);
      expect(await ubiroll.gamePaused()).to.be.eq(!gamePaused);
    });
  });
  describe("setHouseEdge()", async () => {
    it("should revert if not called by owner", async () => {
      await expectRevert(
        ubiroll.connect(player).setHouseEdge(1),
        "Ownable: caller is not the owner"
      );
    });
    it("should set houseEdge if called by owner", async () => {
      const oldHouseEdge = await ubiroll.houseEdge();
      const newHouseEdge = 2;
      expect(oldHouseEdge).to.be.not.eq(newHouseEdge);
      await ubiroll.connect(owner).setHouseEdge(newHouseEdge);
      expect(await ubiroll.houseEdge()).to.be.eq(newHouseEdge);
    });
  });
});
