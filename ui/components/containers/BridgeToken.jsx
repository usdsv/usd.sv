"use client";

// import basic react
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
// import wagmi hooks
import { useAccount, useSignTypedData, useSwitchChain } from "wagmi";
// import mui components
import { Container, Box, Typography, Button } from "@mui/material";
import ReadMoreIcon from "@mui/icons-material/ReadMore";
// import customized components
import ChainSelect from "../signer/ChainSelect";
import TokenSelect from "../signer/TokenSelect";
import DeadlineSelect from "../signer/DeadlineSelect";
import SignDataPreview from "./SignDataPreview";
// import necessary objects
import { quicksand } from "@/utils/fontHelper";
import { getTokens } from "@/config/networks";
import useOrderData from "@/hooks/useOrderData";
import { DeadlineData } from "@/config/constants";

const BridgeToken = ({ handleSign }) => {
  // useOrderData hook for constructing user sign data with given input
  const [manualRequest, setManualRequest] = useState(0);

  const [submittedOrderData, setSubmittedOrderData] = useState(null);
  const [submittedPermitData, setSubmittedPermitData] = useState(null);

  const [orderData, permitData, validations, values, handlers] =
    useOrderData(manualRequest);

  // preview enable / disable state hook
  const [previewEnabled, setPreviewEnabled] = useState(false);

  // wagmi hooks for account and chain select
  const { isConnected, chain: currentChain } = useAccount();
  const { chains, isLoading } = useSwitchChain();

  // const variable for connected current chain
  const isChainConnected = !isLoading && isConnected;
  const isSignable = !!orderData.intentAddress && !!permitData.spender;

  // effect hook for initialize source chain to current connected chain
  useEffect(() => {
    if (isChainConnected) {
      handlers.setSourceChain(currentChain);
    }
  }, [isChainConnected]);

  // handle confirm button click (sign order and permit, send request only)
  const handleConfirm = () => {
    if (!!isSignable) {
      if (manualRequest === 0) {
        setManualRequest(1);
      }
    }
  };

  // handle sign order and permit data (request receive)
  useEffect(() => {
    if (orderData.intentAddress) {
      if (manualRequest === 1) {
        handleSign(orderData, permitData);
        setSubmittedOrderData(orderData);
        setSubmittedPermitData(permitData);
        setManualRequest(2);
      }
    }
  }, [orderData.intentAddress]);

  // const variable for render when loading connection
  const loadingConnection = (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      marginBlock={5}
    >
      <Typography
        variant="h4"
        className={quicksand.className}
        sx={{
          fontSize: "1rem",
          fontWeight: "600",
        }}
      >
        Wallet not connected, please connect ...
      </Typography>
    </Box>
  );

  // const variable for render bridge token main ui
  const bridgeTokenUI = (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="start">
        {/* Source Chain UI Group */}
        <Box
          display="flex"
          flex={3}
          flexDirection="column"
          justifyContent="center"
          gap={3}
        >
          {/* Source Chain Select */}
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="start"
            position="relative"
            gap="0.25rem"
            width="100%"
          >
            <Typography
              variant="s"
              className={quicksand.className}
              sx={{
                fontSize: "1rem",
                fontWeight: "600",
                pl: "0.5rem",
              }}
            >
              From source chain
            </Typography>
            <ChainSelect
              chain={values.sourceChain}
              setChain={handlers.setSourceChain}
              chains={chains.filter((chain) => {
                return (
                  values.destChain === null || chain.id !== values.destChain.id
                );
              })}
            ></ChainSelect>
          </Box>
          {/* Source Token Form */}
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="start"
            position="relative"
            gap="0.25rem"
            width="100%"
          >
            <Typography
              variant="s"
              className={quicksand.className}
              sx={{
                fontSize: "1rem",
                fontWeight: "600",
                pl: "0.5rem",
              }}
            >
              You send
            </Typography>
            <TokenSelect
              token={values.sourceToken}
              setToken={handlers.setSourceToken}
              tokens={getTokens()}
              tokenAmount={values.tokenAmount}
              setTokenAmount={handlers.setTokenAmount}
              disabler={values.sourceChain}
              placeHolder={"Enter an amount"}
              readOnly={false}
            ></TokenSelect>
            <Typography
              variant="s"
              className={quicksand.className}
              sx={{
                fontSize: "1rem",
                fontWeight: "600",
                color: validations.amountValid ? "red" : "black",
                pl: "0.5rem",
              }}
            >
              {validations.sourceTokenBalance &&
                `${ethers.formatEther(validations.sourceTokenBalance)} 
              ${values.sourceToken.symbol}`}
              {validations.sourceTokenBalance && (
                <Typography
                  variant="s"
                  className={quicksand.className}
                  sx={{
                    fontSize: "1rem",
                    fontWeight: "400",
                    pl: "0.5rem",
                  }}
                >
                  available
                </Typography>
              )}
            </Typography>
          </Box>
        </Box>
        <Box
          display="flex"
          flex={1}
          justifyContent="center"
          alignItems="center"
          justifyItems="center"
          height="100%"
        >
          <Typography justifyContent="center" alignItems="center"></Typography>
        </Box>
        {/* Dest Chain UI Group */}
        <Box
          display="flex"
          flex={3}
          flexDirection="column"
          justifyContent="center"
          gap={3}
        >
          {/* Dest Chain Select */}
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="start"
            position="relative"
            gap="0.25rem"
            width="100%"
          >
            <Typography
              variant="s"
              className={quicksand.className}
              sx={{
                fontSize: "1rem",
                fontWeight: "600",
                pl: "0.5rem",
              }}
            >
              To destination chain
            </Typography>
            <ChainSelect
              chain={values.destChain}
              setChain={handlers.setDestChain}
              chains={chains.filter((chain) => {
                return (
                  values.sourceChain === null ||
                  chain.id !== values.sourceChain.id
                );
              })}
            ></ChainSelect>
          </Box>
          {/* Dest Token Form */}
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="start"
            position="relative"
            gap="0.25rem"
            width="100%"
          >
            <Typography
              variant="s"
              className={quicksand.className}
              sx={{
                fontSize: "1rem",
                fontWeight: "600",
                pl: "0.5rem",
              }}
            >
              You receive
            </Typography>
            <TokenSelect
              token={values.destToken}
              setToken={handlers.setDestToken}
              tokens={getTokens()}
              tokenAmount={
                values.tokenAmount
                  ? parseFloat(values.tokenAmount) -
                    parseFloat(
                      values.tokenAmount *
                        DeadlineData[values.deadlineIndex].fee
                    )
                  : 0
              }
              disabler={values.destChain}
              placeHolder={"Calculated amount"}
              readOnly={true}
            ></TokenSelect>
          </Box>
        </Box>
      </Box>
      {/* Order Strategy */}
      <Box display="flex" alignItems="end" paddingTop={3}>
        <Box
          display="flex"
          flexDirection="column"
          flex={4}
          alignItems="start"
          gap="0.25rem"
        >
          <Typography
            variant="s"
            className={quicksand.className}
            sx={{
              fontSize: "1rem",
              fontWeight: "600",
              pl: "0.5rem",
            }}
          >
            Order Strategy
          </Typography>
          <DeadlineSelect
            deadlineIndex={values.deadlineIndex}
            setDeadlineIndex={handlers.setDeadlineIndex}
            tokenAmount={values.tokenAmount}
            tokenSymbol={values.destToken ? values.destToken.symbol : ""}
          />
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box display="flex" width="100%" flexDirection="column" gap={3}>
      {isChainConnected ? (
        <>
          {" "}
          {/* Bridge Tokens Container UI */}
          <Container
            maxWidth="md"
            sx={{
              border: "none",
              borderRadius: 4,
              background: "rgb(255 , 255 , 255)",
              p: 3,
            }}
          >
            <Box display="flex" flexDirection="column" gap={3}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box
                  display="flex"
                  flexDirection="column"
                  justifyContent="center"
                  alignItems="start"
                  gap={1}
                >
                  <Typography
                    variant="h4"
                    className={quicksand.className}
                    sx={{
                      fontSize: "1.25rem",
                      fontWeight: "800",
                    }}
                  >
                    Bridge tokens
                  </Typography>
                  <Typography
                    variant="h4"
                    className={quicksand.className}
                    sx={{
                      fontSize: "1rem",
                    }}
                  >
                    Transfer your tokens from source chain to destination chain.
                  </Typography>
                </Box>
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  mr={1}
                >
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    width="34px"
                    height="34px"
                    sx={{
                      border: "none",
                      borderRadius: "50%",
                      backgroundColor: "#30609010",
                      color: previewEnabled ? "#306090" : "#30609090",
                      cursor: "pointer",
                      ":hover": {
                        backgroundColor: "#30609020",
                      },
                    }}
                    onClick={() =>
                      setPreviewEnabled(!previewEnabled && isSignable)
                    }
                  >
                    <ReadMoreIcon></ReadMoreIcon>
                  </Box>
                </Box>
              </Box>
              {bridgeTokenUI}
            </Box>
          </Container>
          {/* Order Preview UI */}
          {previewEnabled &&
            (manualRequest !== 2 ? (
              <SignDataPreview orderData={orderData} permitData={permitData} />
            ) : (
              submittedOrderData &&
              submittedPermitData && (
                <SignDataPreview
                  orderData={submittedOrderData}
                  permitData={submittedPermitData}
                />
              )
            ))}
          {/* Confirm Button Container UI */}
          <Container
            maxWidth="md"
            sx={{
              border: "none",
              borderRadius: 4,
              background: "rgb(255 , 255 , 255)",
              p: 3,
            }}
          >
            <Box display="flex" justifyContent="center" alignItems="center">
              <Box
                flex="3"
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="start"
              >
                <Typography
                  variant="s"
                  className={quicksand.className}
                  sx={{
                    fontSize: "1rem",
                    fontWeight: "500",
                    color: "#a0a0a0",
                  }}
                >
                  Total (send + no gas)
                </Typography>
                <Typography
                  variant="s"
                  className={quicksand.className}
                  sx={{
                    fontSize: "1.25rem",
                    fontWeight: "700",
                  }}
                >
                  {values.tokenAmount.length === 0
                    ? "0.00"
                    : parseFloat(values.tokenAmount).toFixed(2)}{" "}
                  {values.sourceToken ? values.sourceToken.symbol : ""}
                </Typography>
              </Box>
              <Box flex="7" paddingInline="1rem">
                <Button
                  variant="contained"
                  className={quicksand.className}
                  sx={{
                    border: "none",
                    borderRadius: "25px",
                    backgroundColor: "rgba(25, 118, 210, 1)",
                    height: "50px",
                    width: "100%",
                    textTransform: "none",
                    fontSize: "1rem",
                    fontWeight: "600",
                    color: "white",
                    boxShadow: "none",
                    ":hover": {
                      backgroundColor: "rgba(25, 118, 210, 0.9)",
                      boxShadow: "none",
                    },
                  }}
                  onClick={handleConfirm}
                  disabled={!isSignable}
                >
                  Confirm
                </Button>
              </Box>
            </Box>
          </Container>
        </>
      ) : (
        <>{loadingConnection}</>
      )}
    </Box>
  );
};

export default BridgeToken;
