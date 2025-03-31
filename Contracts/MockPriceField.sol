// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract MockPriceFeed is AggregatorV3Interface {
    int256 private price;
    uint8 private _decimals;
    uint256 private updatedAt;

    constructor(int256 _initialPrice, uint8 decimals_) {
        price = _initialPrice;
        _decimals = decimals_;
        updatedAt = block.timestamp;
    }

    function setPrice(int256 _newPrice) external {
        price = _newPrice;
        updatedAt = block.timestamp;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external pure override returns (string memory) {
        return "Mock Price Feed";
    }

    function version() external pure override returns (uint256) {
        return 1;
    }

    function latestRoundData() 
        external 
        view 
        override 
        returns (
            uint80 roundId, 
            int256 answer, 
            uint256 startedAt, 
            uint256 updatedAt_, 
            uint80 answeredInRound
        ) 
    {
        return (0, price, 0, updatedAt, 0);
    }

    function getRoundData(uint80 _roundId) 
        external 
        view 
        override 
        returns (
            uint80 roundId, 
            int256 answer, 
            uint256 startedAt, 
            uint256 updatedAt_, 
            uint80 answeredInRound
        ) 
    {
        return (_roundId, price, 0, updatedAt, _roundId);
    }
}
