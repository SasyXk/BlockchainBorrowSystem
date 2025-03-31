// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract ChainlinkPriceConsumer {
    AggregatorV3Interface internal priceFeed;
    uint256 public latestPrice;

    /**
     * Network: Sepolia
     * Aggregator: ETH/USD
     * Address: 0x694AA1769357215DE4FAC081bf1f309aDC325306
     */
    constructor() {
        priceFeed = AggregatorV3Interface(0xCB78a8f1aBfa227d55BdA24FAEBE4A37B0deA7ce);
    }                                     

    /**
     * Get the latest ETH/USD price and save to storage
     */
    function updatePrice() public {
        (
            /* uint80 roundID */,
            int price,
            /* uint startedAt */,
            /* uint updatedAt */,
            /* uint80 answeredInRound */
        ) = priceFeed.latestRoundData();
        
        // Convert the price from 8 decimal places to a readable value (e.g. 700000000 -> 7.00 USD)
        latestPrice = uint256(price) / 1e8; // 1e8 = 10^8 (8 decimal)
    }

    /**
     * Read the last saved price (without calling Chainlink)
     */
    function getLatestPrice() public view returns (uint256) {
        return latestPrice;
    }
}