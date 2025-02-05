import { useEffect } from "react";
import { useSignTypedData } from "wagmi";
import { getContractAddress } from "@/config/networks";

const useSignOrder = (orderData) => {
  const {
    signTypedData: signOrder,
    data: orderSignedData,
    isLoading: orderIsLoading,
    isError: orderIsError,
    isSuccess: orderIsSuccess,
    error: orderError,
    reset: orderReset,
    variables: orderVariables,
  } = useSignTypedData();

  const orderDomain = orderData
    ? {
        name: "SignOrder",
        version: "1",
        chainId: orderData.sourceChainId,
        verifyingContract: getContractAddress(
          orderData.sourceChainId,
          "intentFactory"
        ),
      }
    : null;

  const doSignOrder = () => {
    try {
      signOrder({
        domain: orderDomain,
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          Order: [
            { name: "intentAddress", type: "address" },
            { name: "user", type: "address" },
            { name: "nonce", type: "uint256" },
            { name: "sourceChainId", type: "uint256" },
            { name: "openDeadline", type: "uint32" },
            { name: "fillDeadline", type: "uint32" },
            { name: "orderDataType", type: "bytes32" },
            { name: "orderData", type: "bytes" },
          ],
        },
        message: orderData,
        primaryType: "Order",
      });
    } catch (e) {
      console.log("Error: ", e.message);
    }
  };

  useEffect(() => {
    if (orderIsSuccess) {
      console.log("Order signed successfully:", orderSignedData);
    } else if (orderIsError) {
      console.log("Error signing order:", orderError);
    }
  }, [orderIsSuccess, orderIsError, orderSignedData, orderError, orderReset]);

  return {
    doSignOrder,
    orderIsLoading,
    orderIsError,
    orderIsSuccess,
    orderSignedData,
    orderError,
    orderReset,
  };
};

export default useSignOrder;
