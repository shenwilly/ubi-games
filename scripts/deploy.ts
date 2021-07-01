import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { UbiGamesOracle__factory, UbiGamesVault__factory, Ubiroll__factory } from "../typechain";
import { DEPLOY_CONFIGS, NETWORKS } from "./constants";

async function main() {
  const chainId = NETWORKS.MATIC_MAINNET;

  const [deployer] = await ethers.getSigners();

  const config = DEPLOY_CONFIGS[chainId];
  const ubiTokenAddress = config.UBI;
  const linkTokenAddress = config.LINK;
  const vrfCoordinator = config.VRFCoordinator;
  const vrfKeyHash = config.KEY_HASH;
  const vrfFee = config.VRF_FEE;

  const burnerAddress = "";
  const burnPercentage = 50;
  const minBet = parseUnits("1", 18)

  // const ERC20MockFactory = (await ethers.getContractFactory(
  //   "ERC20Mock",
  //   deployer
  // )) as ERC20Mock__factory;
  // const ubi = await ERC20MockFactory.connect(deployer).deploy(
  //   "UBI", "UBI", deployer.address, parseUnits("100", 18)
  // );
  // console.log("UBIMock:", ubi.address);
  // await ubi.deployed();

  const OracleFactory = (await ethers.getContractFactory(
    "UbiGamesOracle",
    deployer
  )) as UbiGamesOracle__factory;
  const oracle = await OracleFactory
    .connect(deployer)
    .deploy(
      vrfCoordinator,
      linkTokenAddress,
      vrfKeyHash,
      vrfFee
    );
  console.log("Oracle:", oracle.address);
  await oracle.deployed();

  const VaultFactory = (await ethers.getContractFactory(
    "UbiGamesVault",
    deployer
  )) as UbiGamesVault__factory;
  const vault = await VaultFactory
    .connect(deployer)
    .deploy(
      ubiTokenAddress,
      burnerAddress,
      burnPercentage
    );
  console.log("Vault:", vault.address);
  await vault.deployed();

  const ubirollFactory = (
    await ethers.getContractFactory("Ubiroll")
  ) as Ubiroll__factory;

  let ubiroll = await ubirollFactory
    .connect(deployer)
    .deploy(
      oracle.address,
      vault.address,
      minBet
    );
  console.log("Ubiroll:", ubiroll.address);
  await ubiroll.deployed();

  await oracle.connect(deployer).setRegistered(ubiroll.address, true);
  await vault.connect(deployer).setRegisteredGame(ubiroll.address, true);
  // await ubi.mint(ubiroll.address, parseUnits("10000", 18))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
