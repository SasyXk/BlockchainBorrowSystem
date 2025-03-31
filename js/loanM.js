
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

async function approveToken(tokenAddress, spender, amount) {
    const wallet = await WalletManager.getWallet();
    const approveInterface = new ethers.utils.Interface(["function approve(address spender, uint256 amount) returns (bool)"]);

    const tx = await wallet.signer.sendTransaction({
        to: tokenAddress,
        data: approveInterface.encodeFunctionData("approve", [spender, amount])
    });

    await tx.wait();
    return tx;
}

async function getAllowance(tokenAddress, owner, spender) {
    const wallet = await WalletManager.getWallet();
    const allowanceInterface = new ethers.utils.Interface(["function allowance(address owner, address spender) view returns (uint256)"]);

    const allowanceData = await wallet.provider.call({
        to: tokenAddress,
        data: allowanceInterface.encodeFunctionData("allowance", [owner, spender])
    });

    const allowance = allowanceInterface.decodeFunctionResult("allowance", allowanceData)[0];
    return allowance;
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


    const wallet = await WalletManager.getWallet();
    const allowance = await getAllowance(collateralToken, wallet.account, contract.address);

    console.log('Allowance:', allowance.toString());
    console.log('Collateral Amount Scaled:', collateralAmountScaled.toString());

    if (allowance.lt(collateralAmountScaled)) { //less than
        await approveToken(collateralToken, contract.address, collateralAmountScaled);
    }
    const tx = await contract.createLoan(collateralToken,collateralAmountScaled,loanToken,loanAmountScaled);
    const receipt = await tx.wait();
    
    return receipt;
}

async function getTokenSymbol(tokenAddress) {

    if (!ethers.utils.isAddress(tokenAddress)) {
        console.error("Invalid token address:", tokenAddress);
        return "Unknown"; 
    }

    const wallet = await WalletManager.getWallet();
    if (!wallet) throw new Error("Wallet not connected");

    const erc20Interface = new ethers.utils.Interface([
        "function symbol() view returns (string)"
    ]);

    const contract = new ethers.Contract(tokenAddress, erc20Interface, wallet.provider);

    try {
        const symbol = await contract.symbol();
        console.log("Token Symbol:", symbol);  // Debug
        return symbol;
    } catch (error) {
        console.error("Error getting token symbol:", error);
        return "Unknown"; 
    }
}

async function getActiveLoan(address) {
    const contract = await initializeLoanManagerContract();
    if (!contract) throw new Error("Wallet not connected");

    let loan = await contract.loans(address);
// wallet.account
    // If there is no active loan, the loanToken address is zero
    if (loan.loanToken === ethers.constants.AddressZero) {
        return null;
    }
    const collateralDecimals = await getDecimals(loan.collateralToken);
    const loanDecimals = await getDecimals(loan.loanToken);
    console.log(collateralDecimals + " " + loanDecimals);
    loan.collateralAmount = ethers.utils.formatUnits(loan.collateralAmount, collateralDecimals)
    loan.loanAmount = ethers.utils.formatUnits(loan.loanAmount, loanDecimals)
    console.log(`
        Loan details for account ${wallet.account}:
        Collateral Token Address: ${loan.collateralToken}
        Loan Token Address: ${loan.loanToken}
        Collateral Amount: ${loan.collateralAmount ? ethers.utils.formatUnits(loan.collateralAmount, collateralDecimals) : 'N/A'} (scaled to token decimals)
        Loan Amount: ${loan.loanAmount ? ethers.utils.formatUnits(loan.loanAmount, loanDecimals) : 'N/A'} (scaled to token decimals)
        Total Owed: ${loan.totalOwed ? ethers.utils.formatUnits(loan.totalOwed, loanDecimals) : 'N/A'} (scaled to token decimals)
        Repaid Amount: ${loan.repaidAmount ? ethers.utils.formatUnits(loan.repaidAmount, loanDecimals) : 'N/A'} (scaled to token decimals)
        Loan ID: ${loan.idLoan || 'N/A'}
        Collateral Value: ${loan.collateralValue ? ethers.utils.formatUnits(loan.collateralValue, collateralDecimals) : 'N/A'} (scaled to token decimals)
        Is Repaid: ${loan.isRepaid ? "Yes" : "No"}
    `);
    
    //console.log("Loan details:", loan);

    return loan;
}

async function repayLoan(repayAmount) {
    const contract = await initializeLoanManagerContract();
    if (!contract) throw new Error("Wallet not connected");

    if (repayAmount <= 0) {
        throw new Error("Invalid input: loan amount must be greater than zero.");
    }
    const wallet = await WalletManager.getWallet();
    const loan = await LoanM.getActiveLoan(wallet.account);
    if (loan.loanToken === ethers.constants.AddressZero) {
        throw new Error("Invalid token address: The loan is no longer available");
    }
    const loanDecimals = await getDecimals(loan.loanToken);
    repayAmountScaled = ethers.utils.parseUnits(repayAmount.toString(), loanDecimals);

    const tx = await contract.repayLoan(repayAmountScaled);
    const receipt = await tx.wait();
    console.log("repayLoan(): amount " + repayAmountScaled);

    return receipt;
}


async function getActiveLoans() {
    const contract = await initializeLoanManagerContract();
    if (!contract) throw new Error("Wallet not connected");
}

window.LoanM = {
    createLoan,
    getActiveLoan,
    repayLoan,
    getActiveLoans
};