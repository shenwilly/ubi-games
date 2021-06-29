// import { ethers } from "hardhat";
// import chai from "chai";
// import {
//   ERC20Mock,
//   ERC20Mock__factory,
//   LinkToken,
//   LinkToken__factory,
//   UbiGamesOracle,
//   UbiGamesOracle__factory,
//   UbiGamesVault,
//   UbiGamesVault__factory,
//   Ubiroll,
//   Ubiroll__factory,
//   VRFCoordinatorMock,
//   VRFCoordinatorMock__factory,
// } from "../typechain";
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import { Logger, parseUnits } from "ethers/lib/utils";
// import { BigNumber } from "ethers";

// const { expect } = chai;
// const { expectRevert } = require("@openzeppelin/test-helpers");
// Logger.setLogLevel(Logger.levels.ERROR); // LINK double Transfer event log

// describe("UbiGamesVault", () => {
//   let owner: SignerWithAddress,
//     player: SignerWithAddress,
//     burner: SignerWithAddress;
//   let ownerAddress: string, playerAddress: string, burnerAddress: string;

//   let ubiroll: Ubiroll;
//   let oracle: UbiGamesOracle;
//   let vault: UbiGamesVault;
//   let vrfCoordinator: VRFCoordinatorMock;
//   let link: LinkToken;
//   let ubi: ERC20Mock;

//   beforeEach(async () => {
//     [owner, player, burner] = await ethers.getSigners();
//     ownerAddress = owner.address;
//     playerAddress = player.address;
//     burnerAddress = burner.address;

//     const LinkTokenFactory = (await ethers.getContractFactory(
//       "LinkToken",
//       owner
//     )) as LinkToken__factory;
//     link = await LinkTokenFactory.connect(owner).deploy();

//     const ERC20MockFactory = (await ethers.getContractFactory(
//       "ERC20Mock",
//       owner
//     )) as ERC20Mock__factory;
//     ubi = await ERC20MockFactory.connect(owner).deploy(
//       "UBI",
//       "UBI",
//       ownerAddress,
//       parseUnits("1000", 18)
//     );

//     const VRFCoordinatorFactory = (await ethers.getContractFactory(
//       "VRFCoordinatorMock",
//       owner
//     )) as VRFCoordinatorMock__factory;
//     vrfCoordinator = await VRFCoordinatorFactory.connect(owner).deploy(
//       link.address
//     );

//     const OracleFactory = (await ethers.getContractFactory(
//       "UbiGamesOracle",
//       owner
//     )) as UbiGamesOracle__factory;
//     oracle = await OracleFactory.connect(owner).deploy(
//       vrfCoordinator.address,
//       link.address,
//       "0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f3",
//       parseUnits("0.1", 18)
//     );

//     const VaultFactory = (await ethers.getContractFactory(
//       "UbiGamesVault",
//       owner
//     )) as UbiGamesVault__factory;
//     vault = await VaultFactory.connect(owner).deploy(
//       ubi.address,
//       burnerAddress,
//       25
//     );

//     const UbirollFactory = (await ethers.getContractFactory(
//       "Ubiroll",
//       owner
//     )) as Ubiroll__factory;
//     ubiroll = await UbirollFactory.connect(owner).deploy(
//       oracle.address,
//       vault.address
//     );

//     await oracle.connect(owner).setRegistered(ubiroll.address, true);
//     await vault.connect(owner).setRegisteredGame(ubiroll.address, true);
//     await link.connect(owner).transfer(oracle.address, parseUnits("100", 18));
//   });

//   describe("gameDeposit()", async () => {
//     it("should revert if game is paused", async () => {
//       await ubiroll.connect(owner).setGamePause(true);
//       await expectRevert(
//         ubiroll.connect(player).createBet(50, 1),
//         "Game is paused"
//       );
//     });
//     it("should revert if amount is 0", async () => {
//       await expectRevert(
//         ubiroll.connect(player).createBet(50, 0),
//         "bet amount must be greater than 0"
//       );
//     });
//   });

//   describe("gameWithdraw()", async () => {
//     it("should revert if not called by oracle", async () => {
//       await expectRevert(
//         ubiroll
//           .connect(player)
//           .finalizeBet(
//             "0x02a78c06fd8389fd861eb5aa94d9a9284e348c2a586b4a8b6735eee4bf19850e",
//             1
//           ),
//         "Sender must be oracle"
//       );
//     });
//   });

//   describe("burnUbi()", async () => {
//     it("should revert if not called by owner", async () => {
//       await expectRevert(
//         ubiroll.connect(player).withdrawToken(ubi.address, 1),
//         "Ownable: caller is not the owner"
//       );
//     });
//     it("should withdraw token if called by owner", async () => {
//       const ownerUbiBalance = await ubi.balanceOf(ownerAddress);
//       await ubi.connect(owner).mint(ubiroll.address, parseUnits("1", 18));
//       const contractUbiBalance = await ubi.balanceOf(ubiroll.address);
//       expect(contractUbiBalance).to.be.gt(0);
//       await ubiroll
//         .connect(owner)
//         .withdrawToken(ubi.address, contractUbiBalance),
//         expect(await ubi.balanceOf(ubiroll.address)).to.be.eq(0);
//       expect(await ubi.balanceOf(ownerAddress)).to.be.eq(
//         ownerUbiBalance.add(contractUbiBalance)
//       );
//     });
//   });

//   describe("withdrawUbi()", async () => {
//     it("should revert if not called by owner", async () => {
//       await expectRevert(
//         ubiroll.connect(player).withdrawToken(ubi.address, 1),
//         "Ownable: caller is not the owner"
//       );
//     });
//     it("should withdraw token if called by owner", async () => {
//       const ownerUbiBalance = await ubi.balanceOf(ownerAddress);
//       await ubi.connect(owner).mint(ubiroll.address, parseUnits("1", 18));
//       const contractUbiBalance = await ubi.balanceOf(ubiroll.address);
//       expect(contractUbiBalance).to.be.gt(0);
//       await ubiroll
//         .connect(owner)
//         .withdrawToken(ubi.address, contractUbiBalance),
//         expect(await ubi.balanceOf(ubiroll.address)).to.be.eq(0);
//       expect(await ubi.balanceOf(ownerAddress)).to.be.eq(
//         ownerUbiBalance.add(contractUbiBalance)
//       );
//     });
//   });

//   describe("setRegisteredGame()", async () => {
//     it("should revert if not called by owner", async () => {
//       await expectRevert(
//         ubiroll.connect(player).setUbi(playerAddress),
//         "Ownable: caller is not the owner"
//       );
//     });
//     it("should set new Ubi address if called by owner", async () => {
//       const oldUbi = await ubiroll.ubi();
//       const newUbi = playerAddress;
//       expect(oldUbi).to.be.not.eq(newUbi);
//       await ubiroll.connect(owner).setUbi(newUbi);
//       expect(await ubiroll.ubi()).to.be.eq(newUbi);
//     });
//   });

//   describe("setUbi()", async () => {
//     it("should revert if not called by owner", async () => {
//       await expectRevert(
//         ubiroll.connect(player).setUbi(playerAddress),
//         "Ownable: caller is not the owner"
//       );
//     });
//     it("should set new Ubi address if called by owner", async () => {
//       const oldUbi = await ubiroll.ubi();
//       const newUbi = playerAddress;
//       expect(oldUbi).to.be.not.eq(newUbi);
//       await ubiroll.connect(owner).setUbi(newUbi);
//       expect(await ubiroll.ubi()).to.be.eq(newUbi);
//     });
//   });

//   describe("setBurnPercentage()", async () => {
//     it("should revert if not called by owner", async () => {
//       await expectRevert(
//         ubiroll.connect(player).setOracle(playerAddress),
//         "Ownable: caller is not the owner"
//       );
//     });
//     it("should set new oracle address if called by owner", async () => {
//       const oldUbi = await ubiroll.oracle();
//       const newOracle = playerAddress;
//       expect(oldUbi).to.be.not.eq(newOracle);
//       await ubiroll.connect(owner).setOracle(newOracle);
//       expect(await ubiroll.oracle()).to.be.eq(newOracle);
//     });
//   });
// });
