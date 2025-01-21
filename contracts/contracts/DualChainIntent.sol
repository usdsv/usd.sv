// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Importing some necessary contracts from somewhere other
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IGroth16Verifier } from "./interfaces/IGroth16Verifier.sol";

// Struct representing a GaslessCrossChainOrder (user signs the off-chain order with some values)
struct GaslessCrossChainOrder {
	address intentAddress; // Address of the intent contract (DualChainIntent contract)
	address user; // User who created the order
	uint256 nonce; // Unique identifier for the order
	uint256 sourceChainId; // ID of the source chain
	uint32 openDeadline; // Expiration time for opening the order
	uint32 fillDeadline; // Expiration time for filling the order
	bytes32 orderDataType; // Type of order data
	bytes orderData; // Encoded order data (BridgeTransferData)
}

// Struct for bridge transfer data (GaslessCrossChainOrder consists this struct at the end of the data structure - [bytes orderData])
struct BridgeTransferData {
	address filler; // Address of the filler (filler - who handles the user's order)
	address sourceToken; // Token to be transferred from the source chain
	uint256 amount; // Amount of tokens to transfer from source chain
	uint256 destinationChainId; // ID of the dest chain
	address destinationToken; // Token to be received on the dest chain
	address beneficiary; // Address of the beneficiary receiving the tokens from the dest chain
}

interface IDestinationSettler {
	/// @notice Fills a single leg of a particular order on the destination chain.
	function fill(
		bytes32 orderId,
		bytes calldata originData,
		bytes calldata fillerData
	) external;
}

// The Ephemeral Contract that handles the order with user and filler, and bridge token via two separeted chains
contract DualChainIntent is IDestinationSettler {
	using SafeERC20 for IERC20;

	// Address of the SP1 Groth16 verifier contract
	address public SP1VERIFIER_ADDRESS =
		0x4660483e004e416D41bfd77D6425e98543beB6Ba;

	// State variables
	GaslessCrossChainOrder public order; // The current order
	BridgeTransferData public bridgeData; // Data related to the bridge transfer

	// Flags to track the state of fulfillment
	bool public destinationFulfilled; // Indicates if the destination has been fulfilled
	bool public originCompleted; // Indicates if the origin process is completed

	// Event emitted when an order is opened and fullfilled
	event Open(bytes32 indexed orderId, address filler);
	event Completed(bytes32 indexed orderId);

	/**
	 * @dev Constructor to initialize the DualChainIntent contract with a user order
	 *
	 * @param _order The GaslessCrossChainOrder containing the details of the order.
	 *
	 * Requirements:
	 * - The orderDataType must be "BRIDGE_TRANSFER_ORDER".
	 * - The current timestamp must be less than or equal to the openDeadline.
	 */
	constructor(GaslessCrossChainOrder memory _order) {
		// Store the provided order in the contract state
		order = _order;

		// Set the intent address to the address of this contract - at this time order.intentAdress is zero because address is computed after the user signs order
		order.intentAddress = address(this);

		// Ensure the order data type is valid
		require(
			_order.orderDataType == keccak256("BRIDGE_TRANSFER_ORDER"),
			"Invalid orderDataType"
		);

		// Check that the order has not expired based on the openDeadline
		require(
			block.timestamp <= _order.openDeadline,
			"Order expired (openDeadline)"
		);

		// Decode the order data into individual components
		(
			,
			address srcToken, // Source token for the transfer
			uint256 amt, // Amount of tokens to transfer
			uint256 destChain, // Destination chain ID
			address destToken, // Token to be received on the destination chain
			address benef // Beneficiary receiving the tokens
		) = abi.decode(
				_order.orderData,
				(address, address, uint256, uint256, address, address)
			);

		// Initialize the bridge transfer data structure with decoded values
		bridgeData = BridgeTransferData({
			filler: address(0), // Initially set filler to zero address
			sourceToken: srcToken, // Set the source token
			amount: amt, // Set the transfer amount
			destinationChainId: destChain, // Set the destination chain ID
			destinationToken: destToken, // Set the destination token
			beneficiary: benef // Set the beneficiary address
		});
	}

	/**
	 * @dev Initializes the filler for the bridge transfer.
	 *
	 * @param _filler The address of the filler.
	 *
	 * Emits an Open event upon successful initialization.
	 */
	function initializeFiller(address _filler) public {
		// Set the filler address in the bridge transfer data
		bridgeData.filler = _filler;

		// Regenerate bridge data encode for the correct value of order.orderData
		order.orderData = abi.encode(bridgeData);

		// Emit an Open event to signal that the order has been initialized
		emit Open(generateOrderId(order), _filler);
	}

	// /**
	//  * @dev Sets the verifier address for testing purposes.
	//  *
	//  * @param _verifier The address of the new verifier.
	//  */
	// function setVerifier(address _verifier) external {
	// 	SP1VERIFIER_ADDRESS = _verifier;
	// }

	/**
	 * @dev Fulfills the bridge transfer on the destination chain.
	 *
	 * @param orderId The ID of the order being fulfilled.
	 * @param originData Data from the origin chain - (not used for now).
	 * @param fillerData Data for the filler - (not used for now).
	 *
	 * Requirements:
	 * - The provided orderId must match the hashed order.
	 * - The transaction must be on the destination chain.
	 * - The transfer must not have been fulfilled already.
	 * - The caller must be the designated filler.
	 */
	function fill(
		bytes32 orderId,
		bytes calldata originData,
		bytes calldata fillerData
	) external {
		// Verify that the provided orderId matches the current order's ID
		require(orderId == generateOrderId(order), "Invalid orderId");

		// Ensure the transaction is occurring on the correct destination chain
		require(
			block.chainid == bridgeData.destinationChainId,
			"Not destination chain"
		);

		// Check that the transfer has not already been fulfilled
		require(!destinationFulfilled, "Already fulfilled");

		// Confirm that the caller is the designated filler for this transfer
		require(
			msg.sender == bridgeData.filler,
			"Only filler can finalize destination"
		);

		// Mark the destination as fulfilled
		destinationFulfilled = true;

		// Transfer tokens from the filler to the beneficiary
		IERC20(bridgeData.destinationToken).safeTransferFrom(
			bridgeData.filler, // From: filler address
			bridgeData.beneficiary, // To: beneficiary address
			bridgeData.amount // Amount to transfer
		);
	}

	/**
	 * @dev Finalizes the order on the origin chain after proof verification.
	 *
	 * @param programVKey The verification key for the proof.
	 * @param publicValues The public values used in the proof.
	 * @param proofBytes The proof data.
	 *
	 * Requirements:
	 * - The chain ID must match the source chain ID.
	 * - The order must not have been completed already.
	 * - The current timestamp must be less than or equal to the fillDeadline.
	 */
	function finalizeOnOrigin(
		bytes32 programVKey,
		bytes calldata publicValues,
		bytes calldata proofBytes
	) external {
		// Ensure the transaction is occurring on the correct origin chain
		require(block.chainid == order.sourceChainId, "Not origin chain");

		// Check that the origin escrow has not already been released
		require(!originCompleted, "Origin escrow already released");

		// Verify that the order has not expired
		require(
			block.timestamp <= order.fillDeadline,
			"Order expired (fillDeadline)"
		);

		// Verify the SP1 Groth16 proof using the specified verifier contract
		bool validProof = IGroth16Verifier(SP1VERIFIER_ADDRESS).verifyProof(
			programVKey, // Verification key
			publicValues, // Public values for the proof
			proofBytes // Serialized proof data
		);
		require(validProof, "Invalid Groth16 proof");

		// Check the balance of escrowed tokens in this contract
		uint256 bal = IERC20(bridgeData.sourceToken).balanceOf(address(this));
		require(bal >= bridgeData.amount, "Not enough escrow in contract");

		// Transfer the escrowed tokens from this contract to the filler
		IERC20(bridgeData.sourceToken).safeTransfer(
			bridgeData.filler, // Recipient: filler address
			bridgeData.amount // Amount to transfer
		);

		// Mark the origin transfer as completed
		originCompleted = true;

		// Generate and emit the order ID for the completed transfer
		emit Completed(generateOrderId(order));
	}

	/**
	 * @dev Generates a unique order ID by hashing the provided order data.
	 *
	 * @param _order The GaslessCrossChainOrder for which the ID is being generated.
	 * @return bytes32 The generated unique order ID.
	 */
	function generateOrderId(
		GaslessCrossChainOrder memory _order
	) internal pure returns (bytes32) {
		// Return the keccak256 hash of the encoded order data
		return keccak256(abi.encode(_order));
	}
}
