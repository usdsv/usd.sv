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

import { useSignTypedData, useReadContract } from "wagmi";

import { ADDRESS_INTENT_FACTORY, CHAIN_INFO } from "@/config/constants";
import { abis } from "@/abi";

const SignPermitForm = ({
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

  const { data: destTokenFee } = useReadContract({
    address: ADDRESS_INTENT_FACTORY[CHAIN_INFO["chain_" + destChainId]],
    abi: abis.intentFactory,
    functionName: "getFeeInfo",
    args: [tokenAddress],
  });

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

          setRecoveredAddress(recoveredAddr);

          _setSignature(permitSignedData);
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
    const permitValues = {
      owner: userAddress,
      spender: ephemeralAddress,
      value: ethers.parseEther(amount),
      nonce: sourceTokenNonce,
      deadline: 1699999999,
    };

    _setPermitData(permitValues);

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
              <strong>Gas Estimate:</strong>
            </Typography>
            <Typography variant="body2">{destTokenFee}</Typography>
            <Typography variant="body2">{destChainId}</Typography>
          </Box>

          <Button variant="outlined" sx={{ mt: 2 }}>
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
