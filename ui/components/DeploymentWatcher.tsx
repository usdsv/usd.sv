// components/DeploymentWatcher.tsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import chainData from "../chainConfig.json";

const SOURCE_CHAIN_ID = 357;      // OP Stack Rollup
const DESTINATION_CHAIN_ID = 763373; // Ink Sepolia (or 11155111 for normal Sepolia, etc.)

/**
 * Replace with your actual contract addresses and event signatures
 * - FACTORY_ADDRESS (on source chain)
 * - INTENT_DEPLOYED_TOPIC => keccak256 of "IntentDeployed(address,GaslessCrossChainOrder)"
 * - ERC20_TRANSFER_TOPIC => keccak256 of "Transfer(address,address,uint256)"
 * - FILLER_DEST_TRANSFER_TOPIC => bridging/transfer event if you have a custom bridging contract
 */
const FACTORY_ADDRESS = "0xFactoryAddressHere";
const ERC20_ADDRESS   = "0xSomeERC20Here";
const EPHEMERAL_ADDRESS = "0xEphemeralAddressHere";  // If known in advance
const INTENT_DEPLOYED_TOPIC = ethers.utils.id("IntentDeployed(address,GaslessCrossChainOrder)");
const TRANSFER_TOPIC        = ethers.utils.id("Transfer(address,address,uint256)");
// If there's a specialized bridging event, put its signature topic here:
const BRIDGING_EVENT_TOPIC  = ethers.utils.id("BridgingFinalized(address,uint256)");

const DeploymentWatcher: React.FC = () => {
  const [sourceDeployed, setSourceDeployed] = useState(false);
  const [destinationDeployed, setDestinationDeployed] = useState(false);
  const [userTransferDone, setUserTransferDone] = useState(false);
  const [fillerTransferDone, setFillerTransferDone] = useState(false);

  useEffect(() => {
    // Find chain configs
    const chainList = (chainData as any).chains; // typed as any for brevity
    const sourceChain = chainList.find((c: any) => c.chainId === SOURCE_CHAIN_ID);
    const destinationChain = chainList.find((c: any) => c.chainId === DESTINATION_CHAIN_ID);

    // We'll store providers in an array so we can clean up on unmount
    const providers: ethers.providers.WebSocketProvider[] = [];

    // Function to handle logs from the source chain
    const setupSourceListener = (wssUrl: string) => {
      const wsProvider = new ethers.providers.WebSocketProvider(wssUrl);
      providers.push(wsProvider);

      // Listen for the "IntentDeployed" event from the factory
      wsProvider.on(
        {
          address: FACTORY_ADDRESS,
          topics: [INTENT_DEPLOYED_TOPIC]
        },
        (log) => {
          console.log("Source chain: IntentDeployed event", log);
          setSourceDeployed(true);
        }
      );

      // Listen for the user's token Transfer into ephemeral contract
      wsProvider.on(
        {
          address: ERC20_ADDRESS, // token contract
          topics: [
            TRANSFER_TOPIC,
            null, // from (user)
            ethers.utils.hexZeroPad(EPHEMERAL_ADDRESS, 32) // to (ephemeral)
          ]
        },
        (log) => {
          console.log("Source chain: User transfer to ephemeral address", log);
          setUserTransferDone(true);
        }
      );
    };

    // Function to handle logs from the destination chain
    const setupDestinationListener = (wssUrl: string) => {
      const wsProvider = new ethers.providers.WebSocketProvider(wssUrl);
      providers.push(wsProvider);

      // Listen for "IntentDeployed" (if you also deploy on destination chain)
      wsProvider.on(
        {
          address: FACTORY_ADDRESS,
          topics: [INTENT_DEPLOYED_TOPIC]
        },
        (log) => {
          console.log("Destination chain: IntentDeployed event", log);
          setDestinationDeployed(true);
        }
      );

      // Listen for bridging finalization or filler transfer
      wsProvider.on(
        {
          address: ERC20_ADDRESS, // or bridging contract
          topics: [TRANSFER_TOPIC]
          // If you know "from" is ephemeral and "to" is beneficiary or filler, add partial indexing as above
        },
        (log) => {
          console.log("Destination chain: Transfer event from filler bridging", log);
          setFillerTransferDone(true);
        }
      );

      // Or if bridging is a custom event:
      wsProvider.on(
        {
          address: EPHEMERAL_ADDRESS, // or bridging contract
          topics: [BRIDGING_EVENT_TOPIC]
        },
        (log) => {
          console.log("Destination chain: Bridging finalization event", log);
          setFillerTransferDone(true);
        }
      );
    };

    // If we have a WSS for the source chain, set up the source listener
    if (sourceChain?.wss) {
      setupSourceListener(sourceChain.wss);
    }

    // If we have a WSS for the destination chain, set up the destination listener
    if (destinationChain?.wss) {
      setupDestinationListener(destinationChain.wss);
    }

    // Cleanup function to remove the listeners
    return () => {
      providers.forEach((p) => p.removeAllListeners());
      providers.forEach((p) => p.destroy());
    };
  }, []);

  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", marginTop: "1rem" }}>
      <h3>Deployment & Bridging Progress</h3>
      <p>Source Chain Deployed? {sourceDeployed ? "Yes ✅" : "Pending..."}</p>
      <p>Source Chain User Transfer? {userTransferDone ? "Yes ✅" : "Pending..."}</p>
      <p>Destination Chain Deployed? {destinationDeployed ? "Yes ✅" : "Pending..."}</p>
      <p>Destination Filler Transfer? {fillerTransferDone ? "Yes ✅" : "Pending..."}</p>
    </div>
  );
};

export default DeploymentWatcher;
