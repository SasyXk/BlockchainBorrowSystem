document.getElementById("referralSystemContainer").style.display = "none";
document.getElementById("loanManagerContainer").style.display = "none";
document.getElementById("repayLoanContainer").style.display = "none";

// Helper function for UI updates
async function updateUI(elementId, content) {
    document.getElementById(elementId).innerText = content;
}

// Handle referral link generation
async function handleGenerateReferral() {
    try {
        // State-changing call (gas required)
        const receipt = await ReferralSystem.generateReferralLink();
        // Off-chain event reading (no gas)
        const uuid = await ReferralSystem.getReferralFromEvents();
        updateUI("referralLink", `Your Referral UUID: ${uuid}`);
    } catch (error) {
        updateUI("referralLink", `Error{${error.reason || error.message}}`);
    }
}

// Handle referral registration
async function handleRegister() {
    const uuid = document.getElementById("referralUUID").value;
    try {
        // State-changing call (gas required)
        await ReferralSystem.registerWithReferral(uuid);
        updateUI("registrationStatus", "Registration successful!");
    } catch (error) {
        updateUI("registrationStatus", `Error: {${error.reason || error.message}}`);
    }
}

// Handle referrer fetch
async function handleGetReferrer() {
    try {
        // View function call (no gas)
        const referrer = await ReferralSystem.getMyReferrer();
        updateUI("myReferrer", referrer === ethers.constants.AddressZero ? "None" : referrer);
    } catch (error) {
        updateUI("myReferrer", `Error: {${error.message}}`);
    }
}

// Handle referrals fetch
async function handleGetReferrals() {
    try {
        // View function call (no gas)
        const referrals = await ReferralSystem.getMyReferrals();
        updateUI("myReferrals", referrals.join("\n") || "No referrals found");
    } catch (error) {
        updateUI("myReferrals", `Error: {${error.message}}`);
    }
}

// Handle event-based referral fetch
async function handleGetReferralEvent() {
    try {
        // Direct event reading (no gas)
        const uuid = await ReferralSystem.getReferralFromEvents();
        updateUI("myReferralEvent", uuid || "No referral link found");
    } catch (error) {
        updateUI("myReferralEvent", `Error: {${error.message}}`);
    }
}

async function updateBalances() {
    try {
        const [userInfo, tokenBalance] = await Promise.all([
            DepositPool.getUserInfo(),
            PonziToken.getBalance()
        ]);

        // Format numbers to 6 decimal places for display
        const formatBalance = (value) => {
            const formatted = ethers.utils.formatEther(value);
            // Trim to 6 decimal places
            const decimalIndex = formatted.indexOf('.');
            if (decimalIndex !== -1) {
                return formatted.substring(0, decimalIndex + 7);
            }
            return formatted;
        };

        updateUI("tokenBalance", formatBalance(tokenBalance));
        updateUI("depositedBalance", formatBalance(userInfo.principal));
        updateUI("earnedInterest", formatBalance(userInfo.earnedInterest));
        updateUI("withdrawableAmount", formatBalance(userInfo.withdrawableAmount));
        
    } catch (error) {
        console.error("Balance update error:", error);
        updateUI("depositStatus", `Error updating balances: ${error.message}`);
    }
}

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

async function handleCreateLoan() {
    try {
        const collateralToken = document.getElementById("collateralToken").value;
        const amountCollateralToken = document.getElementById("amountCollateralToken").value;
        const loanToken = document.getElementById("loanToken").value;
        const amountLoanToken = document.getElementById("amountLoanToken").value;
        const resutl = await LoanM.createLoan(collateralToken,amountCollateralToken,loanToken,amountLoanToken);
        //const referrer = await ReferralSystem.getMyReferrer();
        //alert(collateralToken +" " + loanToken + " " + amountLoanToken);
        //updateUI("myReferralEvent", uuid || "No referral link found");
        await updateRepayLoanUI();
        await handleCreateLiquidLoan();
        updateUI("myCreateLoan", resutl);
    } catch (error) {
        console.log(error);
        //updateUI("myCreateLoan", `Error: {${error.message}}`);
        updateUI("myCreateLoan", `Error: {${error.reason || error.message}}`);
    }
}

// Function that updates the UI for repayment, reading the active loan and configuring the slider
async function updateRepayLoanUI() {
    try {
      const wallet = await WalletManager.getWallet();
      const loan = await LoanM.getActiveLoan(wallet.account);
      if (!loan || loan.loanToken === ethers.constants.AddressZero) {
        document.getElementById("repayLoanContainer").style.display = "none";
        updateUI("MyrepayLoan", "No active loan found");
        return;
      }
      document.getElementById("repayLoanContainer").style.display = "block";
      const remainingDebtScaled = loan.totalOwed.sub(loan.repaidAmount);
      
      const loanDecimals = await getDecimals(loan.loanToken);
      const remainingDebt = parseFloat(ethers.utils.formatUnits(remainingDebtScaled, loanDecimals));
      document.getElementById("remainingDebtDisplay").innerText = 
                              `Remaining Debt: ${remainingDebt} ${await getTokenSymbol(loan.loanToken)}`;
  
      //Slider configuartion
      const slider = document.getElementById("repaySlider");
      slider.min = 0;
      slider.max = remainingDebt;
      slider.step = remainingDebt / 100;
      slider.value = slider.min;
  
      document.getElementById("repayValue").innerText = slider.value;
  
      slider.addEventListener("input", (event) => {
        document.getElementById("repayValue").innerText = event.target.value;
      });
    } catch (error) {
      console.error("Error updating repay loan UI:", error);
      updateUI("MyrepayLoan", `Error: {${error.reason || error.message}}`);
    }
  }

async function handleRepayLoan() {
    try {
        const repayAmount = document.getElementById("repaySlider").value;
        const result = await LoanM.repayLoan(repayAmount);
        await updateRepayLoanUI();
        await handleCreateLiquidLoan();
        updateUI("MyrepayLoan", result);
    } catch (error) {
    console.error("Repay loan error:", error);
    updateUI("MyrepayLoan", `Error: {${error.reason || error.message}}`);
    }
}

async function handleCreateLiquidLoan(){
    try{
        const activeLoans = await LoanM.getActiveLoans();
        console.log("ACTIVE LOAN:");
        console.log(activeLoans);
        console.log("FINISH");
        const container = document.getElementById('liquidLoanContainer');
        container.innerHTML = '';
        if (activeLoans.length === 0) {
            container.innerHTML = '<p>No active loans found</p>';
            return;
        }
        activeLoans.forEach(async (loan, index) => {
            const card = document.createElement('div');
            card.style.border = '1px solid #ccc';
            card.style.margin = '10px 0';
            card.style.padding = '10px';

            const loanDecimals = await getDecimals(loan.loanToken);
            const collateralDecimals = await getDecimals(loan.collateralToken);

            const collateralAmount = ethers.utils.formatUnits(loan.collateralAmount, collateralDecimals);
            const loanAmount = ethers.utils.formatUnits(loan.loanAmount, loanDecimals);
            const remainingDebt = ethers.utils.formatUnits(loan.totalOwed.sub(loan.repaidAmount), loanDecimals);
            const collateralSymbol = await getTokenSymbol(loan.collateralToken)
            const loanSymbol = await getTokenSymbol(loan.loanToken)
            card.innerHTML = `
                <div style="display: block; margin-bottom: 8px;">
                    <h3 style="margin: 0 0 5px 0;">Loan #${loan.idLoan.toString()}</h3>
                    <div><strong>Borrower:</strong> ${loan.borrower}</div>
                    <div><strong>Collateral:</strong> ${collateralAmount} ${collateralSymbol}</div>
                    <div><strong>Loan Amount:</strong> ${loanAmount} ${loanSymbol}</div>
                    <div><strong>Remaining Debt:</strong> ${remainingDebt} ${loanSymbol}</div>
                    <div><strong>Status:</strong> ${loan.isRepaid ? 'Repaid' : 'Active'}</div>
                </div>
                <button 
                    id="liquidate-btn-${index}" 
                    data-borrower="${loan.borrower}"
                    style="margin-top: 10px; padding: 5px 10px;"
                >
                    Liquidate
                </button>
                <hr style="margin: 15px 0 10px 0;">
            `;
            container.appendChild(card);

            document.getElementById(`liquidate-btn-${index}`).addEventListener('click', (e) => {
                const borrower = e.target.getAttribute('data-borrower');
                handleLiquidateLoan(borrower);
            });
        });
    } catch (error) {
        console.error("handleCreateLiquidLoan:", error);
        container.innerHTML = `<p>Error: {${error.reason || error.message}}}</p>`;
    } 
}

async function handleLiquidateLoan(borrowerAddress) {
    try {
        console.log(`Liquidating loan ${borrowerAddress}`);
        await LoanM.liquidateLoan(borrowerAddress);

        await updateRepayLoanUI();
        await handleCreateLiquidLoan();
        
    } catch (error) {
        console.error("Liquidation failed:", error);
        alert(`Liquidation failed: ${error.reason || error.message}`);
    }
}

  function initializeApp(){
    // Assign handlers to UI elements
    document.getElementById("referralSystemContainer").style.display = "block";
    document.getElementById("loanManagerContainer").style.display = "block";
    document.getElementById("generateReferral").addEventListener("click", handleGenerateReferral);
    document.getElementById("registerReferral").addEventListener("click", handleRegister);
    document.getElementById("getMyReferrer").addEventListener("click", handleGetReferrer);
    document.getElementById("getMyReferrals").addEventListener("click", handleGetReferrals);
    document.getElementById("getMyReferralEvent").addEventListener("click", handleGetReferralEvent);
    document.getElementById("createLoan").addEventListener("click", handleCreateLoan);
    document.getElementById("repayLoan").addEventListener("click", handleRepayLoan);
    document.getElementById("depositBtn").addEventListener("click", handleDeposit);
    document.getElementById("withdrawBtn").addEventListener("click", handleWithdraw);
    updateRepayLoanUI();
    handleCreateLiquidLoan();
  }

  async function handleWalletConnect() {
    WalletManager.getWallet().then(wallet => {
        if (wallet) {
            updateUI("walletAddress", `Connected: ${wallet.account}`);
            initializeApp();
        }
    });
  }
  
// Initialize event listeners
window.addEventListener("DOMContentLoaded", () => {
    // Wallet connection handler
    document.getElementById("connectWallet").addEventListener("click", handleWalletConnect);
});
