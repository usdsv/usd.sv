"use client";

import React, { useState } from "react";
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

// Minimal ERC-20 ABI with just the `transfer` function
const erc20Abi = [
  "function transfer(address to, uint256 amount) external returns (bool)",
];

const TransferFundsForm = ({
  ephemeralAddress,
  tokenAddress,
  amount,
  signature,
}) => {
  const [status, setStatus] = useState("");

  // Wagmi hooks
  const { isConnected } = useAccount();

  // We'll consider it "successful" if status starts with "Successfully..."
  const showSuccessUI = status.startsWith("Successfully");

  const doTransfer = async () => {
    try {
      // 1) Ensure user is connected
      if (!isConnected) {
        alert("Please connect your wallet first.");
        return;
      }

      // 2) Ensure we actually have a signer from Wagmi
      if (!signature) {
        alert("No signature found. Make sure you are connected in RainbowKit.");
        return;
      }

      setStatus("Transferring tokens...");

      // 3) Instantiate Contract using the Wagmi signature
      const erc20 = new ethers.Contract(tokenAddress, erc20Abi, signature);
      const tx = await erc20.transfer(ephemeralAddress, amount);
      await tx.wait();

      setStatus(
        `Successfully transferred ${amount} tokens to ${ephemeralAddress}`
      );
    } catch (err) {
      console.error(err);
      setStatus("Transfer failed: " + (err.message || "Unknown error"));
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
      ) : showSuccessUI ? (
        /* 2) If transfer was successful, show success info */
        <>
          <Alert severity="success" sx={{ mb: 2 }}>
            {status}
          </Alert>
          <Box textAlign="center">
            <Typography variant="body1" gutterBottom>
              Funds have been transferred successfully!
            </Typography>
            {/* If you want a "Transfer Again" button to reset state */}
            <Button
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => setStatus("")}
            >
              Transfer Again
            </Button>
          </Box>
        </>
      ) : (
        /* 3) Otherwise, show the normal Transfer UI */
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
            Transfer Funds
          </Typography>

          {/* Status message (e.g. "Transferring tokens..." or errors) */}
          {status && !showSuccessUI && (
            <Alert
              sx={{ mb: 3 }}
              severity={status.startsWith("Transfer failed") ? "error" : "info"}
            >
              {status}
            </Alert>
          )}

          {/* Stack of fields: label on top, value below */}
          <Stack spacing={3}>
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
            <Button variant="contained" onClick={doTransfer}>
              Transfer Funds
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default TransferFundsForm;
