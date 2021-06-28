import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { ERC20Mock__factory, UbiGamesOracle__factory, Ubiroll__factory, VRFCoordinatorMock__factory } from "../typechain";

async function main() {
  const [deployer] = await ethers.getSigners();
  const linkTokenAddress = "0xa36085F69e2889c224210F603D836748e7dC0088";
  const vrfCoordinator = "0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9";
  const vrfKeyHash = "0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4";
  const vrfFee = parseUnits("0.1", 18);

  const ERC20MockFactory = (await ethers.getContractFactory(
    "ERC20Mock",
    deployer
  )) as ERC20Mock__factory;
  const ubi = await ERC20MockFactory.connect(deployer).deploy(
    "UBI", "UBI", deployer.address, parseUnits("100", 18)
  );
  console.log("UBIMock:", ubi.address);
  await ubi.deployed();

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

  const ubirollFactory = (
    await ethers.getContractFactory("Ubiroll")
  ) as Ubiroll__factory;

  let ubiroll = await ubirollFactory
    .connect(deployer)
    .deploy(
      ubi.address,
      oracle.address,
    );
  console.log("Ubiroll:", ubiroll.address);
  await ubiroll.deployed();

  await oracle.connect(deployer).setRegistered(ubiroll.address, true);
  // await ubi.mint(ubiroll.address, parseUnits("10000", 18))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
