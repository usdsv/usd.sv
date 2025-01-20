const hre = require("hardhat");
async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying verifierFactory with signer:", deployer.address);

  // Compile and get a contract factory for "IntentFactory", deploy
  const verifierFactory = await hre.ethers.getContractFactory("SP1Groth16Verifier");
  const verifier = await verifierFactory.deploy(); 

  console.log("verifier deployed at:", await verifier.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
