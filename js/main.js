// Helper function for UI updates
async function updateUI(elementId, content) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerText = content;
        element.classList.remove('hidden');
    }
}

// Handle wallet connection
async function handleWalletConnect() {
    try {
        const wallet = await WalletManager.getWallet();
        if (wallet) {
            updateUI("walletAddressSidebarText", `Connected: ${wallet.account}`);
            initializeApp();
            // Show the sidebar content when wallet is connected
            document.getElementById("sidebar").classList.add("active");
            document.getElementById("sidebarOverlay").classList.add("active");
            document.getElementById("connectScreen").classList.add("hidden");
        }
    } catch (error) {
        console.error("Wallet connection failed:", error);
    }
}

function initializeApp() {
    // Assign handlers to UI elements
    document.getElementById("generateReferral").addEventListener("click", handleGenerateReferral);
    document.getElementById("registerReferral").addEventListener("click", handleRegister);
    document.getElementById("getMyReferrer").addEventListener("click", handleGetReferrer);
    document.getElementById("getMyReferrals").addEventListener("click", handleGetReferrals);
    document.getElementById("getMyReferralEvent").addEventListener("click", handleGetReferralEvent);
    document.getElementById("createLoan").addEventListener("click", handleCreateLoan);
    document.getElementById("repayLoan").addEventListener("click", handleRepayLoan);
    document.getElementById("depositBtn").addEventListener("click", handleDeposit);
    document.getElementById("withdrawBtn").addEventListener("click", handleWithdraw);
    
    // Initialize UI components - use classList instead of style
    document.getElementById("repayLoanContainer").classList.add("hidden");
    updateBalances();
    updateRepayLoanUI();
    handleCreateLiquidLoan();
    
    // Show the sidebar
    document.getElementById("sidebar").classList.add("active");
    document.getElementById("sidebarOverlay").classList.add("active");
}

// Handle referral link generation
async function handleGenerateReferral() {
    try {
        updateUI("referralLink", "Generating referral link...");
        const receipt = await ReferralSystem.generateReferralLink();
        const uuid = await ReferralSystem.getReferralFromEvents();
        updateUI("referralLink", `Your Referral UUID: ${uuid}`);
    } catch (error) {
        updateUI("referralLink", `Error: ${error.reason || error.message}`);
    }
}

// Handle referral registration
async function handleRegister() {
    const uuid = document.getElementById("referralUUID").value;
    try {
        updateUI("registrationStatus", "Registering with referral...");
        await ReferralSystem.registerWithReferral(uuid);
        updateUI("registrationStatus", "✅ Registration successful!");
    } catch (error) {
        updateUI("registrationStatus", `❌ Error: ${error.reason || error.message}`);
    }
}

// Handle referrer fetch
async function handleGetReferrer() {
    try {
        updateUI("myReferrer", "Loading referrer...");
        const referrer = await ReferralSystem.getMyReferrer();
        updateUI("myReferrer", referrer === ethers.constants.AddressZero ? "No referrer found" : referrer);
    } catch (error) {
        updateUI("myReferrer", `❌ Error: ${error.message}`);
    }
}

// Handle referrals fetch
async function handleGetReferrals() {
    try {
        updateUI("myReferrals", "Loading referrals...");
        const referrals = await ReferralSystem.getMyReferrals();
        updateUI("myReferrals", referrals.length > 0 ? referrals.join("\n") : "No referrals found");
    } catch (error) {
        updateUI("myReferrals", `❌ Error: ${error.message}`);
    }
}

// Handle event-based referral fetch
async function handleGetReferralEvent() {
    try {
        updateUI("myReferralEvent", "Loading referral from events...");
        const uuid = await ReferralSystem.getReferralFromEvents();
        updateUI("myReferralEvent", uuid || "No referral link found in events");
    } catch (error) {
        updateUI("myReferralEvent", `❌ Error: ${error.message}`);
    }
}

// Update all balance displays
async function updateBalances() {
    try {
        const [userInfo, tokenBalance] = await Promise.all([
            DepositPool.getUserInfo(),
            PonziToken.getBalance()
        ]);

        const formatBalance = (value) => {
            const formatted = ethers.utils.formatEther(value);
            const decimalIndex = formatted.indexOf('.');
            return decimalIndex !== -1 ? formatted.substring(0, decimalIndex + 7) : formatted;
        };

        updateUI("tokenBalance", formatBalance(tokenBalance));
        updateUI("depositedBalance", formatBalance(userInfo.principal));
        updateUI("earnedInterest", formatBalance(userInfo.earnedInterest));
        updateUI("withdrawableAmount", formatBalance(userInfo.withdrawableAmount));
        
    } catch (error) {
        console.error("Balance update error:", error);
        updateUI("depositStatus", `❌ Error updating balances: ${error.message}`);
    }
}

// Handle deposit action
async function handleDeposit() {
    const amountInput = document.getElementById("depositAmount").value;
    try {
        if (!amountInput || isNaN(amountInput)) {
            throw new Error("Invalid amount");
        }

        updateUI("depositStatus", "Checking balance...");
        const balance = await PonziToken.getBalance();
        const balanceEth = ethers.utils.formatEther(balance);
        
        if (parseFloat(amountInput) > parseFloat(balanceEth)) {
            throw new Error(`Insufficient balance. You have ${balanceEth} PONZI`);
        }

        updateUI("depositStatus", "Approving tokens...");
        const approveTx = await PonziToken.approve(DEPOSIT_POOL_ADDRESS, amountInput);
        await approveTx.wait();
        
        updateUI("depositStatus", "Depositing...");
        const depositTx = await DepositPool.deposit(amountInput);
        await depositTx.wait();
        
        updateUI("depositStatus", "✅ Deposit successful! Updating balances...");
        await updateBalances();
        
    } catch (error) {
        console.error("Deposit failed:", error);
        updateUI("depositStatus", `❌ ${error.reason || error.message}`);
    }
}

// Handle withdraw action
async function handleWithdraw() {
    const amountInput = document.getElementById("withdrawAmount").value;
    try {
        if (!amountInput || isNaN(amountInput)) {
            throw new Error("Invalid amount");
        }

        updateUI("withdrawStatus", "Checking withdrawable balance...");
        const userInfo = await DepositPool.getUserInfo();
        const withdrawableEth = ethers.utils.formatEther(userInfo.withdrawableAmount);
        
        if (parseFloat(amountInput) > parseFloat(withdrawableEth)) {
            throw new Error(`Cannot withdraw more than ${withdrawableEth} PONZI`);
        }

        updateUI("withdrawStatus", "Withdrawing...");
        const withdrawTx = await DepositPool.withdraw(amountInput);
        const receipt = await withdrawTx.wait();
        
        if (receipt.status === 1) {
            updateUI("withdrawStatus", "✅ Withdrawal successful! Updating balances...");
            await updateBalances();
        } else {
            throw new Error("Transaction failed");
        }
        
    } catch (error) {
        console.error("Withdraw failed:", error);
        updateUI("withdrawStatus", `❌ ${error.reason || error.message}`);
    }
}

// Handle loan creation
async function handleCreateLoan() {
    try {
        const collateralToken = document.getElementById("collateralToken").value;
        const amountCollateralToken = document.getElementById("amountCollateralToken").value;
        const loanToken = document.getElementById("loanToken").value;
        const amountLoanToken = document.getElementById("amountLoanToken").value;
        
        updateUI("myCreateLoan", "Creating loan...");
        const result = await LoanM.createLoan(collateralToken, amountCollateralToken, loanToken, amountLoanToken);
        
        await updateRepayLoanUI();
        await handleCreateLiquidLoan();
        updateUI("myCreateLoan", "✅ Loan created successfully!");
    } catch (error) {
        console.error("Create loan error:", error);
        updateUI("myCreateLoan", `❌ Error: ${error.reason || error.message}`);
    }
}

// Update repay loan UI
async function updateRepayLoanUI() {
    try {
        const wallet = await WalletManager.getWallet();
        const loan = await LoanM.getActiveLoan(wallet.account);
        
        if (!loan || loan.loanToken === ethers.constants.AddressZero) {
            document.getElementById("repayLoanContainer").classList.add("hidden");
            updateUI("MyrepayLoan", "No active loan found");
            return;
        }
        
        document.getElementById("repayLoanContainer").classList.remove("hidden");
        const remainingDebtScaled = loan.totalOwed.sub(loan.repaidAmount);
        
        const loanDecimals = await getDecimals(loan.loanToken);
        const remainingDebt = parseFloat(ethers.utils.formatUnits(remainingDebtScaled, loanDecimals));
        updateUI("remainingDebtDisplay", `Remaining Debt: ${remainingDebt} ${await getTokenSymbol(loan.loanToken)}`);
    
        const slider = document.getElementById("repaySlider");
        slider.min = 0;
        slider.max = remainingDebt;
        slider.step = remainingDebt / 100;
        slider.value = slider.min;
        document.getElementById("repayValue").innerText = slider.value;
        
    } catch (error) {
        console.error("Error updating repay loan UI:", error);
        updateUI("MyrepayLoan", `❌ Error: ${error.reason || error.message}`);
    }
}

// Handle loan repayment
async function handleRepayLoan() {
    try {
        const repayAmount = document.getElementById("repaySlider").value;
        updateUI("MyrepayLoan", "Processing repayment...");
        
        const result = await LoanM.repayLoan(repayAmount);
        await updateRepayLoanUI();
        await handleCreateLiquidLoan();
        
        updateUI("MyrepayLoan", "✅ Repayment successful!");
    } catch (error) {
        console.error("Repay loan error:", error);
        updateUI("MyrepayLoan", `❌ Error: ${error.reason || error.message}`);
    }
}

// Create liquid loan UI
async function handleCreateLiquidLoan() {
    try {
        const container = document.getElementById('liquidLoanContainer');
        container.innerHTML = '<p>Loading active loans...</p>';
        
        const activeLoans = await LoanM.getActiveLoans();
        container.innerHTML = '';
        
        if (activeLoans.length === 0) {
            container.innerHTML = '<p>No active loans found</p>';
            return;
        }
        
        for (const loan of activeLoans) {
            const card = document.createElement('div');
            card.className = 'loan-card';
            
            const loanDecimals = await getDecimals(loan.loanToken);
            const collateralDecimals = await getDecimals(loan.collateralToken);
            
            const collateralAmount = ethers.utils.formatUnits(loan.collateralAmount, collateralDecimals);
            const loanAmount = ethers.utils.formatUnits(loan.loanAmount, loanDecimals);
            const remainingDebt = ethers.utils.formatUnits(loan.totalOwed.sub(loan.repaidAmount), loanDecimals);
            const collateralSymbol = await getTokenSymbol(loan.collateralToken);
            const loanSymbol = await getTokenSymbol(loan.loanToken);
            
            card.innerHTML = `
                <h3>Loan #${loan.idLoan.toString()}</h3>
                <div><strong>Borrower:</strong> ${loan.borrower}</div>
                <div><strong>Collateral:</strong> ${collateralAmount} ${collateralSymbol}</div>
                <div><strong>Loan Amount:</strong> ${loanAmount} ${loanSymbol}</div>
                <div><strong>Remaining Debt:</strong> ${remainingDebt} ${loanSymbol}</div>
                <div><strong>Status:</strong> ${loan.isRepaid ? 'Repaid' : 'Active'}</div>
                <button class="btn btn-primary" data-borrower="${loan.borrower}" style="margin-top: 10px;">
                    <i class="fas fa-exclamation-triangle"></i> Liquidate
                </button>
                <hr>
            `;
            
            container.appendChild(card);
            card.querySelector('button').addEventListener('click', (e) => {
                handleLiquidateLoan(e.target.getAttribute('data-borrower'));
            });
        }
    } catch (error) {
        console.error("handleCreateLiquidLoan:", error);
        document.getElementById('liquidLoanContainer').innerHTML = `<p class="error">❌ Error: ${error.reason || error.message}</p>`;
    }
}

// Handle loan liquidation
async function handleLiquidateLoan(borrowerAddress) {
    try {
        if (!confirm(`Are you sure you want to liquidate loan for ${borrowerAddress}?`)) return;
        
        const result = await LoanM.liquidateLoan(borrowerAddress);
        await updateRepayLoanUI();
        await handleCreateLiquidLoan();
        
        alert("✅ Loan liquidated successfully!");
    } catch (error) {
        console.error("Liquidation failed:", error);
        alert(`❌ Liquidation failed: ${error.reason || error.message}`);
    }
}

// Initialize event listeners
window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("connectWallet").addEventListener("click", handleWalletConnect);
});