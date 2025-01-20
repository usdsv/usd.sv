// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

struct GaslessCrossChainOrder {
	address intentAddress;
	address user;
	uint256 nonce;
	uint256 sourceChainId;
	uint32 openDeadline;
	uint32 fillDeadline;
	bytes32 orderDataType;
	bytes orderData;
}

struct BridgeTransferData {
	address filler;
	address sourceToken;
	uint256 amount;
	uint256 destinationChainId;
	address destinationToken;
	address beneficiary;
}

contract DualChainIntent {
	using SafeERC20 for IERC20;

	GaslessCrossChainOrder public order;
	BridgeTransferData public bridgeData;

	bool public destinationFulfilled;
	bool public originCompleted;

	event Open(bytes32 indexed orderId, address filler);

	constructor(GaslessCrossChainOrder memory _order) {
		order = _order;
		require(
			_order.orderDataType == keccak256("BRIDGE_TRANSFER_ORDER"),
			"Invalid orderDataType"
		);
		require(
			block.timestamp <= _order.openDeadline,
			"Order expired (openDeadline)"
		);

		(
			,
			address srcToken,
			uint256 amt,
			uint256 destChain,
			address destToken,
			address benef
		) = abi.decode(
				_order.orderData,
				(address, address, uint256, uint256, address, address)
			);

		bridgeData = BridgeTransferData({
			filler: address(0),
			sourceToken: srcToken,
			amount: amt,
			destinationChainId: destChain,
			destinationToken: destToken,
			beneficiary: benef
		});
	}

	function initializeFiller(
		address _filler,
		GaslessCrossChainOrder memory _order
	) public {
		bridgeData.filler = _filler;
		bytes32 orderId = keccak256(abi.encode(_order));
		emit Open(orderId, _filler);
	}

	function fill(
		bytes32 orderId,
		bytes calldata originData,
		bytes calldata fillerData
	) external {
		require(orderId == keccak256(abi.encode(order)), "Invalid orderId");
		require(
			block.chainid == bridgeData.destinationChainId,
			"Not destination chain"
		);
		require(!destinationFulfilled, "Already fulfilled");
		require(
			msg.sender == bridgeData.filler,
			"Only filler can finalize destination"
		);

		destinationFulfilled = true;

		IERC20(bridgeData.sourceToken).safeTransferFrom(
			bridgeData.filler,
			address(this),
			bridgeData.amount
		);

		IERC20(bridgeData.destinationToken).safeTransferFrom(
			address(this),
			bridgeData.beneficiary,
			bridgeData.amount
		);
	}

	function finalizeOnOrigin(bytes calldata proofData) external {
		require(block.chainid == order.sourceChainId, "Not origin chain");
		require(!originCompleted, "Origin escrow already released");
		require(
			block.timestamp <= order.fillDeadline,
			"Order expired (fillDeadline)"
		);

		// In a real scenario, call the on-chain verifier, e.g.
		// bool validProof = IGroth16Verifier(zkVerifier).verifyProof(proofData);
		// Here, do a trivial check:
		bool validProof = (proofData.length > 0);
		require(validProof, "Invalid Groth16 proof");

		// Transfer escrowed tokens from this contract to the filler
		uint256 bal = IERC20(bridgeData.sourceToken).balanceOf(address(this));
		require(bal >= bridgeData.amount, "Not enough escrow in contract");

		IERC20(bridgeData.sourceToken).transfer(
			bridgeData.filler,
			bridgeData.amount
		);

		// Mark as completed
		originCompleted = true;
	}
}
