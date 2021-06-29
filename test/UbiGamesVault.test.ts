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

const { expect } = chai;
const { expectRevert } = require("@openzeppelin/test-helpers");
Logger.setLogLevel(Logger.levels.ERROR); // LINK double Transfer event log

describe("UbiGamesVault", () => {
  let owner: SignerWithAddress, game: SignerWithAddress;
  let ownerAddress: string, gameAddress: string;

  let ubiroll: Ubiroll;
  let oracle: UbiGamesOracle;
  let vault: UbiGamesVault;
  let vrfCoordinator: VRFCoordinatorMock;
  let link: LinkToken;
  let ubi: ERC20Mock;

  beforeEach(async () => {
    [owner, game] = await ethers.getSigners();
    ownerAddress = owner.address;
    gameAddress = game.address;

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

  describe("gameDeposit()", async () => {
    it("should revert if game is not registered", async () => {
      await expectRevert(
        vault.connect(game).gameDeposit(gameAddress, 1),
        "Game not registered"
      );
    });
    it("should revert if token balance is not enough", async () => {
      await vault.connect(owner).setRegisteredGame(gameAddress, true);
      await expectRevert(
        vault.connect(game).gameDeposit(gameAddress, 1),
        "ERC20: transfer amount exceeds balance"
      );
    });
    it("should revert if token allowance is not enough", async () => {
      await vault.connect(owner).setRegisteredGame(gameAddress, true);
      await ubi.mint(gameAddress, parseUnits("1", 18));
      await expectRevert(
        vault.connect(game).gameDeposit(gameAddress, parseUnits("1", 18)),
        "ERC20: transfer amount exceeds allowance"
      );
    });
    it("should deposit ubi and add pendingBurn", async () => {
      const vaultUbiBalance = await ubi.balanceOf(vault.address);
      const depositAmount = parseUnits("1", 18);
      const pendingBurn = await vault.pendingBurn();
      const burnPercentage = await vault.burnPercentage();
      const pendingAmount = depositAmount.mul(burnPercentage).div(100);
      await vault.connect(owner).setRegisteredGame(gameAddress, true);
      await ubi.mint(gameAddress, depositAmount);
      await ubi.connect(game).approve(vault.address, depositAmount);
      await vault.connect(game).gameDeposit(gameAddress, depositAmount);
      expect(await ubi.balanceOf(vault.address)).to.be.eq(
        vaultUbiBalance.add(depositAmount)
      );
      expect(await vault.pendingBurn()).to.be.eq(
        pendingBurn.add(pendingAmount)
      );
    });
  });

  describe("gameWithdraw()", async () => {
    it("should revert if game is not registered", async () => {
      await expectRevert(
        vault.connect(game).gameWithdraw(gameAddress, 1),
        "Game not registered"
      );
    });
    it("should withdraw ubi", async () => {
      const gameUbiBalance = await ubi.balanceOf(gameAddress);
      const amount = parseUnits("1", 18);

      await vault.connect(owner).setRegisteredGame(gameAddress, true);
      await ubi.mint(vault.address, amount);
      const vaultUbiBalance = await ubi.balanceOf(vault.address);

      await vault.connect(game).gameWithdraw(gameAddress, amount);
      expect(await ubi.balanceOf(vault.address)).to.be.eq(
        vaultUbiBalance.sub(amount)
      );
      expect(await ubi.balanceOf(gameAddress)).to.be.eq(
        gameUbiBalance.add(amount)
      );
    });
  });

  describe("burnUbi()", async () => {
    it("should revert if pending burn is 0", async () => {
      expect(await vault.pendingBurn()).to.be.eq(0);
      await expectRevert(vault.burnUbi(), "Nothing to burn");
    });
    it("should burn ubi", async () => {
      const amount = parseUnits("1", 18);
      await vault.connect(owner).setRegisteredGame(gameAddress, true);
      await ubi.mint(gameAddress, amount);
      await ubi.connect(game).approve(vault.address, amount);
      await vault.connect(game).gameDeposit(gameAddress, amount);
      const pendingBurn = await vault.pendingBurn();
      expect(await ubi.balanceOf(vault.address)).to.be.gt(0);
      await vault.burnUbi();
      expect(await ubi.balanceOf(vault.address)).to.be.eq(
        amount.sub(pendingBurn)
      );
    });
  });

  describe("withdrawUbi()", async () => {
    it("should revert if not called by owner", async () => {
      await expectRevert(
        vault.connect(game).withdrawUbi(1),
        "Ownable: caller is not the owner"
      );
    });
    it("should withdraw ubi if called by owner", async () => {
      const amount = parseUnits("1", 18);
      await ubi.mint(vault.address, amount);
      const vaultUbiBalance = await ubi.balanceOf(vault.address);
      const ownerUbiBalance = await ubi.balanceOf(ownerAddress);
      await vault.withdrawUbi(amount);
      expect(await ubi.balanceOf(vault.address)).to.be.eq(
        vaultUbiBalance.sub(amount)
      );
      expect(await ubi.balanceOf(ownerAddress)).to.be.eq(
        ownerUbiBalance.add(amount)
      );
    });
  });

  describe("setRegisteredGame()", async () => {
    it("should revert if not called by owner", async () => {
      await expectRevert(
        oracle.connect(game).setRegistered(gameAddress, true),
        "Ownable: caller is not the owner"
      );
    });
    it("should register if called by owner", async () => {
      expect(await vault.registeredGames(gameAddress)).to.be.eq(false);
      await vault.connect(owner).setRegisteredGame(gameAddress, true);
      expect(await vault.registeredGames(gameAddress)).to.be.eq(true);
    });
  });

  describe("setUbi()", async () => {
    it("should revert if not called by owner", async () => {
      await expectRevert(
        vault.connect(game).setUbi(ubi.address),
        "Ownable: caller is not the owner"
      );
    });
    it("should set new Ubi address if called by owner", async () => {
      const oldUbi = await vault.ubi();
      const newUbi = gameAddress;
      expect(oldUbi).to.be.not.eq(newUbi);
      await vault.connect(owner).setUbi(newUbi);
      expect(await vault.ubi()).to.be.eq(newUbi);
    });
  });

  describe("setBurnPercentage()", async () => {
    it("should revert if not called by owner", async () => {
      await expectRevert(
        vault.connect(game).setBurnPercentage(0),
        "Ownable: caller is not the owner"
      );
    });
    it("should set new burn percentage if called by owner", async () => {
      const oldPercentage = await vault.burnPercentage();
      const newPercentage = 20;
      expect(oldPercentage).to.be.not.eq(newPercentage);
      await vault.connect(owner).setBurnPercentage(newPercentage);
      expect(await vault.burnPercentage()).to.be.eq(newPercentage);
    });
  });
});
