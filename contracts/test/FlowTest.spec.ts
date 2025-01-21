import { AddressLike, BytesLike, ContractFactory, Signer, Typed, keccak256, parseEther, parseUnits } from "ethers"
import { ethers } from "hardhat"
import { expect } from "chai"
import { IntentFactory, MockERC20, DualChainIntent, SP1Groth16Verifier, Groth16Verifier } from "typechain-types"
import { GaslessCrossChainOrderStruct } from "typechain-types/contracts/IntentFactory"

describe("Logic Work Flow Testing (ERC-7686 and ZK Proof of Finality)", () => {
	let deployer: Signer, alice: Signer, bob: Signer // Declare signers (alice is user, bob is filler)
	let verifier: SP1Groth16Verifier
	let intentFactory: IntentFactory // Declare IntentFactory contract instance
	let sourceToken: MockERC20, destToken: MockERC20 // Declare Mock ERC20 token instances
	let sourceIntent: DualChainIntent, destIntent: DualChainIntent // Declare DualChainIntent instances

	let groth: Groth16Verifier

	let currentTimestamp: number // Variable to hold the current timestamp
	let chainId: bigint // Variable to hold the chain ID

	let bridgeData: BytesLike // Variable to hold bridge data that user signs
	let bridgeDataAfterDeploy: BytesLike // Variable to hold bridge data after deployment (user signs + add some)
	let order: GaslessCrossChainOrderStruct // Variable to hold the order structure
	const salt = "SALT_0x1234567890ABCDEF" // Salt for generating unique addresses

	const BRIDGE_AMOUNT = parseEther("100") // Amount of tokens to bridge

	let computedAddress: string // Variable to hold the computed address for the ephemeral contract
	let signature: string // Variable to hold the signature of the order
	let orderMessage: string // Variable to hold the encoded order message

	before(async () => {
		// Get signers for the test
		;[deployer, alice, bob] = await ethers.getSigners()

		// Deploy the IntentFactory contract
		const VerifierFactory = await ethers.getContractFactory("SP1Groth16Verifier")
		verifier = await VerifierFactory.connect(deployer).deploy()
		console.log("VerifierFactory deployed to:", await verifier.getAddress()) // Log the deployed address

		const Groth16VerifierFactory = await ethers.getContractFactory("Groth16Verifier")
		groth = await Groth16VerifierFactory.connect(deployer).deploy()
		console.log("Groth16Verifier deployed to:", await groth.getAddress()) // Log the deployed address

		// Deploy the IntentFactory contract
		const IntentFactoryFactory = await ethers.getContractFactory("IntentFactory")
		intentFactory = await IntentFactoryFactory.connect(deployer).deploy()
		console.log("IntentFactory deployed to:", await intentFactory.getAddress()) // Log the deployed address

		// Deploy Mock ERC20 tokens
		const MockERC20Factory = await ethers.getContractFactory("MockERC20")
		sourceToken = await MockERC20Factory.connect(deployer).deploy("SourceToken", "SRT", parseEther("10000")) // Deploy source token
		destToken = await MockERC20Factory.connect(deployer).deploy("DestToken", "DST", parseEther("10000")) // Deploy destination token

		// Transfer tokens to Alice and Bob
		await sourceToken.transfer(alice.getAddress(), parseEther("1000")) // Transfer 1000 source tokens to Alice
		await destToken.transfer(bob.getAddress(), parseEther("1000")) // Transfer 1000 destination tokens to Bob
	})

	it("Alice signs GaslessCrossChainOrder", async () => {
		// Get the current timestamp
		currentTimestamp = Math.floor(Date.now() / 1000)
		// Get the current chain ID
		chainId = (await ethers.provider.getNetwork()).chainId

		// Encode bridge data for the order
		bridgeData = ethers.AbiCoder.defaultAbiCoder().encode(
			["address", "address", "uint256", "uint256", "address", "address"], // Specify the types
			[
				ethers.ZeroAddress, // Placeholder for intent address
				await sourceToken.getAddress(), // Source token address
				BRIDGE_AMOUNT, // Amount to bridge
				chainId, // Chain ID
				await destToken.getAddress(), // Destination token address
				await alice.getAddress(), // Alice's address
			]
		)

		// Encode bridge data after deployment
		bridgeDataAfterDeploy = ethers.AbiCoder.defaultAbiCoder().encode(
			["address", "address", "uint256", "uint256", "address", "address"], // Specify the types
			[
				await bob.getAddress(), // Bob's address
				await sourceToken.getAddress(), // Source token address
				BRIDGE_AMOUNT, // Amount to bridge
				chainId, // Chain ID
				await destToken.getAddress(), // Destination token address
				await alice.getAddress(), // Alice's address
			]
		)

		// Create the order structure
		order = {
			intentAddress: ethers.ZeroAddress, // Placeholder for intent address
			user: await alice.getAddress(), // Alice's address
			nonce: 10001, // Unique nonce for the order
			sourceChainId: chainId, // Chain ID
			openDeadline: currentTimestamp + 300, // Open deadline (current time + 5 minutes)
			fillDeadline: currentTimestamp + 600, // Fill deadline (current time + 10 minutes)
			orderDataType: ethers.keccak256(ethers.toUtf8Bytes("BRIDGE_TRANSFER_ORDER")), // Hash of order data type
			orderData: bridgeData, // Encoded bridge data
		}

		// Encode the order message for signing
		orderMessage = ethers.AbiCoder.defaultAbiCoder().encode(
			["address", "address", "uint256", "uint256", "uint32", "uint32", "bytes32", "bytes"], // Specify the types
			[
				order.intentAddress, // Intent address
				order.user, // User address
				order.nonce, // Nonce
				order.sourceChainId, // Source chain ID
				order.openDeadline, // Open deadline
				order.fillDeadline, // Fill deadline
				order.orderDataType, // Order data type
				order.orderData, // Order data
			]
		)

		// Sign the order message with Alice's private key
		signature = await alice.signMessage(orderMessage)
	})

	it("Alice transfers tokens to ephemeral address", async () => {
		// Get the computed address for the ephemeral contract
		computedAddress = await intentFactory.connect(alice).getIntentAddress(order, ethers.id(salt))
		console.log("Ephemeral Contract will be deployed to:", computedAddress) // Log the computed address

		// Transfer the bridge amount to the computed address
		await sourceToken.connect(alice).transfer(computedAddress, BRIDGE_AMOUNT)
		// Check that the computed address has the correct balance
		expect(await sourceToken.balanceOf(computedAddress)).to.eq(BRIDGE_AMOUNT)
	})

	it("Bob receives and verifies order, deploy intents on both source and destination chain", async () => {
		// Verify that the signer of the order message is Alice
		const signer = await ethers.verifyMessage(orderMessage, signature)
		expect(await alice.getAddress()).to.eq(signer) // Assert that the signer is Alice

		// Check that the computed address has the correct balance
		expect(await sourceToken.balanceOf(computedAddress)).to.eq(BRIDGE_AMOUNT)

		// Create the intent on behalf of Bob
		const txReceipt = await intentFactory.connect(bob).createIntent(order, ethers.id(salt))
		// Expect the IntentDeployed event to be emitted with the correct arguments
		await expect(txReceipt)
			.to.emit(intentFactory, "IntentDeployed")
			.withArgs(computedAddress, [
				ethers.ZeroAddress, // Intent address
				await alice.getAddress(), // User address
				10001, // Nonce
				chainId, // Chain ID
				currentTimestamp + 300, // Open deadline
				currentTimestamp + 600, // Fill deadline
				ethers.keccak256(ethers.toUtf8Bytes("BRIDGE_TRANSFER_ORDER")), // Order data type
				bridgeData, // Bridge data
			])

		// Get the source intent contract instance
		sourceIntent = await ethers.getContractAt("DualChainIntent", computedAddress)
		// Get the destination intent contract instance
		destIntent = await ethers.getContractAt("DualChainIntent", computedAddress)

		// Check that the filler address in the bridge data is Bob's address
		expect((await sourceIntent.bridgeData()).filler).to.eq(await bob.getAddress())
		expect((await destIntent.bridgeData()).filler).to.eq(await bob.getAddress())
	})

	it("Bob bridges tokens to destination chain", async () => {
		// Set the intent address and order data for the order
		order.intentAddress = computedAddress
		order.orderData = bridgeDataAfterDeploy

		// Encode the order for submission
		const orderEncoded = ethers.AbiCoder.defaultAbiCoder().encode(
			[
				"tuple(address intentAddress,address user,uint256 nonce,uint256 sourceChainId,uint32 openDeadline,uint32 fillDeadline,bytes32 orderDataType,bytes orderData)", // Specify the tuple structure
			],
			[order] // Pass the order
		)

		// Compute the order ID by hashing the encoded order
		const orderId = keccak256(orderEncoded)

		// Approve the destination intent to spend Bob's tokens
		await destToken.connect(bob).approve(destIntent, BRIDGE_AMOUNT)
		// Fill the order on the destination intent
		await destIntent.connect(bob).fill(orderId, "0x", "0x")
	})

	it("Alice receives tokens on destination chain", async () => {
		// Check that Alice's balance of destination tokens is correct
		expect(await destToken.balanceOf(await alice.getAddress())).to.eq(BRIDGE_AMOUNT)
	})

	it("Bob waits for finality on destination chain", async () => {
		// Check that the destination intent has been fulfilled
		expect(await destIntent.destinationFulfilled()).to.be.equal(true)
	})

	it("Bob generates SP1 Groth16", async () => {
		await sourceIntent.setVerifier(await verifier.getAddress())

		const programVKey = "0x9f8c5982a2e3c4e188738b98b2d0c33b84d963d4e2974f613ad0d6203fdf75b3"

		const publicValues =
			"0x0000000000000000000000000000000000000000000000000000000000730ab314347dd73828b56cecc002fae866be133a4a7639f711d3d0c452b4a7306c8b87"
		const proofBytes =
			"0x9f8c59820396c90cdde4d23558a0bc69391eae8b271002e51968423db4fa0520f159583e1371de45d56b83a54f5d6eb799c4042f061b4cf54b56d5cb89ebda8a95afbac82241dae145d4b870a4707bd15bab2ac74f85e476c4479219cb8728884a3df9511d27d474c447cd4d4c571666d2400b0d323d5119e93ff42fdd2a49a1608c02590cb3113e3c59c2440050a2f054e4bcb3e504e1d3b2bda03ea912305423aa313213afeba0ac1459a6399800312ae8c21dfc715955ea255f7651b6a72abb45056b128abcf1959e8659f3392f822bb38872cf78c94bef5ecd6c900afdf3d83f28f5275e716ef34cf57e041a493ce8c59c3f3a7e448bd673ff9eb6cb1e5d47ec613a"

		await sourceIntent.finalizeOnOrigin(programVKey, publicValues, proofBytes)
	})

	it("Submit proof, ephemeral contract verifies proof and unlocks escrow", async () => {
		// Placeholder for finalizing the origin intent
		// const beforeBobBalance = await sourceToken.balanceOf(await bob.getAddress())
		// await sourceIntent.finalizeOnOrigin();
		// expect(await sourceIntent.originCompleted()).to.be.equal(true)
		// const afterBobBalance = await sourceToken.balanceOf(await bob.getAddress())
		// expect(afterBobBalance - beforeBobBalance).to.be.equal(BRIDGE_AMOUNT)
		// Everything must be clarified here
		// expect(await sourceToken.balanceOf(await sourceIntent.getAddress())).to.be.equal(0)
		// expect(await destToken.balanceOf(await destIntent.getAddress())).to.be.equal(0)
	})
})
