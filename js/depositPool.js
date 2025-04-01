const DEPOSIT_POOL_ADDRESS = "0x444B7b8d830DF8B5817193dE2EEbA9553be23612"; // Your DepositPool address
const DEPOSIT_POOL_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_token",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "Deposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "Withdrawn",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "INTEREST_RATE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "calculateInterest",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "loanManager",
    "outputs": [
      {
        "internalType": "contract LoanManager",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_loanManager",
        "type": "address"
      }
    ],
    "name": "setLoanManager",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalDeposits",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "users",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "lastUpdate",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "withdrawToLoanManager",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];


let depositPoolContract;

async function getDepositPool() {
    if (depositPoolContract) return depositPoolContract;
    
    const wallet = await WalletManager.getWallet();
    if (!wallet) throw new Error("Wallet not connected");
    
    depositPoolContract = new ethers.Contract(
        DEPOSIT_POOL_ADDRESS,
        DEPOSIT_POOL_ABI,
        wallet.signer
    );
    return depositPoolContract;
}

async function deposit(amount) {
    const contract = await getDepositPool();
    const amountWei = ethers.utils.parseEther(amount.toString());
    return contract.deposit(amountWei);
}

async function withdraw(amount) {
    const contract = await getDepositPool();
    const amountWei = ethers.utils.parseEther(amount.toString());
    return contract.withdraw(amountWei);
}

async function getUserInfo() {
  console.log("gay");
    try {
        const contract = await getDepositPool();
        const wallet = await WalletManager.getWallet();
        if (!wallet) return {
            principal: ethers.constants.Zero,
            earnedInterest: ethers.constants.Zero,
            withdrawableAmount: ethers.constants.Zero
        };
        
        const address = await wallet.signer.getAddress();
        const userData = await contract.users(address);
        const interest = await contract.calculateInterest(address);
        
        return {
            principal: userData.balance,
            earnedInterest: interest,
            withdrawableAmount: userData.balance.add(interest)
        };
    } catch (error) {
        console.error("Error getting user info:", error);
        return {
            principal: ethers.constants.Zero,
            earnedInterest: ethers.constants.Zero,
            withdrawableAmount: ethers.constants.Zero
        }
    }
}

window.DepositPool = {
    deposit,  // Make sure this is included in exports
    withdraw,
    getUserInfo
};