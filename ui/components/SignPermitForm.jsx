"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useAccount } from "wagmi";
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

const SignPermitForm = ({
  intentOrder,
  ephemeralAddress,
  userAddress,
  tokenAddress,
  amount,
  chainId,
  destChainId,
  _setPermitData,
  _setSignature,
}) => {
  const [recoveredAddress, setRecoveredAddress] = useState("");
  const [estimateGas, setEstimateGas] = useState("");
  const [estimateReward, setEstimateReward] = useState("");
  // Wagmi hooks
  const { isConnected } = useAccount();

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

  const {
    data: estimateGasSource,
    isLoadingSource,
    isErrorSource,
  } = useEstimateGas({
    ...preparedWriteSource,
  });

  const {
    data: estimateGasDest,
    isLoadingDest,
    isErrorDest,
  } = useEstimateGas({
    ...preparedWriteDest,
  });

  const TX_FILLER_FILL = {
    to: userAddress,
    value: amount,
  };
  const { data: estimateFillGas } = useEstimateGas({ ...TX_FILLER_FILL });

  const TX_FILLER_UNSCROW = {
    to: userAddress,
    value: amount,
  };
  const { data: estimateUnscrowGas } = useEstimateGas({ ...TX_FILLER_UNSCROW });

  const TX_FILLER_PERMIT = {
    to: ephemeralAddress,
    value: amount,
  };
  const { data: estimatePermitGas } = useEstimateGas({ ...TX_FILLER_PERMIT });

  useEffect(() => {
    (async () => {
      if (
        !!destTokenFee &&
        !!estimateGasSource &&
        !!estimateGasDest &&
        !!estimateFillGas &&
        !!estimateUnscrowGas &&
        !!estimatePermitGas
      ) {
        setEstimateReward(
          (amount * Number(destTokenFee[0])) / Number(destTokenFee[1])
        );
        setEstimateGas(
          Number(
            estimateGasSource +
              estimateGasDest +
              estimateFillGas +
              estimateUnscrowGas +
              estimatePermitGas
          ) / Number(10 ** 9)
        );
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

          console.log("PermitSign: ", ethers.Signature.from(permitSignedData));
          setRecoveredAddress(recoveredAddr);
        } catch (err) {
          console.error("Error recovering address:", err);
        }
      }
    })();
  }, [permitSignedData, permitVariables?.message]);

  const permitSignSuccess = permitIsSuccess && permitSignedData;

  const handlePermit = () => {
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
        {
          name: "owner",
          type: "address",
        },
        {
          name: "spender",
          type: "address",
        },
        {
          name: "value",
          type: "uint256",
        },
        {
          name: "nonce",
          type: "uint256",
        },
        {
          name: "deadline",
          type: "uint256",
        },
      ],
    };
    const currentTimeStamp = Math.floor(Date.now() / 1000);
    const permitValues = {
      owner: userAddress,
      spender: ephemeralAddress,
      value: ethers.parseEther(amount),
      nonce: sourceTokenNonce,
      deadline: 1800000000,
    };

    _setPermitData(permitValues);

    console.log("PermitValues: ", permitValues);

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

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      {/* 1) If not connected, prompt user to connect */}
      {!isConnected ? (
        <>
          <Typography variant="h5" gutterBottom>
            Your wallet is not connected
          </Typography>
          <Alert severity="warning">
            Please connect your wallet to sign/transfer.
          </Alert>
        </>
      ) : permitSignSuccess ? (
        /* 2) If permit sign success */
        <>
          <Alert severity="success" sx={{ mb: 2 }}>
            Successfully signed the permit!
          </Alert>
          {permitSignedData && (
            <Box sx={{ my: 2, textAlign: "left" }}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Signature:</strong>
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                {permitSignedData}
              </Typography>
            </Box>
          )}
          {recoveredAddress && (
            <Box sx={{ mt: 2, textAlign: "left" }}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Recovered Address:</strong>
              </Typography>
              <Typography variant="body2">{recoveredAddress}</Typography>
            </Box>
          )}
          <Box sx={{ mt: 2, textAlign: "left" }}>
            <Typography variant="subtitle2" gutterBottom>
              <strong>Estimation:</strong>
            </Typography>
            <Typography variant="body2">
              Filler Gas Estimation : {estimateGas} Gwei
            </Typography>
            <Typography variant="body2">
              Filler Reward Estimation : {estimateReward} {destTokenSymbol}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => {
              _setSignature(permitSignedData);
            }}
          >
            Next
          </Button>
        </>
      ) : (
        /* 3) Otherwise, show the normal Permit Sign UI */
        <Paper
          elevation={2}
          sx={{
            p: 3,
            borderRadius: 2,
            textAlign: "left",
          }}
        >
          {/* Heading */}
          <Typography variant="h5" mb={3} sx={{ textAlign: "center" }}>
            Sign EIP-2612 Permit
          </Typography>

          {/* Stack of fields: label on top, value below */}
          <Stack spacing={3}>
            {/* User Address */}
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ textTransform: "uppercase" }}
                gutterBottom
              >
                User Address
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {userAddress}
              </Typography>
            </Box>

            {/* Ephemeral Address */}
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ textTransform: "uppercase" }}
                gutterBottom
              >
                Ephemeral Address
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {ephemeralAddress}
              </Typography>
            </Box>

            {/* Token Address */}
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ textTransform: "uppercase" }}
                gutterBottom
              >
                Token Address
              </Typography>
              <Typography
                variant="body1"
                fontWeight={500}
                sx={{
                  // Ensures very long addresses wrap properly
                  wordBreak: "break-all",
                  overflowWrap: "break-word",
                }}
              >
                {tokenAddress}
              </Typography>
            </Box>

            {/* Amount */}
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ textTransform: "uppercase" }}
                gutterBottom
              >
                Amount
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {amount}
              </Typography>
            </Box>
          </Stack>

          {/* Button (centered) */}
          <Box display="flex" justifyContent="center" mt={4}>
            <Button variant="contained" onClick={handlePermit}>
              Sign Permit
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default SignPermitForm;
