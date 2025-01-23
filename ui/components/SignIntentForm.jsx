"use client";

import React, { useState, useEffect } from "react";
import { keccak256, toUtf8Bytes } from "ethers";
import { recoverTypedDataAddress } from "viem";
import { useRouter } from "next/navigation";
import { useAccount, useSignTypedData, useReadContract } from "wagmi";
import { Box, Typography, TextField, Button, Alert } from "@mui/material";
import { ethers } from "ethers";

import {
  ADDRESS_MOCT_USDT,
  ADDRESS_INTENT_FACTORY,
  CHAIN_INFO,
  SALT,
} from "@/config/constants";
import { abis } from "@/abi";

const SignIntentForm = ({
  onSign,
  setSignature,
  _setTokenAddress,
  _setAmount,
  _setChainId,
  _setDestChainId,
  _setEphemeralAddress,
  _setUserAddress,
  _setIntentOrder,
}) => {
  const [chainId, setChainId] = useState("");
  const [destChainId, setDestChainId] = useState("");
  const [nonce, setNonce] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [openDeadline, setOpenDeadline] = useState("");
  const [fillDeadline, setFillDeadline] = useState("");
  const [recoveredAddress, setRecoveredAddress] = useState("");
  const [ephemeralAddress, setEphemeralAddress] = useState("");
  const [formError, setFormError] = useState("");

  const [intentOrder, setIntentOrder] = useState(null);

  const { isConnected, address } = useAccount();
  const router = useRouter();

  const {
    signTypedData: signOrder,
    data: orderSignedData,
    isLoading: orderIsLoading,
    isError: orderIsError,
    isSuccess: orderIsSuccess,
    error: orderError,
    reset: orderReset,
    variables: orderVariables,
  } = useSignTypedData({
    onSuccess: (data) => {
      const formData = {
        chainId,
        nonce,
        tokenAddress,
        amount,
        openDeadline,
        fillDeadline,
        ephemeralAddress,
        address,
      };
      onSign?.(data, formData);
    },
  });

  const { data: computedAddress } = useReadContract({
    address: ADDRESS_INTENT_FACTORY[CHAIN_INFO["chain_" + chainId]],
    abi: abis.intentFactory,
    functionName: "getIntentAddress",
    args: [intentOrder, ethers.id(SALT)],
    query: {
      enabled: !!intentOrder,
    },
  });

  useEffect(() => {
    (async () => {
      if (orderVariables?.message && orderSignedData && !!computedAddress) {
        try {
          const recoveredAddr = await recoverTypedDataAddress({
            domain: orderVariables.domain,
            types: orderVariables.types,
            primaryType: orderVariables.primaryType,
            message: orderVariables.message,
            signature: orderSignedData,
          });

          _setEphemeralAddress(computedAddress);
          _setTokenAddress(tokenAddress);
          _setAmount(amount);
          _setChainId(chainId);
          _setDestChainId(destChainId);
          _setUserAddress(address);

          _setIntentOrder({ ...intentOrder, intentAddress: computedAddress });

          setRecoveredAddress(recoveredAddr);
        } catch (err) {
          console.error("Error recovering address:", err);
        }
      }
    })();
  }, [orderSignedData, orderVariables?.message, computedAddress]);

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

    const parsedChainId = parseInt(chainId, 10);
    const parsedDestChainId = parseInt(destChainId, 10);
    const parsedNonce = parseInt(nonce, 10);
    const parsedOpenDeadline = parseInt(openDeadline, 10);
    const parsedFillDeadline = parseInt(fillDeadline, 10);
    const parsedAmount = parseInt(amount);

    if (isNaN(parsedChainId) || parsedChainId <= 0) {
      setFormError("Source Chain ID must be a positive integer.");
      return;
    }
    if (isNaN(parsedDestChainId) || parsedDestChainId <= 0) {
      setFormError("Destination Chain ID must be a positive integer.");
      return;
    }

    if (isNaN(parsedNonce) || parsedNonce < 0) {
      setFormError("Nonce must be a valid non-negative integer.");
      return;
    }

    if (isNaN(parsedOpenDeadline) || parsedOpenDeadline <= 0) {
      setFormError(
        "Open Deadline must be a valid positive integer (timestamp)."
      );
      return;
    }

    if (isNaN(parsedFillDeadline) || parsedFillDeadline <= 0) {
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

    // user signes GasslessCrossChainOrder
    const bridgeData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256", "uint256", "address", "address"],
      [
        "0x0000000000000000000000000000000000000000",
        ADDRESS_MOCT_USDT,
        ethers.parseEther(amount),
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
      openDeadline: openDeadline, // calculate manually
      fillDeadline: fillDeadline, // calculate manually
      orderDataType: keccak256(toUtf8Bytes("BRIDGE_TRANSFER_ORDER")),
      orderData: bridgeData,
    };

    setIntentOrder(order);

    orderReset();
    try {
      // signMessage({ message: orderMessage });
      signOrder({
        domain: {
          name: "SignOrder",
          version: "1",
          chainId: chainId, // Replace with actual chain ID
          verifyingContract:
            ADDRESS_INTENT_FACTORY[CHAIN_INFO["chain_" + chainId]], // Replace with your contract address
        },
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          Order: [
            { name: "intentAddress", type: "address" },
            { name: "user", type: "address" },
            { name: "nonce", type: "uint256" },
            { name: "sourceChainId", type: "uint256" },
            { name: "openDeadline", type: "uint32" },
            { name: "fillDeadline", type: "uint32" },
            { name: "orderDataType", type: "bytes32" },
            { name: "orderData", type: "bytes" },
          ],
        },
        message: order,
        primaryType: "Order",
      });
    } catch (err) {
      console.error("Signing error:", err);
      setFormError(`Error signing the order: ${err.message || err}`);
    }
  };

  // Decide if we should show the success UI or the form
  const orderSignSuccess = orderIsSuccess && orderSignedData;

  // Fill in defaults
  const handleFillDefaults = () => {
    const currentTimeStamp = Math.floor(Date.now() / 1000);

    setChainId("11155111");
    setDestChainId("357");
    setNonce("1234");
    setTokenAddress("0xBF882Fc99800A93494fe4844DC0002FcbaA79A7A");
    setAmount("100");
    setOpenDeadline(currentTimeStamp + 3600 * 1); // 1 hour
    setFillDeadline(currentTimeStamp + 3600 * 24); // 1 day
  };

  const handleResetInputs = () => {
    setChainId("");
    setDestChainId("");
    setNonce("");
    setTokenAddress("");
    setAmount("");
    setOpenDeadline("");
    setFillDeadline("");
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
      ) : orderSignSuccess ? (
        <>
          <Alert severity="success" sx={{ mb: 2 }}>
            Successfully signed the intent!
          </Alert>
          {orderSignedData && (
            <Box sx={{ my: 2, textAlign: "left" }}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Signature:</strong>
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                {orderSignedData}
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
              setSignature(orderSignedData);
            }}
          >
            Next
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

          {orderIsError && !formError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <strong>Error signing message:</strong> {orderError?.message}
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
            disabled={orderSignedData}
          />
          <TextField
            type="number"
            label="Destination Chain ID"
            value={destChainId}
            onChange={(e) => setDestChainId(e.target.value)}
            placeholder="e.g. 357"
            fullWidth
            margin="normal"
            disabled={orderSignedData}
          />
          <TextField
            type="number"
            label="Nonce"
            value={nonce}
            onChange={(e) => setNonce(e.target.value)}
            placeholder="e.g. 1234"
            fullWidth
            margin="normal"
            disabled={orderSignedData}
          />
          <TextField
            label="Token Address"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x + 40 hex characters"
            fullWidth
            margin="normal"
            disabled={orderSignedData}
          />
          <TextField
            type="number"
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 100"
            fullWidth
            margin="normal"
            disabled={orderSignedData}
          />
          <TextField
            type="number"
            label="Open Deadline"
            value={openDeadline}
            onChange={(e) => setDeadline(e.target.value)}
            placeholder="Unix timestamp, e.g. 1699999999"
            fullWidth
            margin="normal"
            disabled={orderSignedData}
          />
          <TextField
            type="number"
            label="Fill Deadline"
            value={fillDeadline}
            onChange={(e) => setDeadline(e.target.value)}
            placeholder="Unix timestamp, e.g. 1699999999"
            fullWidth
            margin="normal"
            disabled={orderSignedData}
          />

          {!orderSignedData && (
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
            disabled={orderIsLoading || orderSignedData}
          >
            {orderIsLoading
              ? "Signing..."
              : orderSignedData
              ? "Already Signed"
              : "Sign Order"}
          </Button>
        </>
      )}
    </Box>
  );
};

export default SignIntentForm;
