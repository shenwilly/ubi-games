import { ethers } from "hardhat";
import chai from "chai";
import {
  ERC20Mock,
  ERC20Mock__factory,
  LinkToken,
  LinkToken__factory,
  UbiGamesOracle,
  UbiGamesOracle__factory,
  Ubiroll,
  Ubiroll__factory,
  VRFCoordinatorMock,
  VRFCoordinatorMock__factory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Logger, parseUnits } from "ethers/lib/utils";

const { expect } = chai;
const { expectRevert } = require("@openzeppelin/test-helpers");
Logger.setLogLevel(Logger.levels.ERROR); // LINK double Transfer event log

describe("Ubiroll", () => {
  let owner: SignerWithAddress, player: SignerWithAddress;
  let ownerAddress: string, playerAddress: string;

  let ubiroll: Ubiroll;
  let oracle: UbiGamesOracle;
  let vrfCoordinator: VRFCoordinatorMock;
  let link: LinkToken;
  let ubi: ERC20Mock;

  beforeEach(async () => {
    [owner, player] = await ethers.getSigners();
    ownerAddress = owner.address;
    playerAddress = player.address;

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

    const UbirollFactory = (await ethers.getContractFactory(
      "Ubiroll",
      owner
    )) as Ubiroll__factory;
    ubiroll = await UbirollFactory.connect(owner).deploy(
      ubi.address,
      oracle.address
    );

    await oracle.connect(owner).setRegistered(ubiroll.address, true);
    await link.connect(owner).transfer(oracle.address, parseUnits("100", 18));
  });

  describe("createBet()", async () => {
    const distributeUBIAndApprove = async () => {
      await ubi.connect(owner).mint(ubiroll.address, parseUnits("10000", 18));
      await ubi.connect(owner).mint(playerAddress, parseUnits("10", 18));
      await ubi.connect(player).approve(ubiroll.address, parseUnits("10", 18));
    };

    it("should revert if contract is paused", async () => {
      await ubiroll.connect(owner).setGamePause(true);
      await expectRevert(
        ubiroll.connect(player).createBet(50, 1),
        "Game is paused"
      );
    });
    it("should revert if amount is 0", async () => {
      await expectRevert(
        ubiroll.connect(player).createBet(50, 0),
        "bet amount must be greater than 0"
      );
    });
    it("should revert if chance is 0", async () => {
      await expectRevert(
        ubiroll.connect(player).createBet(0, 1),
        "winning chance must be greater than 0"
      );
    });
    it("should revert if chance + houseEdge are greater than 99", async () => {
      await expectRevert(
        ubiroll.connect(player).createBet(101, 1),
        "winning chance must be lower"
      );

      const houseEdge = await ubiroll.houseEdge();
      const chance = 100 - houseEdge;
      await expectRevert(
        ubiroll.connect(player).createBet(chance, 1),
        "winning chance must be lower"
      );
    });
    it("should revert if bet prize is higher than maxPrize", async () => {
      await expectRevert(
        ubiroll.connect(player).createBet(1, 1),
        "prize must be lower than maxPrize"
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
        "prize must be lower than maxPrize"
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
    it("should revert if not called by owner", async () => {
      // await expectRevert(
      //   oracle.connect(stranger).setRegistered(strangerAddress, true),
      //   "Ownable: caller is not the owner"
      // );
    });
  });

  describe("withdrawToken()", async () => {
    it("should revert if not called by owner", async () => {
      // await expectRevert(
      //   oracle.connect(stranger).setRegistered(strangerAddress, true),
      //   "Ownable: caller is not the owner"
      // );
    });
  });

  describe("maxPrize()", async () => {
    it("should revert if not called by owner", async () => {
      // await expectRevert(
      //   oracle.connect(stranger).setRegistered(strangerAddress, true),
      //   "Ownable: caller is not the owner"
      // );
    });
  });

  describe("calculatePrize()", async () => {
    it("should revert if not called by owner", async () => {
      // await expectRevert(
      //   oracle.connect(stranger).setRegistered(strangerAddress, true),
      //   "Ownable: caller is not the owner"
      // );
    });
  });

  describe("setUbi()", async () => {
    it("should revert if not called by owner", async () => {
      // await expectRevert(
      //   oracle.connect(stranger).setRegistered(strangerAddress, true),
      //   "Ownable: caller is not the owner"
      // );
    });
  });
  describe("setOracle()", async () => {
    it("should revert if not called by owner", async () => {
      // await expectRevert(
      //   oracle.connect(stranger).setRegistered(strangerAddress, true),
      //   "Ownable: caller is not the owner"
      // );
    });
  });
  describe("setGamePause()", async () => {
    it("should revert if not called by owner", async () => {
      // await expectRevert(
      //   oracle.connect(stranger).setRegistered(strangerAddress, true),
      //   "Ownable: caller is not the owner"
      // );
    });
  });
  describe("setHouseEdge()", async () => {
    it("should revert if not called by owner", async () => {
      // await expectRevert(
      //   oracle.connect(stranger).setRegistered(strangerAddress, true),
      //   "Ownable: caller is not the owner"
      // );
    });
  });
});
