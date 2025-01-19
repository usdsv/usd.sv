const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying IntentFactory with signer:", deployer.address);

  // Compile and get a contract factory for "IntentFactory", deploy
  const Factory = await hre.ethers.getContractFactory("IntentFactory");
  const factory = await Factory.deploy(); 
  await factory.deployed();

  console.log("IntentFactory deployed at:", factory.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
