"use client";

import React, { useEffect, useState } from "react";
import { Box, Container } from "@mui/material";
import SignIntentForm from "../../../components/containers/SignIntentForm";
import StepIndicator from "../../../components/widgets/StepIndicator";
import DeploymentWatcher from "@/components/containers/DeploymentWatcher";
import { useSubmitOrder } from "@/hooks/useSubmitOrder"; // custom hook
import { useDebugLogger } from "@/hooks/useDebugLogger"; // optional

const SignerPage = () => {
  // Steps & wizard state
  const [userStep, setUserStep] = useState(1);
  const [stepsCompleted, setStepsCompleted] = useState([false, false]);

  // Order / signing states
  const [intentOrder, setIntentOrder] = useState(null);
  const [orderSignature, setOrderSignature] = useState(null);
  const [permitData, setPermitData] = useState(null);
  const [permitSignature, setPermitSignature] = useState(null);

  // Chain info & user data
  const [userAddress, setUserAddress] = useState(null);
  const [ephemeralAddress, setEphemeralAddress] = useState(null);
  const [tokenAddress, setTokenAddress] = useState(null);
  const [amount, setAmount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [destChainId, setDestChainId] = useState(null);
  const [fillDeadline, setFillDeadline] = useState(null);
  const [recoveredAddress, setRecoveredAddress] = useState("");

  // Estimates
  const [estimateGas, setEstimateGas] = useState("");
  const [estimateReward, setEstimateReward] = useState("");

  /**
   * Step completion logic
   */
  const markStepComplete = (stepIndex) => {
    setStepsCompleted((prev) => {
      const updated = [...prev];
      updated[stepIndex] = true;
      return updated;
    });
    setUserStep(stepIndex + 1);
  };

  /**
   * Called by SignIntentForm after successful signing
   */
  const handleSign = (sig, formData) => {
    alert(formData);
    setOrderSignature(sig);
    setUserAddress(formData.address);
    setEphemeralAddress(formData.ephemeralAddress);
    setTokenAddress(formData.tokenAddress);
    setAmount(formData.amount);
    setChainId(formData.chainId);
    setDestChainId(formData.destChainId);
  };

  /**
   * Submit order automatically when everything is present
   */
  useSubmitOrder(orderSignature, permitSignature, intentOrder, permitData);

  /**
   * Debug Logs
   */
  useDebugLogger(
    { label: "orderSignature", value: orderSignature },
    { label: "permitSignature", value: permitSignature },
    { label: "recoveredAddress", value: recoveredAddress },
    { label: "estimateGas", value: estimateGas },
    { label: "estimateReward", value: estimateReward }
  );

  /**
   * Render logic
   */
  const renderForm = () => {
    if (userStep === 1) {
      return (
        <SignIntentForm
          onSign={handleSign}
          setOrderSignature={setOrderSignature}
          setParentIntentOrder={setIntentOrder}
          setEphemeralAddress={setEphemeralAddress}
          setParentTokenAddress={setTokenAddress}
          setParentAmount={setAmount}
          setParentChainId={setChainId}
          setParentDestChainId={setDestChainId}
          setParentUserAddress={setUserAddress}
          setParentFillDeadline={setFillDeadline}
          recoveredAddress={recoveredAddress}
          setRecoveredAddress={setRecoveredAddress}
          setPermitData={setPermitData}
          setPermitSignature={setPermitSignature}
          markStepComplete={markStepComplete}
          setEstimateGas={setEstimateGas}
          setEstimateReward={setEstimateReward}
        />
      );
    }
    if (userStep === 2) {
      return (
        <DeploymentWatcher
          sourceChainId={chainId}
          destChainId={destChainId}
          ephemeralAddress={ephemeralAddress}
          tokenAmount={amount}
          recoveredAddress={recoveredAddress}
          orderSignature={orderSignature}
          permitSignature={permitSignature}
          intentOrder={intentOrder}
          estimateGas={estimateGas}
          estimateReward={estimateReward}
        />
      );
    }
    return null;
  };

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
        <StepIndicator
          currentStep={userStep}
          stepsCompleted={stepsCompleted}
          switchPaging={setUserStep}
        />
        {renderForm()}
      </Container>
    </Box>
  );
};

export default SignerPage;
