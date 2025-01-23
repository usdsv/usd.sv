// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Importing the DualChainIntent contract
import "./DualChainIntent.sol";

// IntentFactory is a contract that deploys instances of DualChainIntent
contract IntentFactory {
	// Event emitted when a new intent is deployed
	event IntentDeployed(
		address indexed intentAddr, // Address of the deployed intent
		GaslessCrossChainOrder order // The order associated with the intent
	);

	/**
	 * @dev Creates a new intent contract using the provided order and salt (CREATE2 opcode).
	 *
	 * @param _order The GaslessCrossChainOrder associated with the intent.
	 * @param _salt A unique salt value to ensure the address of the deployed contract is unique.
	 *
	 * @return intentAddr The address of the newly deployed intent contract (DualChainIntent contract).
	 *
	 * Emits an IntentDeployed event upon successful deployment.
	 *
	 * Requirements:
	 * - The contract must not revert during creation.
	 */
	function createIntent(
		GaslessCrossChainOrder memory _order, // The order to be associated with the intent
		bytes32 _salt // Salt for CREATE2 to ensure unique address
	) external returns (address intentAddr) {
		// Encode the order data for the constructor
		bytes memory constructorData = abi.encode(_order);

		// Prepare the bytecode for the new contract
		bytes memory bytecode = abi.encodePacked(
			type(DualChainIntent).creationCode, // Get the creation code of DualChainIntent
			constructorData // Append the constructor data
		);

		// Use assembly to deploy the contract using CREATE2
		assembly {
			intentAddr := create2(0, add(bytecode, 0x20), mload(bytecode), _salt)
		}

		// Ensure the contract was created successfully
		require(intentAddr != address(0), "CREATE2 failed");

		if (block.timestamp <= _order.openDeadline) {
			// Initialize the newly created intent with the sender's address and order
			DualChainIntent(intentAddr).initializeFiller(msg.sender);
		}

		// Emit the IntentDeployed event
		emit IntentDeployed(intentAddr, _order);
	}

	/**
	 * @dev Computes the address of a future intent contract without deploying it (CREATE2 contract deployment prediction).
	 *
	 * @param _order The GaslessCrossChainOrder associated with the intent.
	 * @param _salt A unique salt value used in the address computation.
	 *
	 * @return The anticipated address of the intent contract.
	 *
	 * This function uses the CREATE2 opcode to determine the address based on the factory's address,
	 * the salt, and the bytecode of the intended contract.
	 */
	function getIntentAddress(
		GaslessCrossChainOrder memory _order, // The order to be associated with the intent
		bytes32 _salt // Salt for CREATE2 to ensure unique address
	) external view returns (address) {
		// Encode the order data for the constructor
		bytes memory constructorData = abi.encode(_order);

		// Prepare the bytecode for the new contract
		bytes memory bytecode = abi.encodePacked(
			type(DualChainIntent).creationCode, // Get the creation code of DualChainIntent
			constructorData // Append the constructor data
		);

		// Calculate the code hash of the intended contract
		bytes32 codeHash = keccak256(bytecode);

		// Calculate and return the anticipated address of the intent
		return
			address(
				uint160(
					uint256(
						keccak256(
							abi.encodePacked(
								bytes1(0xff), // Prefix for CREATE2
								address(this), // Address of the factory
								_salt, // Salt
								codeHash // Code hash
							)
						)
					)
				)
			);
	}
}
