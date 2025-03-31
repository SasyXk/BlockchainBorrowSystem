// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import OpenZeppelin utilities with SafeERC20 and security features
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title LoanManager
 * @dev Manages collateralized loans with fixed fees and liquidation mechanisms
 * @notice Features:
 * - 150% over-collateralization requirement
 * - 5% fixed lending fee
 * - Chainlink price feeds with freshness checks
 * - Reentrancy protection
 * - Safe token transfers using OpenZeppelin's SafeERC20
 * - Administrative controls for price feed management
 */
contract LoanManager is ReentrancyGuard, Ownable {

    uint256 public loanCounter;

    // msg.sender becomes the initial owner
    constructor() Ownable(msg.sender) {
        loanCounter = 1;
    }

    using SafeERC20 for IERC20; // SafeERC20 for all token operations

    /**
     * @dev Loan structure storing key loan parameters
     * @param collateralToken Token deposited as collateral
     * @param loanToken Token being borrowed
     * @param collateralAmount Amount of collateral locked
     * @param loanAmount Original loan amount
     * @param totalOwed Total amount owed (principal + 5% fee)
     * @param repaidAmount Amount already repaid
     * @param idLoan To uniquely identify the loan
     * @param isRepaid Loan status flag
     */
    struct Loan {
        address collateralToken;
        address loanToken;        
        uint256 collateralAmount;
        uint256 loanAmount;       
        uint256 totalOwed;        
        uint256 repaidAmount;     
        uint256 idLoan;
        uint256 collateralValue;
        bool isRepaid;            
    }

    // Mappings
    mapping(address => Loan) public loans; // Active loans per user
    mapping(address => mapping(address => address)) public priceFeeds; // Collateral -> Loan -> PriceFeed

    // Events
    event LoanCreated(address indexed borrower, uint256 collateralAmount, uint256 loanAmount, uint256 idLoan);
    event LoanRepaid(address indexed borrower, uint256 amount, uint256 idLoan);
    event LoanLiquidated(address indexed borrower, address indexed liquidator, uint256 amountRepaid, uint256 idLoan);

    /**
     * @dev Modifier to validate address inputs
     * @param addr Address to check
     */
    modifier validAddress(address addr) {
        require(addr != address(0), "Invalid address");
        _;
    }

    /**
     * @notice Configure price feed for a token pair
     * @dev Restricted to contract owner
     * @param collateralToken Address of collateral token
     * @param loanToken Address of loan token
     * @param priceFeed Chainlink price feed address
     */
    function setPriceFeed(
        address collateralToken,
        address loanToken,
        address priceFeed
    ) external onlyOwner validAddress(collateralToken) validAddress(loanToken) {
        priceFeeds[collateralToken][loanToken] = priceFeed;
    }

    /**
     * @notice Create new collateralized loan
     * @dev Enforces 150% collateralization ratio
     * @param collateralToken Collateral token address
     * @param collateralAmount Collateral amount in token units
     * @param loanToken Loan token address
     * @param loanAmount Loan amount in token units
     */
    function createLoan(
        address collateralToken,
        uint256 collateralAmount,
        address loanToken,
        uint256 loanAmount
    ) external nonReentrant validAddress(collateralToken) validAddress(loanToken) {
        // Input validation
        require(loans[msg.sender].loanToken == address(0), "Existing active loan detected");
        require(collateralAmount > 0 && loanAmount > 0, "Amounts must be > 0");
        require(priceFeeds[collateralToken][loanToken] != address(0), "Price feed not set");
        
        // Contract liquidity check
        require(
            IERC20(loanToken).balanceOf(address(this)) / 5 >= loanAmount,
            "Insufficient contract liquidity"
        );
        // Sender liquidity check
        require(
            IERC20(collateralToken).balanceOf(msg.sender) >= collateralAmount,
            "Insufficient user balance"
        );
        // Sender allowance check
        require(
            IERC20(collateralToken).allowance(msg.sender, address(this)) >= collateralAmount,
            "Insufficient allowance for collateral"
        );
        // Collateral value verification
        uint256 collateralValue = getCollateralValue(collateralToken, loanToken, collateralAmount);
        require(collateralValue >= (loanAmount * 150) / 100, "Insufficient collateral");

        // Safe token transfers
        IERC20(collateralToken).safeTransferFrom(msg.sender, address(this), collateralAmount);
        IERC20(loanToken).safeTransfer(msg.sender, loanAmount);

    
        // New Id for the Loan
        loanCounter++;
        uint256 newLoanId = loanCounter;

        // Loan creation with 5% fee
        loans[msg.sender] = Loan({
            collateralToken: collateralToken,
            loanToken: loanToken,
            collateralAmount: collateralAmount,
            loanAmount: loanAmount,
            totalOwed: (loanAmount * 105) / 100,
            repaidAmount: 0,
            idLoan: newLoanId,
            collateralValue: collateralValue,
            isRepaid: false
        });

        emit LoanCreated(msg.sender, collateralAmount, loanAmount, newLoanId);
    }

    /**
     * @notice Calculate collateral value in loan token terms
     * @dev Includes price feed validation checks
     * @param collateralToken Collateral token address
     * @param loanToken Loan token address
     * @param collateralAmount Collateral amount
     * @return collateralValue Value of collateral in loan tokens
     */
    function getCollateralValue(
    address collateralToken,
    address loanToken,
    uint256 collateralAmount
) public view returns (uint256) {
    address priceFeedAddress = priceFeeds[collateralToken][loanToken];
    AggregatorV3Interface priceFeed = AggregatorV3Interface(priceFeedAddress);
    
    // Price validation
    (, int256 price,, uint256 updatedAt,) = priceFeed.latestRoundData();
    require(price > 0, "Invalid price");
    require(block.timestamp - updatedAt <= 24 hours || block.timestamp - updatedAt <= 1 hours, "Stale price");

    // Decimals
    uint8 priceDecimals = priceFeed.decimals();
    uint8 collateralDecimals = IERC20Metadata(collateralToken).decimals();
    uint8 loanDecimals = IERC20Metadata(loanToken).decimals();

    // Calculation with decimal adjustment
    uint256 value = (collateralAmount * uint256(price) * (10 ** loanDecimals)) 
                / (10 ** (priceDecimals + collateralDecimals));

    return value;
}

    /**
     * @notice Repay loan amount
     * @dev Releases collateral when fully repaid
     * @param repayAmount Amount to repay in loan tokens
     */
    function repayLoan(uint256 repayAmount) external nonReentrant {
        require(repayAmount > 0, "Repay amount must be > 0");
        Loan storage loan = loans[msg.sender];
        
        // Loan existence check
        require(loan.loanToken != address(0), "No active loan");
        require(!loan.isRepaid, "Loan already repaid");
        //require(loan.repaidAmount + repayAmount <= loan.totalOwed, "Overpayment");
        // Update repayment tracking
        if(loan.repaidAmount + repayAmount > loan.totalOwed){ //Overpayment
            repayAmount = loan.totalOwed - loan.repaidAmount;
        }
        loan.repaidAmount += repayAmount;

        // Safe token transfer
        IERC20(loan.loanToken).safeTransferFrom(msg.sender, address(this), repayAmount);

        // Collateral release upon full repayment
        if (loan.repaidAmount == loan.totalOwed) {
            loan.isRepaid = true;
            IERC20(loan.collateralToken).safeTransfer(msg.sender, loan.collateralAmount);
            delete loans[msg.sender];
        }

        emit LoanRepaid(msg.sender, repayAmount, loan.idLoan);
    }

    /**
     * @notice Liquidate undercollateralized loan
     * @dev Anyone can trigger when collateral < 150% of remaining debt
     * @param borrower Address of borrower to liquidate
     */
    function liquidateLoan(address borrower) external nonReentrant {
        Loan storage loan = loans[borrower];
        require(loan.loanToken != address(0), "No active loan");
        require(!loan.isRepaid, "Loan already repaid");
        require(msg.sender != borrower, "Borrower cannot self-liquidate");
        //require(msg.sender == tx.origin, "Smart contracts not allowed");

        // Collateral adequacy check
        uint256 currentCollateralValue = getCollateralValue(
            loan.collateralToken,
            loan.loanToken,
            loan.collateralAmount
        );
        
        uint256 remainingDebt = loan.totalOwed - loan.repaidAmount;
        uint256 requiredCollateral = (remainingDebt * 120) / 100;
        require(currentCollateralValue < requiredCollateral, "Collateral sufficient");
        require(
            IERC20(loan.collateralToken).balanceOf(address(this)) >= loan.collateralAmount,
            "Insufficient contract liquidity"
        );
        // Sender liquidity check
        require(
            IERC20(loan.loanToken).balanceOf(msg.sender) >= remainingDebt,
            "Insufficient user balance"
        );
        // Sender allowance check
        require(
            IERC20(loan.loanToken).allowance(msg.sender, address(this)) >= remainingDebt,
            "Insufficient allowance for loan token"
        );

        // Debt settlement and collateral transfer
        IERC20(loan.loanToken).safeTransferFrom(msg.sender, address(this), remainingDebt);
        loan.repaidAmount = loan.totalOwed;
        loan.isRepaid = true;
        IERC20(loan.collateralToken).safeTransfer(msg.sender, loan.collateralAmount);

        delete loans[borrower]; 
        
        emit LoanLiquidated(borrower, msg.sender, remainingDebt, loan.idLoan);
    }

    /**
     * @notice Emergency token recovery function
     * @dev Restricted to contract owner
     * @param token Address of token to recover
     * @param amount Amount to recover
     */
    function recoverToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}