import { useEffect, useState } from "react";
import { ethers, keccak256, toUtf8Bytes } from "ethers";
import { useAccount, useReadContract } from "wagmi";

import { DeadlineData } from "@/config/constants";
import { abis } from "@/abi";
import { SALT } from "@/config/constants";
import { getContractAddress, getTokens } from "@/config/networks";

const useOrderData = (manualRequest) => {
  // hooks for use input handleing
  const [sourceChain, setSourceChain] = useState(null);
  const [destChain, setDestChain] = useState(null);
  const [sourceToken, setSourceToken] = useState(null);
  const [destToken, setDestToken] = useState(null);
  const [tokenAmount, setTokenAmount] = useState("");
  const [deadlineIndex, setDeadlineIndex] = useState(0);

  // state for token amount validation (insufficient check)
  const [amountValid, setAmountValid] = useState(false);

  // wagmi hook for user address
  const { address } = useAccount();

  // return type setting hooks
  const [orderData, setOrderData] = useState(null);
  const [permitData, setPermitData] = useState(null);

  // function for getting bridge data from user input
  const getBridgeData = () => {
    const sourceTokenAddress = sourceToken.addresses[sourceChain.id];
    const destTokenAddress = destToken.addresses[destChain.id];

    return [
      "0x0000000000000000000000000000000000000000",
      sourceTokenAddress,
      !!tokenAmount ? ethers.parseEther(tokenAmount) : 0,
      destChain.id,
      destTokenAddress,
      address,
    ];
  };

  // function for getting bridge data encoded value from bridge data
  const getBridgeDataEncode = () => {
    const encodedbridgeData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256", "uint256", "address", "address"],
      getBridgeData()
    );

    return encodedbridgeData;
  };

  // get source token balance using wagmi useReadContract hook
  const { data: sourceTokenBalance } = useReadContract({
    address:
      !!sourceChain && !!sourceToken
        ? sourceToken.addresses[sourceChain.id]
        : null,
    chainId: !!sourceChain ? sourceChain.id : null,
    abi: abis.erc20,
    functionName: "balanceOf",
    args: [address],
  });

  // get source token nonce using wagmi useReadContract hook
  const { data: sourceTokenNonce } = useReadContract({
    address:
      !!sourceChain && !!sourceToken
        ? sourceToken.addresses[sourceChain.id]
        : null,
    chainId: !!sourceChain ? sourceChain.id : null,
    abi: abis.erc20,
    functionName: "nonces",
    args: [address],
  });

  // effect hook for validation checks for send token amount (balance >= amount)
  useEffect(() => {
    if (!!tokenAmount && !!sourceTokenBalance) {
      const sendAmount = parseFloat(tokenAmount);
      const avaiableAmount = parseFloat(ethers.formatEther(sourceTokenBalance));
      setAmountValid(sendAmount > avaiableAmount);
    }
  }, [tokenAmount, sourceTokenBalance]);

  // get intent address form intent factory function with order data and salt as input
  const { data: ephemeralAddress } = useReadContract({
    address: !!sourceChain
      ? getContractAddress(sourceChain.id, "intentFactory")
      : null,
    abi: abis.intentFactory,
    functionName: "getIntentAddress",
    args: [
      {
        ...orderData,
        intentAddress: "0x0000000000000000000000000000000000000000",
      },
      ethers.id(SALT),
    ],
    query: {
      enabled: address,
    },
  });

  // react hook for setting order data before calculating intent address
  useEffect(() => {
    if (
      !!sourceChain &&
      !!destChain &&
      !!sourceToken &&
      !!destToken &&
      parseFloat(tokenAmount) > 0
    ) {
      const encodedBridgeData = getBridgeDataEncode();
      const currentTimeStamp = Math.floor(Date.now() / 1000);
      setOrderData({
        intentAddress: "0x0000000000000000000000000000000000000000",
        user: address,
        nonce: currentTimeStamp, // set manually
        sourceChainId: parseInt(sourceChain.id, 10),
        openDeadline: currentTimeStamp + DeadlineData[deadlineIndex].timestamp,
        fillDeadline:
          currentTimeStamp + DeadlineData[deadlineIndex].timestamp + 3600, // set manually
        orderDataType: keccak256(toUtf8Bytes("BRIDGE_TRANSFER_ORDER")),
        orderData: encodedBridgeData,
      });
      setPermitData({
        owner: address,
        spender: "0x0000000000000000000000000000000000000000",
        value: ethers.parseEther(tokenAmount),
        nonce: sourceTokenNonce,
        deadline:
          currentTimeStamp + DeadlineData[deadlineIndex].timestamp + 3600,
      });
    }
  }, [
    sourceChain,
    destChain,
    sourceToken,
    destToken,
    tokenAmount,
    deadlineIndex,
    manualRequest,
  ]);

  return [
    { ...orderData, intentAddress: ephemeralAddress },
    { ...permitData, spender: ephemeralAddress },
    { amountValid: amountValid, sourceTokenBalance: sourceTokenBalance },
    {
      sourceChain,
      destChain,
      sourceToken,
      destToken,
      tokenAmount,
      deadlineIndex,
    },
    {
      setSourceChain,
      setDestChain,
      setSourceToken,
      setDestToken,
      setTokenAmount,
      setDeadlineIndex,
    },
  ];
};

export default useOrderData;
