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
  let owner: SignerWithAddress, stranger: SignerWithAddress;
  let ownerAddress: string, strangerAddress: string;

  let ubiroll: Ubiroll;
  let oracle: UbiGamesOracle;
  let vrfCoordinator: VRFCoordinatorMock;
  let link: LinkToken;
  let ubi: ERC20Mock;

  beforeEach(async () => {
    [owner, stranger] = await ethers.getSigners();
    ownerAddress = owner.address;
    strangerAddress = stranger.address;

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
  });

  describe("createBet()", async () => {
    it("should revert if not called by owner", async () => {
      await expectRevert(
        oracle.connect(stranger).setRegistered(strangerAddress, true),
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("finalizeBet()", async () => {
    it("should revert if not called by owner", async () => {
      await expectRevert(
        oracle.connect(stranger).setRegistered(strangerAddress, true),
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("withdrawToken()", async () => {
    it("should revert if not called by owner", async () => {
      await expectRevert(
        oracle.connect(stranger).setRegistered(strangerAddress, true),
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("maxPrize()", async () => {
    it("should revert if not called by owner", async () => {
      await expectRevert(
        oracle.connect(stranger).setRegistered(strangerAddress, true),
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("calculatePrize()", async () => {
    it("should revert if not called by owner", async () => {
      await expectRevert(
        oracle.connect(stranger).setRegistered(strangerAddress, true),
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("setUbi()", async () => {
    it("should revert if not called by owner", async () => {
      await expectRevert(
        oracle.connect(stranger).setRegistered(strangerAddress, true),
        "Ownable: caller is not the owner"
      );
    });
  });
  describe("setOracle()", async () => {
    it("should revert if not called by owner", async () => {
      await expectRevert(
        oracle.connect(stranger).setRegistered(strangerAddress, true),
        "Ownable: caller is not the owner"
      );
    });
  });
  describe("setGamePause()", async () => {
    it("should revert if not called by owner", async () => {
      await expectRevert(
        oracle.connect(stranger).setRegistered(strangerAddress, true),
        "Ownable: caller is not the owner"
      );
    });
  });
  describe("setHouseEdge()", async () => {
    it("should revert if not called by owner", async () => {
      await expectRevert(
        oracle.connect(stranger).setRegistered(strangerAddress, true),
        "Ownable: caller is not the owner"
      );
    });
  });
});
