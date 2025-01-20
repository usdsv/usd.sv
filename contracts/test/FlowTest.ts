import { AddressLike, BytesLike, Signer, Typed, keccak256, parseEther } from "ethers"
import { ethers } from "hardhat"
import { expect } from "chai"
import { IntentFactory, MockERC20, DualChainIntent } from "typechain-types"
import { GaslessCrossChainOrderStruct } from "typechain-types/contracts/IntentFactory"

describe("Logic Work Flow Testing (ERC7686 and ZK Proof of Finality)", () => {
	let deployer: Signer, alice: Signer, bob: Signer // Declare signers (alice is user, bob is filler)
	let intentFactory: IntentFactory // Declare IntentFactory contract instance
	let sourceToken: MockERC20, destToken: MockERC20 // Declare Mock ERC20 token instances
	let sourceIntent: DualChainIntent, destIntent: DualChainIntent // Declare DualChainIntent instances

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
		// Placeholder for implementation of SP1 Groth16 proof generation
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
