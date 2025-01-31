import { useEffect } from "react";
import { useSignTypedData, useReadContract } from "wagmi";
import { BridgeDataHelper } from "@/utils/typeHelper";
import { abis } from "@/abi";

const useSignPermit = (orderData, permitData) => {
  const {
    signTypedData: signPermit,
    data: permitSignedData,
    isLoading: permitIsLoading,
    isError: permitIsError,
    isSuccess: permitIsSuccess,
    error: permitError,
    reset: permitReset,
    variables: permitVariables,
  } = useSignTypedData();

  const sourceTokenAddress = orderData
    ? BridgeDataHelper.getDecodedBridgeData(orderData.orderData)
        .sourceTokenAddress
    : null;

  const { data: sourceTokenName } = useReadContract({
    address: sourceTokenAddress,
    abi: abis.erc20,
    functionName: "name",
    query: {
      enabled: !!sourceTokenAddress,
    },
  });

  const permitDomain =
    orderData && permitData
      ? {
          name: sourceTokenName,
          version: "1",
          chainId: orderData.sourceChainId,
          verifyingContract: sourceTokenAddress,
        }
      : null;

  const doSignPermit = () => {
    try {
      signPermit({
        domain: permitDomain,
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        },
        message: permitData,
        primaryType: "Permit",
      });
    } catch (e) {
      console.log("Error: ", e.message);
    }
  };

  useEffect(() => {
    if (permitIsSuccess) {
      console.log("Permit signed successfully:", permitSignedData);
    } else if (permitIsError) {
      console.error("Error signing permit:", permitError);
    }
  }, [
    permitIsSuccess,
    permitIsError,
    permitSignedData,
    permitError,
    permitReset,
  ]);

  return {
    doSignPermit,
    permitIsLoading,
    permitIsError,
    permitIsSuccess,
    permitSignedData,
    permitError,
    permitReset,
  };
};

export default useSignPermit;
