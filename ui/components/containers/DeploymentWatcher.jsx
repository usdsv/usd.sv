import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link,
  CircularProgress,
  Alert,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import WarningIcon from "@mui/icons-material/Warning";
import React, { useEffect, useState } from "react";
import { abis } from "@/abi";
import {
  getContractAddress,
  ExplorerLink,
  getToken,
  tokenIds,
} from "@/config/networks";
import { useAccount, useReadContract, useWatchContractEvent } from "wagmi";
import { ethers } from "ethers";
import { zeroAddress } from "viem";

const DeploymentWatcher = ({
  sourceChainId,
  destChainId,
  tokenAmount,
  ephemeralAddress,
  recoveredAddress,
  orderSignature,
  permitSignature,
  estimateGas,
  estimateReward,
}) => {
  const { isConnected, address } = useAccount();

  /**
   * Local states to track progress
   */
  const [sourceDeployed, setSourceDeployed] = useState(false);
  const [userTransferDone, setUserTransferDone] = useState(false);
  const [sourceDeployTx, setSourceDeployTx] = useState(null);
  const [fillerTransferDone, setFillerTransferDone] = useState(false);
  const [destinationDeployed, setDestinationDeployed] = useState(false);
  const [destDepolyTx, setDestDeployTx] = useState(null);

  /**
   * Recompute steps array whenever any relevant state changes.
   */
  const [steps, setSteps] = useState([]);

  useEffect(() => {
    setSteps([
      {
        label: "Source Chain Deployed",
        status: sourceDeployed ? "ready" : "pending",
        tx: sourceDeployTx,
        details: sourceDeployed ? (
          <Link
            href={`${ExplorerLink(sourceChainId)}tx\\${sourceDeployTx}`}
            underline="hover"
          >
            View Source Chain Deploy Transaction
          </Link>
        ) : (
          "Deployment is still pending."
        ),
      },
      {
        label: "Source Chain User Transfer",
        status: userTransferDone ? "ready" : "pending",
        tx: null,
        details: userTransferDone
          ? "User transfer completed successfully."
          : "Awaiting user transfer...",
      },
      {
        label: "Destination Chain Deployed",
        status: destinationDeployed ? "ready" : "pending",
        tx: destDepolyTx,
        details: destinationDeployed ? (
          <Link
            href={`${ExplorerLink(destChainId)}tx\\${destDepolyTx}`}
            underline="hover"
          >
            View Destination Chain Deploy Transaction
          </Link>
        ) : (
          "Deployment is still pending."
        ),
      },
      {
        label: "Destination Filler Transfer",
        status: fillerTransferDone ? "ready" : "pending",
        tx: null,
        details: fillerTransferDone
          ? "Filler transfer completed successfully."
          : "Awaiting filler transfer...",
      },
    ]);
  }, [
    sourceDeployed,
    userTransferDone,
    destinationDeployed,
    fillerTransferDone,
    sourceDeployTx,
    destDepolyTx,
    sourceChainId,
    destChainId,
  ]);

  sourceChainId = parseInt(sourceChainId, 10);
  destChainId = parseInt(destChainId, 10);

  /**
   * Read Contract Data (for filler address, etc.)
   */
  const { data: bridgeData } = useReadContract({
    address: ephemeralAddress,
    abi: abis.dualChainIntent,
    functionName: "bridgeData",
  });

  /**
   * Utility function to style step statuses
   */
  const getStatusStyle = (status) => {
    switch (status) {
      case "ready":
        return { backgroundColor: "#4caf50", color: "#fff" }; // Green
      case "loading":
        return { backgroundColor: "#ffc107", color: "#8a6d3b" }; // Yellow
      case "error":
        return { backgroundColor: "#f44336", color: "#fff" }; // Red
      case "pending":
      default:
        return { backgroundColor: "#9e9e9e", color: "#fff" }; // Gray
    }
  };

  /**
   * 1) Source Intent Deploy Watcher
   */
  try {
    useWatchContractEvent({
      address: getContractAddress(sourceChainId, "intentFactory"),
      chainId: sourceChainId,
      abi: abis.intentFactory,
      eventName: "IntentDeployed",
      onLogs(logs) {
        console.log("SourceChainIntent: ", logs);
        if (logs.length) {
          setSourceDeployed(true);
          setSourceDeployTx(logs[0].transactionHash);
        }
      },
    });
  } catch (e) {
    console.log("Error setting Source Watcher:", e);
  }

  /**
   * 2) Destination Intent Deploy Watcher
   */
  try {
    useWatchContractEvent({
      address: getContractAddress(destChainId, "intentFactory"),
      chainId: destChainId,
      abi: abis.intentFactory,
      eventName: "IntentDeployed",
      onLogs(logs) {
        console.log("DestChainIntent: ", logs);
        if (logs.length) {
          setDestinationDeployed(true);
          setDestDeployTx(logs[0].transactionHash);
        }
      },
    });
  } catch (e) {
    console.log("Error setting Destination Watcher:", e);
  }

  /**
   * 3) User Transfer Watcher
   */
  try {
    useWatchContractEvent({
      address: getToken(sourceChainId, tokenIds.usdt).address,
      chainId: sourceChainId,
      abi: abis.erc20,
      args: {
        from: address?.toLowerCase() || "",
        to: ephemeralAddress?.toLowerCase() || "",
      },
      eventName: "Transfer",
      onLogs(logs) {
        if (logs.length) {
          console.log("User Token Transfer: ", logs);
          logs.forEach((log) => {
            const from = log.args.from.toLowerCase();
            const to = log.args.to.toLowerCase();
            const value = log.args.value;
            if (
              from === address?.toLowerCase() &&
              to === ephemeralAddress?.toLowerCase() &&
              value == ethers.parseEther(tokenAmount)
            ) {
              setUserTransferDone(true);
            }
          });
        }
      },
    });
  } catch (e) {
    console.log("Error setting User Transfer Watcher:", e);
  }

  /**
   * 4) Filler Transfer Watcher
   */
  try {
    useWatchContractEvent({
      address: getToken(destChainId, tokenIds.usdt).address,
      chainId: destChainId,
      abi: abis.erc20,
      args: {
        to: address?.toLowerCase() || "",
      },
      eventName: "Transfer",
      onLogs(logs) {
        if (logs.length) {
          console.log("Filler Token Transfer: ", logs);
          const fillerAddress = bridgeData
            ? bridgeData[0].toLowerCase()
            : zeroAddress;

          logs.forEach((log) => {
            const from = log.args.from.toLowerCase();
            const to = log.args.to.toLowerCase();

            console.log("From filter: ", from);
            console.log("To filter: ", to);
            console.log("Filler address: ", fillerAddress);

            if (from === fillerAddress && to === address?.toLowerCase()) {
              // Fix: set filler transfer done (not userTransferDone)
              setFillerTransferDone(true);
            }
          });
        }
      },
    });
  } catch (e) {
    console.log("Error setting Filler Transfer Watcher:", e);
  }

  return (
    <Container
      maxWidth="md"
      sx={{
        p: 4,
        border: "1px solid #ccc",
        borderRadius: 2,
        boxShadow: 3,
        bgcolor: "background.paper",
        textAlign: "left",
      }}
    >
      <Typography
        variant="h5"
        sx={{ fontWeight: "bold", textTransform: "uppercase", mb: 3 }}
      >
        Deployment & Bridging Process
      </Typography>

      {/* Accordion 1: Permit Signing */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Permit Signing
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ py: 1 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ textTransform: "uppercase" }}
              fontWeight={500}
              gutterBottom
            >
              Order Signature
            </Typography>
            <Typography
              variant="body2"
              sx={{ wordBreak: "break-all" }}
              fontWeight={500}
            >
              {orderSignature}
            </Typography>
          </Box>
          <Box sx={{ py: 1 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ textTransform: "uppercase" }}
              fontWeight={500}
              gutterBottom
            >
              Permit Signature
            </Typography>
            <Typography
              variant="body2"
              sx={{ wordBreak: "break-all" }}
              fontWeight={500}
            >
              {permitSignature}
            </Typography>
          </Box>
          <Box sx={{ py: 1 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ textTransform: "uppercase" }}
              gutterBottom
            >
              Ephemeral Address
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {ephemeralAddress}
            </Typography>
          </Box>
          <Box sx={{ py: 1 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ textTransform: "uppercase" }}
              gutterBottom
            >
              Recovered Address
            </Typography>
            <Typography variant="body2">{recoveredAddress}</Typography>
          </Box>
          <Box sx={{ py: 1 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ textTransform: "uppercase" }}
              gutterBottom
            >
              Estimated Filler Gas
            </Typography>
            <Typography variant="body2">{estimateGas} Gwei</Typography>
          </Box>
          <Box sx={{ py: 1 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ textTransform: "uppercase" }}
              gutterBottom
            >
              Estimated Filler Reward
            </Typography>
            <Typography variant="body2">{estimateReward} USDT</Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Accordion 2: Deployment & Bridging Steps */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Steps Overview
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {steps.map((step, index) => (
            <Accordion key={index} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center">
                  {/* Circle Number */}
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mr: 2,
                      fontWeight: "bold",
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Typography variant="body1">{step.label}</Typography>
                </Box>
                <Box
                  sx={{
                    px: 2,
                    display: "flex",
                    borderRadius: "15px",
                    fontSize: "0.875rem",
                    ml: "auto",
                    mr: 2,
                    textAlign: "center",
                    alignItems: "center",
                    ...getStatusStyle(step.status),
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">{step.details}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </AccordionDetails>
      </Accordion>

      {/* Mock Buttons */}
      <Box sx={{ my: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Simulate State Changes
        </Typography>
        <Button
          variant="contained"
          color="primary"
          sx={{ mr: 2, mb: 1 }}
          onClick={() => setSourceDeployed(!sourceDeployed)}
        >
          Toggle Source Deployed
        </Button>
        <Button
          variant="contained"
          color="primary"
          sx={{ mr: 2, mb: 1 }}
          onClick={() => setUserTransferDone(!userTransferDone)}
        >
          Toggle User Transfer
        </Button>
        <Button
          variant="contained"
          color="primary"
          sx={{ mr: 2, mb: 1 }}
          onClick={() => setDestinationDeployed(!destinationDeployed)}
        >
          Toggle Destination Deployed
        </Button>
        <Button
          variant="contained"
          color="primary"
          sx={{ mb: 1 }}
          onClick={() => setFillerTransferDone(!fillerTransferDone)}
        >
          Toggle Filler Transfer
        </Button>
      </Box>
    </Container>
  );
};

export default DeploymentWatcher;
