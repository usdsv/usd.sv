// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title MockERC20
 * @dev A simple mock ERC20 token for testing. It does not implement
 *      the full ERC20 specification (like approve/transferFrom).
 *      Instead, it has minimal methods needed for local testing.
 */
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;

    mapping(address => uint256) private _balances;
    uint256 private _totalSupply;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    /**
     * @dev Mints `amount` tokens to address `to`.
     */
    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
        _totalSupply += amount;
    }

    /**
     * @dev Transfers `amount` tokens from msg.sender to `to`.
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        return true;
    }

    /**
     * @dev Returns the balance of `account`.
     */
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev Returns the total supply.
     */
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }
}
