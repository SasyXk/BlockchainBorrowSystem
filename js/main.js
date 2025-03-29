//console.log(window.LoanManager); 


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
        console.log("Work?");
        const collateralToken = document.getElementById("collateralToken").value;
        const amountCollateralToken = document.getElementById("amountCollateralToken").value;
        const loanToken = document.getElementById("loanToken").value;
        const amountLoanToken = document.getElementById("amountLoanToken").value;
        const resutl = await LoanM.createLoan(collateralToken,amountCollateralToken,loanToken,amountLoanToken);
        //const referrer = await ReferralSystem.getMyReferrer();
        //alert(collateralToken +" " + loanToken + " " + amountLoanToken);
        //updateUI("myReferralEvent", uuid || "No referral link found");
        updateUI("myCreateLoan", resutl);
    } catch (error) {
        console.log(error);
        //updateUI("myCreateLoan", `Error: {${error.message}}`);
        updateUI("myCreateLoan", `Error: {${error.reason || error.message}}`);
    }
}

// Function that updates the UI for repayment, reading the active loan and configuring the slider
async function updateRepayLoanUI() {
    console.log("HHHH");
    try {
      const loan = await LoanM.getActiveLoan();
      if (!loan) {
        document.getElementById("repayLoanContainer").style.display = "none";
        updateUI("MyrepayLoan", "No active loan found");
        return;
      }
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
      slider.value = slider.min; // valore iniziale
  
      document.getElementById("repayValue").innerText = slider.value;
  
      slider.addEventListener("input", (event) => {
        document.getElementById("repayValue").innerText = event.target.value;
      });
    } catch (error) {
      console.error("Error updating repay loan UI:", error);
      updateUI("MyrepayLoan", `Error: ${error.message}`);
    }
  }

  async function handleRepayLoan() {
    try {
        const repayAmount = document.getElementById("repaySlider").value;
        // Converti repayAmount nel formato richiesto (ad esempio con ethers.utils.parseUnits)
        // Esegui la funzione di rimborso dal file LoanM.js (da implementare)
        const result = await LoanM.repayLoan(repayAmount);
        updateUI("MyrepayLoan", result);
      } catch (error) {
        console.error("Repay loan error:", error);
        updateUI("MyrepayLoan", `Error: ${error.message}`);
      }
  }
  
// Initialize event listeners
window.addEventListener("DOMContentLoaded", () => {
    // Wallet connection handler
    document.getElementById("connectWallet").addEventListener("click", () => {
        WalletManager.getWallet().then(wallet => {
            if (wallet) updateUI("walletAddress", `Connected: ${wallet.account}`);
        });
    });

    // Assign handlers to UI elements
    document.getElementById("generateReferral").addEventListener("click", handleGenerateReferral);
    document.getElementById("registerReferral").addEventListener("click", handleRegister);
    document.getElementById("getMyReferrer").addEventListener("click", handleGetReferrer);
    document.getElementById("getMyReferrals").addEventListener("click", handleGetReferrals);
    document.getElementById("getMyReferralEvent").addEventListener("click", handleGetReferralEvent);
    document.getElementById("createLoan").addEventListener("click", handleCreateLoan);
    document.getElementById("repayLoan").addEventListener("click", handleRepayLoan);
   
    updateRepayLoanUI();
});