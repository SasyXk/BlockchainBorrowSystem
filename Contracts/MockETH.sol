// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockETH is ERC20, Ownable {
    uint256 private constant INITIAL_SUPPLY = 1000000 * 10**18; // 1M tokens

    constructor() ERC20("MockETH", "mETH") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}
