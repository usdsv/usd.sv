"use client";

import React, { useState, useEffect } from "react";
import { keccak256, toUtf8Bytes } from "ethers";
import { recoverMessageAddress } from "viem";
import { useRouter } from "next/navigation";
import { useAccount, useSignMessage } from "wagmi";
import { Box, Typography, TextField, Button, Alert } from "@mui/material";

const SignIntentForm = ({
  signature,
  onSign,
  setSignature,
  _setTokenAddress,
  _setAmount,
  _setEphemeralAddress,
}) => {
  const [chainId, setChainId] = useState("");
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
    const parsedNonce = parseInt(nonce, 10);
    const parsedDeadline = parseInt(deadline, 10);
    const parsedAmount = Number(amount);

    if (isNaN(parsedChainId) || parsedChainId <= 0) {
      setFormError("Origin Chain ID must be a positive integer.");
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

    const order = {
      user: address,
      originChainId: parsedChainId,
      nonce: parsedNonce,
      fillDeadline: parsedDeadline,
      orderDataType: keccak256(toUtf8Bytes("BRIDGE_TRANSFER_ORDER")),
      orderData: {
        token: tokenAddress,
        amount: amount,
      },
    };

    const orderHash = keccak256(toUtf8Bytes(JSON.stringify(order)));
    console.log("orderHash:", orderHash);

    reset();
    try {
      const ephemeralAddress = "0xEphemeral1234";
      _setEphemeralAddress(ephemeralAddress);

      await signMessage({ message: orderHash });
    } catch (err) {
      console.error("Signing error:", err);
      setFormError(`Error signing the order: ${err.message || err}`);
    }
  };

  // Decide if we should show the success UI or the form
  const showSuccessUI = isSuccess && signedData;

  // Fill in defaults
  const handleFillDefaults = () => {
    setChainId("31337");
    setNonce("1234");
    setTokenAddress("0x1234567890abcdef1234567890abcdef12345678");
    setAmount("100");
    setDeadline("1699999999");
  };

  const handleResetInputs = () => {
    setChainId("");
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
            label="Origin Chain ID"
            value={chainId}
            onChange={(e) => setChainId(e.target.value)}
            placeholder="e.g. 31337"
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
