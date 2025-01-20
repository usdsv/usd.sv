// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./DualChainIntent.sol";

contract IntentFactory {
	event IntentDeployed(
		address indexed intentAddr,
		GaslessCrossChainOrder order
	);

	function createIntent(
		GaslessCrossChainOrder memory _order,
		bytes32 _salt
	) external returns (address intentAddr) {
		bytes memory constructorData = abi.encode(_order);
		bytes memory bytecode = abi.encodePacked(
			type(DualChainIntent).creationCode,
			constructorData
		);
		assembly {
			intentAddr := create2(0, add(bytecode, 0x20), mload(bytecode), _salt)
		}
		require(intentAddr != address(0), "CREATE2 failed");
		DualChainIntent(intentAddr).initializeFiller(msg.sender, _order);
		emit IntentDeployed(intentAddr, _order);
	}

	function getIntentAddress(
		GaslessCrossChainOrder memory _order,
		bytes32 _salt
	) external view returns (address) {
		bytes memory constructorData = abi.encode(_order);
		bytes memory bytecode = abi.encodePacked(
			type(DualChainIntent).creationCode,
			constructorData
		);
		bytes32 codeHash = keccak256(bytecode);
		return
			address(
				uint160(
					uint256(
						keccak256(
							abi.encodePacked(
								bytes1(0xff),
								address(this),
								_salt,
								codeHash
							)
						)
					)
				)
			);
	}
}
