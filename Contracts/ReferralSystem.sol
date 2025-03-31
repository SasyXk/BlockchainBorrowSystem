// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ReferralSystem is ReentrancyGuard {

    using Counters for Counters.Counter;
    
    // Counter to generate unique UUIDs
    Counters.Counter private _uuidCounter;

    // Maps addresses to their referrers
    mapping(address => address) public referrerOf;
    
    // Maps UUIDs to the referrer's address
    mapping(bytes32 => address) public uuidToReferrer;
    
    // Maps addresses to their generated referral UUIDs
    mapping(address => bytes32) public referrerToUUID;

    // Keeps track of all addresses that have used a user's referral
    mapping(address => address[]) private referrals;

    // Event emitted when a referral link is generated
    event ReferralLinkGenerated(address indexed referrer, bytes32 uuid);
    
    // Event emitted when a user registers with a referral
    event UserRegistered(address indexed user, address indexed referrer);

    // Generates a unique UUID for the caller
    function generateReferralLink() external nonReentrant {
        // Ensure that the caller doesn't already have a referral link
        require(referrerToUUID[msg.sender] == bytes32(0), "Referral link already exists");
        
        // Generate a unique UUID using the sender's address and the current counter value
        bytes32 uuid = keccak256(
            abi.encodePacked(msg.sender, _uuidCounter.current())
        );
        
        // Store the referrer for the generated UUID
        uuidToReferrer[uuid] = msg.sender;
        
        // Store the generated UUID for the caller
        referrerToUUID[msg.sender] = uuid;

        // Increment the counter for the next UUID
        _uuidCounter.increment();
        
        // Emit an event that the referral link has been generated
        emit ReferralLinkGenerated(msg.sender, uuid);
    }

    // Registers a user with a referral UUID
    function registerWithReferral(bytes32 referralUUID) external nonReentrant {
        // Ensure the user is not already registered
        require(referrerOf[msg.sender] == address(0), "Already registered");
        
        // Ensure the referral UUID is valid (it must exist)
        require(uuidToReferrer[referralUUID] != address(0), "Invalid referral UUID");

        // Ensure the referral UUID is not the own referral
        require(referralUUID != referrerToUUID[msg.sender], "Cannot register with your own referral link");
        
        // Assign the referrer based on the given referral UUID
        address referrer = uuidToReferrer[referralUUID];
        referrerOf[msg.sender] = referrer;
        
        // Added the user to his referrer list
        referrals[referrer].push(msg.sender);

        // Emit an event that the user has been registered with a referrer
        emit UserRegistered(msg.sender, referrer);
    }

    // Get the address of my referer
    function getMyReferrer() external view returns (address) {
        return referrerOf[msg.sender];
    }

    // Get the address of my Referrals
    function getMyReferrals() external view returns (address[] memory) {
        return referrals[msg.sender];
        /*You can use an off-chain approach 
          by querying the "Event" UserRegistered 
          to get the referral information without
          calling the smart contract using ether.js*/
    }

    // Get the Referral of the address
    function getMyReferralLink() external view returns (bytes32) {
        bytes32 uuid = referrerToUUID[msg.sender];
        require(uuid != bytes32(0), "No referral link generated");
        return uuid;
    }
}
