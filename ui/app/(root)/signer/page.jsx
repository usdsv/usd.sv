"use client";

import React, { useState } from "react";
import { Box, Typography, Container } from "@mui/material";
import SignIntentForm from "../../../components/SignIntentForm";
import TransferFundsForm from "../../../components/TransferFundsForm";
import StepIndicator from "../../../components/StepIndicator";

const SignerPage = () => {
  // State variables
  const [signature, setSignature] = useState(null);
  const [ephemeralAddress, setEphemeralAddress] = useState(null);
  const [tokenAddress, setTokenAddress] = useState(null);
  const [amount, setAmount] = useState(null);

  // Called by SignIntentForm after successful signing
  const handleSign = (sig, formData) => {
    setSignature(sig);
    setEphemeralAddress(formData.ephemeralAddress);
    setTokenAddress(formData.tokenAddress);
    setAmount(formData.amount);
  };

  // If signature is non-empty, user has signed
  const isSigned = !!signature;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "transparent",
        textAlign: "center",
        px: 2,
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}
      >
        {/* Step Indicator */}
        <StepIndicator currentStep={isSigned ? 2 : 1} />

        {/* Content based on signing state */}
        {isSigned ? (
          <>
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              Transfer Your Tokens
            </Typography>
            <TransferFundsForm
              ephemeralAddress={ephemeralAddress}
              tokenAddress={tokenAddress}
              amount={amount}
              signature={signature}
            />
          </>
        ) : (
          <>
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              Sign Your Intent
            </Typography>
            <SignIntentForm
              signature={signature}
              setSignature={setSignature}
              onSign={handleSign}
              _setEphemeralAddress={setEphemeralAddress}
              _setTokenAddress={setTokenAddress}
              _setAmount={setAmount}
            />
          </>
        )}
      </Container>
    </Box>
  );
};

export default SignerPage;
