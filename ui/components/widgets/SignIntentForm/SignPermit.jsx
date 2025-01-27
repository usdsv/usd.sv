import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Box, Typography, Alert, Button } from "@mui/material";
import { recoverTypedDataAddress } from "viem";

import {
  useSignTypedData,
  useReadContract,
  useEstimateGas,
  usePrepareTransactionRequest,
} from "wagmi";

import { SALT } from "@/config/constants";
import { abis } from "@/abi";
import { getContractAddress } from "@/config/networks";
import { estimateFee } from "viem/zksync";

const SignPermit = ({
  orderSignedData,
  ephemeralAddress,
  recoveredAddress,
  setOrderSignature,
  order,
  setPermitData,
  setPermitSignature,
  intentOrder,
  setEstimateGas,
  setEstimateReward,
  markStepComplete,
}) => {
  // ------------------ Local States ------------------
  const [localEstimateGas, setLocalEstimateGas] = useState("");
  const [localEstimateReward, setLocalEstimateReward] = useState("");

  // ------------------ Destructured Order Props ------------------
  const {
    amount,
    chainId,
    destChainId,
    tokenAddress,
    userAddress,
    fillDeadline,
  } = order;

  // ------------------ Wagmi Hooks (signTypedData) ------------------
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

  // ------------------ Read Contracts ------------------
  const { data: sourceTokenNonce } = useReadContract({
    address: tokenAddress,
    abi: abis.erc20,
    functionName: "nonces",
    args: [userAddress],
  });

  const { data: sourceTokenName } = useReadContract({
    address: tokenAddress,
    abi: abis.erc20,
    functionName: "name",
  });

  const { data: destTokenSymbol } = useReadContract({
    address: tokenAddress,
    abi: abis.erc20,
    functionName: "symbol",
  });

  const { data: destTokenFee } = useReadContract({
    address: getContractAddress(destChainId, "intentFactory"),
    abi: abis.intentFactory,
    functionName: "getFeeInfo",
    args: [tokenAddress],
  });

  // ------------------ Prepare Transaction (Source & Dest) ------------------
  const { data: preparedWriteSource } = usePrepareTransactionRequest({
    address: getContractAddress(chainId, "intentFactory"),
    abi: abis.intentFactory,
    functionName: "createIntent",
    args: [intentOrder, ethers.id(SALT)],
  });

  const { data: preparedWriteDest } = usePrepareTransactionRequest({
    address: getContractAddress(destChainId, "intentFactory"),
    abi: abis.intentFactory,
    functionName: "createIntent",
    args: [intentOrder, ethers.id(SALT)],
  });

  // ------------------ Estimate Gas ------------------
  const { data: estimateGasSource } = useEstimateGas({
    ...preparedWriteSource,
  });
  const { data: estimateGasDest } = useEstimateGas({
    ...preparedWriteDest,
  });

  const TX_FILLER_FILL = { to: userAddress, value: amount };
  const { data: estimateFillGas } = useEstimateGas({ ...TX_FILLER_FILL });

  const TX_FILLER_UNSCROW = { to: userAddress, value: amount };
  const { data: estimateUnscrowGas } = useEstimateGas({ ...TX_FILLER_UNSCROW });

  const TX_FILLER_PERMIT = { to: ephemeralAddress, value: amount };
  const { data: estimatePermitGas } = useEstimateGas({ ...TX_FILLER_PERMIT });

  // ------------------ useEffects ------------------
  useEffect(() => {
    (async () => {
      if (
        destTokenFee &&
        estimateGasSource &&
        estimateGasDest &&
        estimateFillGas &&
        estimateUnscrowGas &&
        estimatePermitGas
      ) {
        const reward =
          (amount * Number(destTokenFee[0])) / Number(destTokenFee[1]);
        setLocalEstimateReward(reward);
        setEstimateReward(reward);

        const gas =
          Number(
            estimateGasSource +
              estimateGasDest +
              estimateFillGas +
              estimateUnscrowGas +
              estimatePermitGas
          ) / Number(10 ** 9);

        setLocalEstimateGas(gas);
        setEstimateGas(gas);
      }
    })();
  }, [
    destTokenFee,
    estimateGasSource,
    estimateGasDest,
    estimateFillGas,
    estimateUnscrowGas,
    estimatePermitGas,
  ]);

  useEffect(() => {
    (async () => {
      if (permitVariables?.message && permitSignedData) {
        try {
          const recoveredAddr = await recoverTypedDataAddress({
            domain: permitVariables.domain,
            types: permitVariables.types,
            primaryType: permitVariables.primaryType,
            message: permitVariables.message,
            signature: permitSignedData,
          });
          // (Optional: handle `recoveredAddr` if needed)
        } catch (err) {
          console.error("Error recovering address:", err);
        }
      }
    })();
  }, [permitSignedData, permitVariables?.message]);

  const permitSignSuccess = permitIsSuccess && permitSignedData;

  useEffect(() => {
    if (permitSignSuccess) {
      setPermitSignature(permitSignedData);
      setPermitData(permitVariables?.message);
      markStepComplete(1);
    }
  }, [
    permitSignSuccess,
    permitSignedData,
    permitVariables?.message,
    setPermitSignature,
    setPermitData,
    markStepComplete,
  ]);

  // ------------------ Event Handler: Permit ------------------
  const handlePermit = () => {
    setOrderSignature(orderSignedData);

    const permitDomain = {
      name: sourceTokenName,
      version: "1",
      chainId: chainId,
      verifyingContract: tokenAddress,
    };

    const permitTypes = {
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
    };

    const permitValues = {
      owner: userAddress,
      spender: ephemeralAddress,
      value: ethers.parseEther(amount),
      nonce: sourceTokenNonce,
      deadline: fillDeadline,
    };

    setPermitData(permitValues);

    try {
      signPermit({
        domain: permitDomain,
        types: permitTypes,
        message: permitValues,
        primaryType: "Permit",
      });
    } catch (e) {
      console.error("signTypedData error: ", e);
    }
  };

  // ------------------ Render JSX ------------------
  return (
    <>
      {!permitSignSuccess && (
        <Box
          display="flex"
          flexDirection="column"
          sx={{ pt: 2, pb: 4, mb: 2, borderBottom: "1px solid #aaa" }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{
              flex: 2,
              textTransform: "uppercase",
              fontWeight: "bold",
            }}
            gutterBottom
          >
            Sign EIP-2612 Permit
          </Typography>
          <Box sx={{ my: 2, textAlign: "left" }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              Successfully signed the intent!
            </Alert>

            <Box sx={{ py: 1 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ textTransform: "uppercase" }}
                fontWeight={500}
                gutterBottom
              >
                Order Signature
              </Typography>
              <Typography
                variant="body2"
                sx={{ wordBreak: "break-all" }}
                fontWeight={500}
              >
                {orderSignedData}
              </Typography>
            </Box>

            <Box sx={{ py: 1 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ textTransform: "uppercase" }}
                gutterBottom
              >
                Ephemeral Address
              </Typography>
              {ephemeralAddress ? (
                <Typography variant="body2" fontWeight={500}>
                  {ephemeralAddress}
                </Typography>
              ) : (
                <Typography variant="body2">
                  Computing ephemeral address...
                </Typography>
              )}
            </Box>

            <Box sx={{ py: 1 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ textTransform: "uppercase" }}
                gutterBottom
              >
                Recovered Address
              </Typography>
              {recoveredAddress ? (
                <Typography variant="body2">{recoveredAddress}</Typography>
              ) : (
                <Typography variant="body2">
                  Computing recovered address...
                </Typography>
              )}
            </Box>

            <Box sx={{ py: 1 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ textTransform: "uppercase" }}
                gutterBottom
              >
                Estimated Filler Gas
              </Typography>
              <Typography variant="body2">{localEstimateGas} Gwei</Typography>
            </Box>
            <Box sx={{ py: 1 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ textTransform: "uppercase" }}
                gutterBottom
              >
                Estimated Filler Reward
              </Typography>
              <Typography variant="body2">
                {localEstimateReward} USDT
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            sx={{ mt: 1 }}
            onClick={handlePermit}
            disabled={
              !(orderSignedData && ephemeralAddress && recoveredAddress)
            }
          >
            Sign Permit
          </Button>
        </Box>
      )}
    </>
  );
};

export default SignPermit;
