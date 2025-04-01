// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Add this abstract contract declaration
abstract contract LoanManager {
    function withdrawToLoanManager(uint256 amount) external virtual;
}

contract DepositPool is ReentrancyGuard {
    IERC20 public token;
    LoanManager public loanManager;  // Changed type to abstract contract
    uint256 public constant INTEREST_RATE = 2;
    uint256 public totalDeposits;
    
    mapping(address => User) public users;
    
    struct User {
        uint256 balance;
        uint256 lastUpdate;
    }

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    constructor(address _token) {
        token = IERC20(_token);
    }

    function setLoanManager(address _loanManager) external {
        require(_loanManager != address(0), "Invalid address");
        loanManager = LoanManager(_loanManager);  // Now properly typed
    }

    function withdrawToLoanManager(uint256 amount) external nonReentrant {
        require(msg.sender == address(loanManager), "Only LoanManager");
        require(token.transfer(msg.sender, amount), "Transfer failed");
    }
    // Helper function to calculate interest
    function calculateInterest(address user) public view returns (uint256) {
        User storage u = users[user];
        uint256 timeElapsed = block.timestamp - u.lastUpdate; // Time since last update
        return (u.balance * INTEREST_RATE * timeElapsed) / (100 * 365 days); // Simple interest formula
    }

    // Deposit tokens into the pool
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");

        User storage u = users[msg.sender];
        updateUserBalance(u); // Update user's balance with accrued interest

        u.balance += amount; // Add new deposit to user's balance
        totalDeposits += amount; // Update total deposits

        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed"); // Transfer tokens from user to pool
        emit Deposited(msg.sender, amount);
    }

    // Withdraw tokens from the pool
    function withdraw(uint256 amount) external nonReentrant {
        User storage u = users[msg.sender];
        updateUserBalance(u); // Update user's balance with accrued interest

        require(u.balance >= amount, "Insufficient balance");

        u.balance -= amount; // Deduct withdrawal amount
        totalDeposits -= amount; // Update total deposits

        require(token.transfer(msg.sender, amount), "Transfer failed"); // Transfer tokens to user
        emit Withdrawn(msg.sender, amount);
    }

    // Internal function to update user's balance with interest
    function updateUserBalance(User storage user) internal {
        uint256 interest = calculateInterest(msg.sender);
        user.balance += interest; // Add interest to user's balance
        user.lastUpdate = block.timestamp; // Update last update time
    }
}