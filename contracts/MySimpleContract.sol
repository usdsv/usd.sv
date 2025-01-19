pragma solidity ^0.8.0;

contract MySimpleContract {
    // storage.js can read this
    uint256 public count;

    // Constructor sets the initial value of count.
    constructor() {
        count = 0;
    }

    // A function to increment the count by 1.
    function increment() public {
        count++;
    }
}