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
            
            const loanDecimals = await getDecimals(loan.loanToken);
            const collateralDecimals = await getDecimals(loan.collateralToken);

            const collateralAmount = ethers.utils.formatUnits(loan.collateralAmount, collateralDecimals);
            const loanAmount = ethers.utils.formatUnits(loan.loanAmount, loanDecimals);
            const remainingDebt = ethers.utils.formatUnits(loan.totalOwed.sub(loan.repaidAmount), loanDecimals);
            const collateralSymbol = await getTokenSymbol(loan.collateralToken)
            const loanSymbol = await getTokenSymbol(loan.loanToken)
            card.innerHTML = `
                <h3>Loan #${loan.idLoan.toString()}</h3>
                <p><strong>Borrower:</strong> ${loan.borrower}</p>
                <p><strong>Collateral:</strong> ${collateralAmount} ${collateralSymbol}</p>
                <p><strong>Loan Amount:</strong> ${loanAmount} ${loanSymbol}</p>
                <p><strong>Remaining Debt:</strong> ${remainingDebt} ${loanSymbol}</p>
                <p><strong>Status:</strong> ${loan.isRepaid ? 'Repaid' : 'Active'}</p>
                <button id="liquidate-btn-${index}" data-borrower="${loan.borrower}">Liquided
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