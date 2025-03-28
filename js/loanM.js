
const CONTRACT_ADDRESS_LOANMANAGER = "0xf989Fea09d37aF50913A99e2a568c4d8363Ae4e1";
const CONTRACT_ABI_LOANMANAGER = [
    // Main functions
    "function createLoan(address collateralToken, uint256 collateralAmount, address loanToken, uint256 loanAmount) external",
    "function repayLoan(uint256 repayAmount) external",
    "function liquidateLoan(address borrower) external",
    
    // Configuration functions
    "function setPriceFeed(address collateralToken, address loanToken, address priceFeed) external",
    
    // View functions
    "function getCollateralValue(address collateralToken, address loanToken, uint256 collateralAmount) external view returns (uint256)",
    "function loans(address) external view returns (address collateralToken, address loanToken, uint256 collateralAmount, uint256 loanAmount, uint256 totalOwed, uint256 repaidAmount, uint256 idLoan, bool isRepaid)",
    "function priceFeeds(address, address) external view returns (address)",
    "function loanCounter() external view returns (uint256)",
    
    // Emergency functions
    "function recoverToken(address token, uint256 amount) external",
    
    // Events
    "event LoanCreated(address indexed borrower, uint256 collateralAmount, uint256 loanAmount, uint256 idLoan)",
    "event LoanRepaid(address indexed borrower, uint256 amount, uint256 idLoan)",
    "event LoanLiquidated(address indexed borrower, address indexed liquidator, uint256 amountRepaid, uint256 idLoan)"
];

let loanManagerContract;

// Initialize contract only when needed
async function initializeLoanManagerContract() {
    const wallet = await WalletManager.getWallet();
    if (!wallet) return null;
    
    if (!loanManagerContract) {
        // Create contract instance with signer
        loanManagerContract = new ethers.Contract(
            CONTRACT_ADDRESS_LOANMANAGER, 
            CONTRACT_ABI_LOANMANAGER, 
            wallet.signer
          );
    }
    return loanManagerContract;
}

async function getDecimals(tokenAddress) {
    const decimalsInterface = new ethers.utils.Interface(["function decimals() view returns (uint8)"]);
    const wallet = await WalletManager.getWallet();
    const decimalsData = await wallet.provider.call({
        to: tokenAddress,
        data: decimalsInterface.encodeFunctionData("decimals", [])
    });

   // Decode the response to get the number of decimal places
    const decimals = decimalsInterface.decodeFunctionResult("decimals", decimalsData)[0];
    return decimals;
}

async function createLoan(collateralToken,amountCollateralToken,loanToken,amountLoanToken) {
    const contract = await initializeLoanManagerContract();
    if (!contract) throw new Error("Wallet not connected");
    //console.log(collateralToken + " "+ amountCollateralToken + "\n " + loanToken + " "+ amountLoanToken);

    if (isNaN(amountCollateralToken) || isNaN(amountLoanToken)) {
        throw new Error("Invalid input: collateral amount or loan amount is not a number.");
    }

    if (amountCollateralToken <= 0 || amountLoanToken <= 0) {
        throw new Error("Invalid input: collateral amount or loan amount must be greater than zero.");
    }

    const collateralDecimals = await getDecimals(collateralToken);
    const loanDecimals = await getDecimals(loanToken);

    collateralAmountScaled = ethers.utils.parseUnits(amountCollateralToken.toString(), collateralDecimals);
    loanAmountScaled = ethers.utils.parseUnits(amountLoanToken.toString(), loanDecimals);

    const tx = await contract.createLoan(collateralToken,collateralAmountScaled,loanToken,loanAmountScaled);
    const receipt = await tx.wait();
    
    return receipt;
}

window.LoanM = {
    createLoan
};