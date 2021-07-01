import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";

// Withdraw token from Matic PoS to Ethereum
async function main() {
  const polygonTokenAddress = "0xFe7FF8b5dfbA93A9EaB7Aee447C3c72990052d93";

  const [signer] = await ethers.getSigners();
  const token = await ethers.getContractAt("IChildERC20", polygonTokenAddress);
  const tx = await token.connect(signer).withdraw(parseUnits("0.1", 18), {
    gasPrice: parseUnits('3', "gwei"),
  });
  console.log(tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
