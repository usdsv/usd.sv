import { useEffect } from "react";
import { ethers } from "ethers";
import { IS_TEST } from "@/config/constants";
import { apiService } from "@/services/apiService";

export function useSubmitOrder(
  orderSignature,
  permitSignature,
  intentOrder,
  permitData
) {
  useEffect(() => {
    (async () => {
      if (orderSignature && permitSignature && intentOrder && permitData) {
        try {
          const orderRawbytes = ethers.AbiCoder.defaultAbiCoder().encode(
            [
              "address",
              "address",
              "uint256",
              "uint256",
              "uint32",
              "uint32",
              "bytes32",
              "bytes",
            ],
            [
              intentOrder.intentAddress,
              intentOrder.user,
              intentOrder.nonce,
              intentOrder.sourceChainId,
              intentOrder.openDeadline,
              intentOrder.fillDeadline,
              intentOrder.orderDataType,
              intentOrder.orderData,
            ]
          );

          const permitRawbytes = ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "address", "uint256", "uint256", "uint256"],
            [
              permitData.owner,
              permitData.spender,
              permitData.value,
              permitData.nonce,
              permitData.deadline,
            ]
          );

          if (!IS_TEST) {
            await apiService.submitOrder({
              permitsignature: permitSignature,
              permitrawbytes: permitRawbytes,
              ordersignature: orderSignature,
              orderrawbytes: orderRawbytes,
            });
          }
        } catch (err) {
          console.error("Error posting signature:", err);
        }
      }
    })();
  }, [orderSignature, permitSignature, intentOrder, permitData]);
}
