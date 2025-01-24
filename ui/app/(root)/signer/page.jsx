"use client";

import React, { useEffect, useState } from "react";
import { Box, Typography, Container } from "@mui/material";
import SignIntentForm from "../../../components/SignIntentForm";
import SignPermitForm from "../../../components/SignPermitForm";
import StepIndicator from "../../../components/StepIndicator";

import { apiService } from "@/services/apiService";
import { ethers } from "ethers";

import { IS_TEST } from "@/config/constants";
import DeploymentWatcher from "@/components/DeploymentWatcher";

const SignerPage = () => {
  // State variables
  const [userStep, setUserStep] = useState(1);

  const [intentOrder, setIntentOrder] = useState(null);
  const [orderSignature, setOrderSignature] = useState(null);
  const [permitData, setPermitData] = useState(null);
  const [permitSignature, setPermitSignature] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [ephemeralAddress, setEphemeralAddress] = useState(null);
  const [tokenAddress, setTokenAddress] = useState(null);
  const [amount, setAmount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [destChainId, setDestChainId] = useState(null);

  // Called by SignIntentForm after successful signing
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

  useEffect(() => {
    (async () => {
      if (!!orderSignature && !!permitSignature) {
        try {
          // console.log("Order Signature: ", orderSignature);
          // console.log("Permit Signature: ", permitSignature);
          // console.log("Intent Order: ", intentOrder);
          // console.log("Permit Values: ", permitData);

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
              intentOrder.intentAddress, // Intent address
              intentOrder.user, // User address
              intentOrder.nonce, // Nonce
              intentOrder.sourceChainId, // Source chain ID
              intentOrder.openDeadline, // Open deadline
              intentOrder.fillDeadline, // Fill deadline
              intentOrder.orderDataType, // Order data type
              intentOrder.orderData, // Order data
            ]
          );

          const permitRawbytes = ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "address", "uint256", "uint256", "uint256"],
            [
              permitData.owner, // Owner address
              permitData.spender, // Spender address
              permitData.value, // Amount of token
              permitData.nonce, // Nonce
              permitData.deadline, // Deadline
            ]
          );

          if (!IS_TEST) {
            const result = await apiService.submitOrder({
              permitsignature: permitSignature,
              permitrawbytes: permitRawbytes,
              ordersignature: orderSignature,
              orderrawbytes: orderRawbytes,
            });

            console.log(result);
          }
        } catch (err) {
          console.error("Error posting signature: ", err);
        }
      }
    })();
  }, [orderSignature, permitSignature]);

  // If signature is non-empty, user has signed
  const isOrderSigned = !!orderSignature;
  const isPermitSigned = !!permitSignature;

  useEffect(() => {
    setUserStep(!!isOrderSigned ? (!!isPermitSigned ? 3 : 2) : 1);
  }, [isOrderSigned, isPermitSigned]);

  const intentSignForm = (
    <>
      <Typography variant="h4" sx={{ fontWeight: "bold" }}>
        Sign Your Intent
      </Typography>
      <SignIntentForm
        setSignature={setOrderSignature}
        onSign={handleSign}
        _setIntentOrder={setIntentOrder}
        _setEphemeralAddress={setEphemeralAddress}
        _setTokenAddress={setTokenAddress}
        _setAmount={setAmount}
        _setChainId={setChainId}
        _setDestChainId={setDestChainId}
        _setUserAddress={setUserAddress}
      />
    </>
  );
  const permitSignForm = (
    <>
      <Typography variant="h4" sx={{ fontWeight: "bold" }}>
        Sign Permit
      </Typography>
      <SignPermitForm
        intentOrder={intentOrder}
        ephemeralAddress={ephemeralAddress}
        userAddress={userAddress}
        tokenAddress={tokenAddress}
        amount={amount}
        chainId={chainId}
        destChainId={destChainId}
        _setPermitData={setPermitData}
        _setSignature={setPermitSignature}
      />
    </>
  );
  const deploymentWatcherForm = (
    <>
      <Typography variant="h4" sx={{ fontWeight: "bold" }}>
        Deployment Watcher
      </Typography>
      <DeploymentWatcher
        sourceChainId={chainId}
        destChainId={destChainId}
        ephemeralAddress={ephemeralAddress}
        tokenAmount={amount}
      />
    </>
  );

  const formIndicator = () => {
    if (userStep == 1) return intentSignForm;
    else if (userStep == 2) return permitSignForm;
    else if (userStep == 3) return deploymentWatcherForm;
    else return null;
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
        {/* Step Indicator */}
        <StepIndicator currentStep={userStep} />

        {/* Content based on signing state */}
        {formIndicator()}
      </Container>
    </Box>
  );
};

export default SignerPage;
