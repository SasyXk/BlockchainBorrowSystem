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
});