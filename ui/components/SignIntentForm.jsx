"use client";

import React, { useState, useEffect } from "react";
import { keccak256, toUtf8Bytes } from "ethers";
import { recoverMessageAddress } from "viem";
import { useRouter } from "next/navigation";
import { useAccount, useSignMessage } from "wagmi";
import { Box, Typography, TextField, Button, Alert } from "@mui/material";

import { ethers } from "ethers";

import { ADDRESS_MOCT_USDT } from "@/contracts/constants";

const SignIntentForm = ({
  signature,
  onSign,
  setSignature,
  _setTokenAddress,
  _setAmount,
  _setEphemeralAddress,
}) => {
  const [chainId, setChainId] = useState("");
  const [destChainId, setDestChainId] = useState("");
  const [nonce, setNonce] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [recoveredAddress, setRecoveredAddress] = useState("");
  const [ephemeralAddress, setEphemeralAddress] = useState("");
  const [formError, setFormError] = useState("");

  const { isConnected, address } = useAccount();
  const router = useRouter();

  const {
    signMessage,
    data: signedData,
    isLoading,
    isError,
    isSuccess,
    error,
    reset,
    variables,
  } = useSignMessage({
    onSuccess(data) {
      console.log("Signature:", data);
      const formData = {
        chainId,
        nonce,
        tokenAddress,
        amount,
        deadline,
        ephemeralAddress,
      };
      onSign?.(data, formData);
    },
  });

  useEffect(() => {
    (async () => {
      if (variables?.message && signedData) {
        try {
          const recoveredAddr = await recoverMessageAddress({
            message: variables.message,
            signature: signedData,
          });

          const ephemeralAddress = "0xEphemeral1234";
          console.log("Ephemeral Address:", ephemeralAddress);
          console.log("Token Address:", tokenAddress);
          console.log("Amount:", amount);

          _setEphemeralAddress(ephemeralAddress);
          _setTokenAddress(tokenAddress);
          _setAmount(amount);

          setRecoveredAddress(recoveredAddr);
          console.log("Recovered Address:", recoveredAddr);
        } catch (err) {
          console.error("Error recovering address:", err);
        }
      }
    })();
  }, [signedData, variables?.message]);

  const handleSignOrder = async () => {
    setFormError("");

    if (!isConnected) {
      setFormError("Please connect your wallet first.");
      return;
    }

    if (!window.ethereum) {
      setFormError("No wallet provider found.");
      return;
    }

    if (signature) {
      setFormError("You have already signed this intent!");
      return;
    }

    const parsedChainId = parseInt(chainId, 10);
    const parsedDestChainId = parseInt(destChainId, 10);
    const parsedNonce = parseInt(nonce, 10);
    const parsedDeadline = parseInt(deadline, 10);
    const parsedAmount = Number(amount);

    if (isNaN(parsedChainId) || parsedChainId <= 0) {
      setFormError("Source Chain ID must be a positive integer.");
      return;
    }

    if (isNaN(parsedNonce) || parsedNonce < 0) {
      setFormError("Nonce must be a valid non-negative integer.");
      return;
    }

    if (isNaN(parsedDeadline) || parsedDeadline <= 0) {
      setFormError(
        "Fill Deadline must be a valid positive integer (timestamp)."
      );
      return;
    }

    // Check tokenAddress
    if (!/^0x[0-9A-Fa-f]{40}$/.test(tokenAddress)) {
      setFormError(
        "Token Address must be a valid 20-byte hex address (starting with 0x)."
      );
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("Amount must be a valid positive number.");
      return;
    }

    const currentTimeStamp = Math.floor(Date.now() / 1000);

    // user signes GasslessCrossChainOrder
    const bridgeData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256", "uint256", "address", "address"],
      [
        "0x0000000000000000000000000000000000000000",
        ADDRESS_MOCT_USDT,
        amount,
        parsedDestChainId,
        ADDRESS_MOCT_USDT,
        address,
      ]
    );

    const order = {
      intentAddress: "0x0000000000000000000000000000000000000000",
      user: address,
      nonce: parsedNonce,
      sourceChainId: parsedChainId,
      openDeadline: currentTimeStamp + 3600, // calculate manually
      fillDeadline: currentTimeStamp + 7200, // calculate manually
      orderDataType: keccak256(toUtf8Bytes("BRIDGE_TRANSFER_ORDER")),
      orderData: bridgeData,
    };

    const orderMessage = ethers.AbiCoder.defaultAbiCoder().encode(
      [
        "address",
        "address",
        "uint256",
        "uint256",
        "uint32",
        "uint32",
        "bytes32",
        "bytes",
      ], // Specify the types
      [
        order.intentAddress, // Intent address
        order.user, // User address
        order.nonce, // Nonce
        order.sourceChainId, // Source chain ID
        order.openDeadline, // Open deadline
        order.fillDeadline, // Fill deadline
        order.orderDataType, // Order data type
        order.orderData, // Order data
      ]
    );

    console.log("Order message: " + orderMessage);

    reset();
    try {
      await signMessage({ message: orderMessage });
    } catch (err) {
      console.error("Signing error:", err);
      setFormError(`Error signing the order: ${err.message || err}`);
    }
  };

  // Decide if we should show the success UI or the form
  const showSuccessUI = isSuccess && signedData;

  // Fill in defaults
  const handleFillDefaults = () => {
    setChainId("11155111");
    setDestChainId("357");
    setNonce("1234");
    setTokenAddress("0x52247fe50A1c11773B182Afd1Dda181de705289c");
    setAmount("100");
    setDeadline("1699999999");
  };

  const handleResetInputs = () => {
    setChainId("");
    setDestChainId("");
    setNonce("");
    setTokenAddress("");
    setAmount("");
    setDeadline("");
    setFormError("");
  };

  return (
    <Box
      sx={{
        border: "1px solid #ccc",
        borderRadius: 2,
        p: 3,
        maxWidth: 500,
        mx: "auto",
        textAlign: "center",
      }}
    >
      {!isConnected ? (
        <>
          <Typography variant="h5" gutterBottom>
            Your wallet is not connected
          </Typography>
          <Alert severity="warning">
            Please connect your wallet to sign the intent.
          </Alert>
        </>
      ) : showSuccessUI ? (
        <>
          <Alert severity="success" sx={{ mb: 2 }}>
            Successfully signed the intent!
          </Alert>
          {signedData && (
            <Box sx={{ my: 2, textAlign: "left" }}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Signature:</strong>
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                {signedData}
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
          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => {
              setSignature(signedData);
            }}
          >
            Transfer Funds
          </Button>
        </>
      ) : (
        <>
          <Typography variant="h5" gutterBottom>
            Fill in the form below
          </Typography>

          {formError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {formError}
            </Alert>
          )}

          {isError && !formError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <strong>Error signing message:</strong> {error?.message}
            </Alert>
          )}

          {/* Fields with type="number" */}
          <TextField
            type="number"
            label="Source Chain ID"
            value={chainId}
            onChange={(e) => setChainId(e.target.value)}
            placeholder="e.g. 11155111"
            fullWidth
            margin="normal"
            disabled={signedData}
          />
          <TextField
            type="number"
            label="Destination Chain ID"
            value={destChainId}
            onChange={(e) => setDestChainId(e.target.value)}
            placeholder="e.g. 357"
            fullWidth
            margin="normal"
            disabled={signedData}
          />
          <TextField
            type="number"
            label="Nonce"
            value={nonce}
            onChange={(e) => setNonce(e.target.value)}
            placeholder="e.g. 1234"
            fullWidth
            margin="normal"
            disabled={signedData}
          />
          <TextField
            label="Token Address"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x + 40 hex characters"
            fullWidth
            margin="normal"
            disabled={signedData}
          />
          <TextField
            type="number"
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 100"
            fullWidth
            margin="normal"
            disabled={signedData}
          />
          <TextField
            type="number"
            label="Fill Deadline"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            placeholder="Unix timestamp, e.g. 1699999999"
            fullWidth
            margin="normal"
            disabled={signedData}
          />

          {!signedData && (
            <Box display="flex" justifyContent="space-between" mt={2} mb={2}>
              <Button
                variant="outlined"
                onClick={handleFillDefaults}
                sx={{ flex: 1, mr: 1 }}
              >
                Fill Default Values
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleResetInputs}
              >
                Reset Inputs
              </Button>
            </Box>
          )}

          <Button
            variant="contained"
            fullWidth
            sx={{
              backgroundColor: "#D87068",
              "&:hover": { backgroundColor: "#c76058" },
            }}
            onClick={handleSignOrder}
            disabled={isLoading || signedData}
          >
            {isLoading
              ? "Signing..."
              : signedData
              ? "Already Signed"
              : "Sign Order"}
          </Button>
        </>
      )}
    </Box>
  );
};

export default SignIntentForm;
