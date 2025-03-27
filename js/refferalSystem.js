const CONTRACT_ADDRESS = "0x1E125C10AA889D04Ee61fbcdA00Ed51c1d8BE926";
const CONTRACT_ABI = [
    "function generateReferralLink() external",
    "function registerWithReferral(bytes32 referralUUID) external",
    "function getMyReferrer() external view returns (address)",       // View function - no gas when called off-chain
    "function getMyReferrals() external view returns (address[])",    // View function - no gas when called off-chain
    "event ReferralLinkGenerated(address indexed referrer, bytes32 uuid)",
    "event UserRegistered(address indexed user, address indexed referrer)"
];

let referralSystemContract;

// Initialize contract only when needed
async function initializeContract() {
    const wallet = await WalletManager.getWallet();
    if (!wallet) return null;
    
    if (!referralSystemContract) {
        // Create contract instance with signer
        referralSystemContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet.signer);
    }
    return referralSystemContract;
}

// State-changing function - requires gas
async function generateReferralLink() {
    const contract = await initializeContract();
    if (!contract) throw new Error("Wallet not connected");
    
    // Send transaction to create referral link (state-changing operation)
    // - Returns TransactionResponse with basic tx metadata
    // - Transaction is now in mempool but not yet confirmed
    const tx = await contract.generateReferralLink();

    // Wait for transaction to be mined and get final receipt
    // - Returns TransactionReceipt with execution details
    // - This is where gas consumption actually happens
    // - Contains success status (1) and emitted events
    const receipt = await tx.wait();
    
    return receipt;
}

// State-changing function - requires gas
async function registerWithReferral(uuid) {
    const contract = await initializeContract();
    if (!contract) throw new Error("Wallet not connected");
    
    const tx = await contract.registerWithReferral(uuid);
    return tx.wait();
}

// View function - can be called off-chain without gas
async function getMyReferrer() {
    const contract = await initializeContract();
    if (!contract) throw new Error("Wallet not connected");
    
    return contract.getMyReferrer();
}

// View function - can be called off-chain without gas
async function getMyReferrals() {
    const contract = await initializeContract();
    if (!contract) throw new Error("Wallet not connected");
    
    return contract.getMyReferrals();
}

// Event reading - off-chain operation
async function getReferralFromEvents() {
    const contract = await initializeContract();
    const wallet = await WalletManager.getWallet();
    
    // Filter events for current account
    const filter = contract.filters.ReferralLinkGenerated(wallet.account, null);
    // Query events from genesis block to latest
    const events = await contract.queryFilter(filter, 0, "latest");
    return events.length > 0 ? events[events.length - 1].args.uuid : null;
}

window.ReferralSystem = {
    generateReferralLink,
    registerWithReferral,
    getMyReferrer,
    getMyReferrals,
    getReferralFromEvents
};