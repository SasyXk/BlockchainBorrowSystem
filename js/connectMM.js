(function () { // IIFE to keep wallet state private
    let wallet = null;

    async function connectWallet() {
        if (wallet) return wallet;
    
        if (!window.ethereum) {
            alert("MetaMask is not installed");
            return null;
        }
    
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
            const signer = provider.getSigner();
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    
            wallet = { provider, signer, account: accounts[0] };
            console.log("Wallet connected:", wallet);
    
            await updateBalances();
    
            return wallet;
        } catch (error) {
            console.error("Wallet connection failed", error);
            return null;
        }
    }

    async function getWallet() {
        if (!wallet) return await connectWallet();
        return wallet;
    }

    // Expose safe methods via global object
    window.WalletManager = { getWallet };
})();