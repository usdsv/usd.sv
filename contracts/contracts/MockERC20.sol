// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Importing the ERC20 standard from OpenZeppelin
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// MockERC20 is a simple ERC20 token implementation for testing purposes
contract MockERC20 is ERC20 {
	// Constructor function to initialize the token with its name, symbol, and initial supply
	constructor(
		string memory _name, // The name of the token
		string memory _symbol, // The symbol of the token (e.g., "TOKEN")
		uint256 _initialSupply // The initial supply of tokens to mint
	) ERC20(_name, _symbol) {
		// Mint the initial supply to the contract deployer (msg.sender)
		_mint(msg.sender, _initialSupply);
	}

	// Function to mint new tokens
	// Only the owner or authorized accounts should be able to call this in a real implementation
	function mint(address to, uint256 amount) external {
		// Mint new tokens to the specified address
		_mint(to, amount);
	}

	// Function to burn tokens from the caller's account
	function burn(uint256 amount) external {
		// Burn tokens from the caller's account
		_burn(msg.sender, amount);
	}

	// Function to burn tokens from a specified address
	// Only the owner or authorized accounts should be able to call this in a real implementation
	function burnFrom(address account, uint256 amount) external {
		// Burn tokens from a specified account
		_burn(account, amount);
	}
}
