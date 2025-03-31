// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IReferralSystem {
    function generateReferralLink() external;
    function registerWithReferral(bytes32 referralUUID) external;
    function getMyReferrer() external view returns (address);
    function getMyReferrals() external view returns (address[] memory);
}

contract SimpleReferralCaller {
    IReferralSystem public constant REFERRAL_SYSTEM = 
        IReferralSystem(0x1E125C10AA889D04Ee61fbcdA00Ed51c1d8BE926);

    function generateLink() external {
        REFERRAL_SYSTEM.generateReferralLink();
    }

    function register(bytes32 uuid) external {
        REFERRAL_SYSTEM.registerWithReferral(uuid);
    }

    function getReferrer() external view returns (address) {
        return REFERRAL_SYSTEM.getMyReferrer();
    }

    function getReferrals() external view returns (address[] memory) {
        return REFERRAL_SYSTEM.getMyReferrals();
    }
}