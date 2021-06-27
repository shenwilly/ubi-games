import { ethers } from "hardhat";
import chai from "chai";
import {
  LinkToken,
  LinkToken__factory,
  UbiGamesOracle,
  UbiGamesOracle__factory,
  VRFCoordinatorMock__factory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Logger, parseUnits } from "ethers/lib/utils";

const { expect } = chai;
const { expectRevert } = require("@openzeppelin/test-helpers");
Logger.setLogLevel(Logger.levels.ERROR); // LINK double Transfer event log

describe("UbiGamesOracle", () => {
  let owner: SignerWithAddress, stranger: SignerWithAddress;
  let ownerAddress: string, strangerAddress: string;

  let oracle: UbiGamesOracle;
  let link: LinkToken;

  beforeEach(async () => {
    [owner, stranger] = await ethers.getSigners();
    ownerAddress = owner.address;
    strangerAddress = stranger.address;

    const LinkTokenFactory = (await ethers.getContractFactory(
      "LinkToken",
      owner
    )) as LinkToken__factory;
    link = await LinkTokenFactory.connect(owner).deploy();

    const VRFCoordinatorFactory = (await ethers.getContractFactory(
      "VRFCoordinatorMock",
      owner
    )) as VRFCoordinatorMock__factory;
    const vrfCoordinator = await VRFCoordinatorFactory.connect(owner).deploy(
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
  });

  describe("setRegisteredContract()", async () => {
    it("should revert if not called by owner", async () => {
      await expectRevert(
        oracle.connect(stranger).setRegistered(strangerAddress, true),
        "Ownable: caller is not the owner"
      );
    });
    it("should register if called by owner", async () => {
      expect(await oracle.registered(ownerAddress)).to.be.eq(false);
      await oracle.connect(owner).setRegistered(ownerAddress, true);
      expect(await oracle.registered(ownerAddress)).to.be.eq(true);
    });
  });

  describe("requestRandomNumber()", async () => {
    it("should revert if not called by registered address", async () => {
      expect(await oracle.registered(strangerAddress)).to.be.eq(false);
      await expectRevert(
        oracle.connect(stranger).requestRandomNumber(),
        "Sender not registered"
      );
    });
    it("should revert if there is not enough LINK to cover fee", async () => {
      await oracle.connect(owner).setRegistered(ownerAddress, true);
      const oracleLinkBalance = await link.balanceOf(oracle.address);
      const oracleFee = await oracle.fee();
      expect(oracleLinkBalance.lt(oracleFee));
      await expectRevert(
        oracle.connect(owner).requestRandomNumber(),
        "Not enough LINK - fill contract with faucet"
      );
    });
    it("should return add sender to requests", async () => {
      await oracle.connect(owner).setRegistered(ownerAddress, true);
      await link.connect(owner).transfer(oracle.address, parseUnits("1", 18));

      const oracleLinkBalance = await link.balanceOf(oracle.address);
      const oracleFee = await oracle.fee();
      expect(oracleFee.gte(0));
      expect(oracleLinkBalance.gte(oracleFee));

      expect(await oracle.connect(owner).requestRandomNumber()).to.be.ok;
      expect(await link.balanceOf(oracle.address)).to.be.lt(oracleLinkBalance);
    });
  });

  describe("fulfillRandomness()", async () => {
    it("should count up", async () => {
      // await counter.countUp();
      // let count = await counter.getCount();expect(count).to.eq(1);
    });
  });

  describe("withdrawLINK()", async () => {
    it("should revert if not called by owner", async () => {
      await expectRevert(
        oracle.connect(stranger).withdrawLINK(),
        "Ownable: caller is not the owner"
      );
    });

    it("should withdraw all LINK balance from contract", async () => {
      await link.connect(owner).transfer(oracle.address, parseUnits("1", 18));
      const oracleLinkBalance = await link.balanceOf(oracle.address);
      const ownerLinkBalance = await link.balanceOf(owner.address);

      expect(await link.balanceOf(oracle.address)).to.be.gt(0);
      await oracle.connect(owner).withdrawLINK();
      expect(await link.balanceOf(oracle.address)).to.be.eq(0);

      expect(await link.balanceOf(owner.address)).to.be.eq(
        ownerLinkBalance.add(oracleLinkBalance)
      );
    });
  });
});
