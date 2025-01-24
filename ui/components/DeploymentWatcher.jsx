// components/DeploymentWatcher.jsx
import { Box, Link, Paper, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { abis } from "@/abi";
import {
  getContractAddress,
  ExplorerLink,
  getToken,
  tokenIds,
} from "@/config/networks";
import {
  useAccount,
  useReadContract,
  useTransaction,
  useTransactionReceipt,
  useWatchContractEvent,
} from "wagmi";
import { ethers } from "ethers";
import { zeroAddress } from "viem";

const DeploymentWatcher = ({
  sourceChainId,
  destChainId,
  ephemeralAddress,
  tokenAmount,
}) => {
  const [sourceDeployed, setSourceDeployed] = useState(false);
  const [userTransferDone, setUserTransferDone] = useState(false);
  const [sourceDeployTx, setSourceDeployTx] = useState(null);
  const [fillerTransferDone, setFillerTransferDone] = useState(false);
  const [destinationDeployed, setDestinationDeployed] = useState(false);
  const [destDepolyTx, setDestDeployTx] = useState(null);

  const { isConnected, address } = useAccount();

  const { data: bridgeData } = useReadContract({
    address: ephemeralAddress,
    abi: abis.dualChainIntent,
    functionName: "bridgeData",
  });

  sourceChainId = parseInt(sourceChainId, 10);
  destChainId = parseInt(destChainId, 10);

  console.log("SourceChainId: ", sourceChainId);
  console.log("DestChainId: ", destChainId);
  console.log("EphemeralAddress: ", ephemeralAddress);

  // Source Intent Deploy Watcher
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
  } catch (e) {}

  // Destination Intent Deploy Watcher
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
  } catch (e) {}

  // User Transfer Watcher
  try {
    useWatchContractEvent({
      address: getToken(sourceChainId, tokenIds.usdt).address,
      chainId: sourceChainId,
      abi: abis.erc20,
      args: {
        from: address.toLowerCase(),
        to: ephemeralAddress.toLowerCase(),
      },
      eventName: "Transfer",
      onLogs(logs) {
        if (logs.length) {
          console.log("user Token Transfer: ", logs);
          logs.forEach((log) => {
            const from = log.args.from.toLowerCase();
            const to = log.args.to.toLowerCase();
            const value = log.args.value;
            if (
              from === address.toLowerCase() &&
              to === ephemeralAddress.toLowerCase() &&
              value == ethers.parseEther(tokenAmount)
            ) {
              setUserTransferDone(true);
            }
          });
        }
      },
    });
  } catch (e) {}

  // Filler Transfer Watcher
  try {
    useWatchContractEvent({
      address: getToken(destChainId, tokenIds.usdt).address,
      chainId: destChainId,
      abi: abis.erc20,
      args: {
        to: address.toLowerCase(),
      },
      eventName: "Transfer",
      onLogs(logs) {
        if (logs.length) {
          console.log("user Token Transfer: ", logs);
          const fillerAddress = bridgeData
            ? bridgeData[0].toLowerCase()
            : zeroAddress;

          logs.forEach((log) => {
            const from = log.args.from.toLowerCase();
            const to = log.args.to.toLowerCase();

            console.log("from filter: ", from);
            console.log("to filter: ", to);
            console.log("filler address: ", fillerAddress);

            if (from === fillerAddress && to === address.toLowerCase()) {
              setUserTransferDone(true);
            }
          });
        }
      },
    });
  } catch (e) {}

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        borderRadius: 2,
        textAlign: "left",
      }}
    >
      <Typography variant="h5" mb={3} sx={{ textAlign: "center" }}>
        Deployment & Bridging Progress
      </Typography>
      <Box>
        <p>Source Chain Deployed? {sourceDeployed ? "Yes ✅" : "Pending..."}</p>
        {sourceDeployed && (
          <Link href={`${ExplorerLink(sourceChainId)}tx\\${sourceDeployTx}`}>
            Source Chain Deploy Tx
          </Link>
        )}
      </Box>
      <Box>
        <p>
          Source Chain User Transfer?{" "}
          {userTransferDone ? "Yes ✅" : "Pending..."}
        </p>
      </Box>
      <Box>
        <p>
          Destination Chain Deployed?{" "}
          {destinationDeployed ? "Yes ✅" : "Pending..."}
        </p>
        {destinationDeployed && (
          <Link href={`${ExplorerLink(destChainId)}tx\\${destDepolyTx}`}>
            Dest Chain Tx
          </Link>
        )}
      </Box>
      <Box>
        <p>
          Destination Filler Transfer?{" "}
          {fillerTransferDone ? "Yes ✅" : "Pending..."}
        </p>
      </Box>
    </Paper>
  );
};

export default DeploymentWatcher;
