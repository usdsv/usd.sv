const { ethers } = require("ethers");

export const OrderDataHelper = {
  getIntentAddress: (data) => {
    return data.intentAddress;
  },
  getUserAddress: (data) => {
    return data.user;
  },
  getNonce: (data) => {
    return data.nonce;
  },
  getSourceChainId: (data) => {
    return data.sourceChainId;
  },
  getOpenDeadline: (data) => {
    return data.openDeadline;
  },
  getFillDeadline: (data) => {
    return data.fillDeadline;
  },
  getBridgeData: (data) => {
    return data.OrderData;
  },
};

export const BridgeDataHelper = {
  getFillerAddress: (data) => {
    return data.filler;
  },
  getSourceTokenAddress: (data) => {
    return data.sourceTokenAddress;
  },
  getAmount: (data) => {
    return data.amount;
  },
  getDestinationChainId: (data) => {
    return data.destinationChainId;
  },
  getDestinationTokenAddress: (data) => {
    return data.destinationTokenAddress;
  },
  getBeneficiaryAddress: (data) => {
    return data.beneficiary;
  },
  getEncodedBridgeData: (data) => {
    const encodedBridge = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256", "uint256", "address", "address"],
      [
        getFillerAddress(data),
        getSourceTokenAddress(data),
        getAmount(data),
        getDestinationChainId(data),
        getDestinationTokenAddress(data),
        getBeneficiaryAddress(data),
      ]
    );
    return encodedBridge;
  },
  getDecodedBridgeData: (data) => {
    const decodedBridge = ethers.AbiCoder.defaultAbiCoder().decode(
      ["address", "address", "uint256", "uint256", "address", "address"],
      data
    );
    return {
      filler: decodedBridge[0],
      sourceTokenAddress: decodedBridge[1],
      amount: decodedBridge[2],
      destinationChainId: decodedBridge[3],
      destinationTokenAddress: decodedBridge[4],
      beneficiary: decodedBridge[5],
    };
  },
};
