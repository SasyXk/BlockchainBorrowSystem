// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";  // Add this import

contract PonziToken is ERC20, Ownable {  // Add Ownable inheritance
    constructor() ERC20("Ponzi Token", "PONZI") {
        _mint(msg.sender, 1_000_000 * 10 ** decimals()); // Initial mint
    }

    function mint(address to, uint256 amount) public onlyOwner {  // Use onlyOwner modifier
        _mint(to, amount);
    }
}