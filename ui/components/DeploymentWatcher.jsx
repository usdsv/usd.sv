// components/DeploymentWatcher.jsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import chainData from "../chainConfig.json";

const SOURCE_CHAIN_ID = 357; // OP Stack Rollup
const DESTINATION_CHAIN_ID = 763373; // Ink Sepolia (or 11155111 for normal Sepolia, etc.)

const FACTORY_ADDRESS = "0xFactoryAddressHere";
const ERC20_ADDRESS = "0xSomeERC20Here";
const EPHEMERAL_ADDRESS = "0xEphemeralAddressHere";
const INTENT_DEPLOYED_TOPIC = ethers.utils.id(
  "IntentDeployed(address,GaslessCrossChainOrder)"
);
const TRANSFER_TOPIC = ethers.utils.id("Transfer(address,address,uint256)");
const BRIDGING_EVENT_TOPIC = ethers.utils.id(
  "BridgingFinalized(address,uint256)"
);

const DeploymentWatcher = () => {
  const [sourceDeployed, setSourceDeployed] = useState(false);
  const [destinationDeployed, setDestinationDeployed] = useState(false);
  const [userTransferDone, setUserTransferDone] = useState(false);
  const [fillerTransferDone, setFillerTransferDone] = useState(false);

  useEffect(() => {
    const chainList = chainData.chains;
    const sourceChain = chainList.find((c) => c.chainId === SOURCE_CHAIN_ID);
    const destinationChain = chainList.find(
      (c) => c.chainId === DESTINATION_CHAIN_ID
    );

    const providers = [];

    const setupSourceListener = (wssUrl) => {
      const wsProvider = new ethers.providers.WebSocketProvider(wssUrl);
      providers.push(wsProvider);

      wsProvider.on(
        {
          address: FACTORY_ADDRESS,
          topics: [INTENT_DEPLOYED_TOPIC],
        },
        (log) => {
          console.log("Source chain: IntentDeployed event", log);
          setSourceDeployed(true);
        }
      );

      wsProvider.on(
        {
          address: ERC20_ADDRESS,
          topics: [
            TRANSFER_TOPIC,
            null,
            ethers.utils.hexZeroPad(EPHEMERAL_ADDRESS, 32),
          ],
        },
        (log) => {
          console.log("Source chain: User transfer to ephemeral address", log);
          setUserTransferDone(true);
        }
      );
    };

    const setupDestinationListener = (wssUrl) => {
      const wsProvider = new ethers.providers.WebSocketProvider(wssUrl);
      providers.push(wsProvider);

      wsProvider.on(
        {
          address: FACTORY_ADDRESS,
          topics: [INTENT_DEPLOYED_TOPIC],
        },
        (log) => {
          console.log("Destination chain: IntentDeployed event", log);
          setDestinationDeployed(true);
        }
      );

      wsProvider.on(
        {
          address: ERC20_ADDRESS,
          topics: [TRANSFER_TOPIC],
        },
        (log) => {
          console.log(
            "Destination chain: Transfer event from filler bridging",
            log
          );
          setFillerTransferDone(true);
        }
      );

      wsProvider.on(
        {
          address: EPHEMERAL_ADDRESS,
          topics: [BRIDGING_EVENT_TOPIC],
        },
        (log) => {
          console.log("Destination chain: Bridging finalization event", log);
          setFillerTransferDone(true);
        }
      );
    };

    if (sourceChain?.wss) {
      setupSourceListener(sourceChain.wss);
    }

    if (destinationChain?.wss) {
      setupDestinationListener(destinationChain.wss);
    }

    return () => {
      providers.forEach((p) => p.removeAllListeners());
      providers.forEach((p) => p.destroy());
    };
  }, []);

  return (
    <div
      style={{ border: "1px solid #ccc", padding: "1rem", marginTop: "1rem" }}
    >
      <h3>Deployment & Bridging Progress</h3>
      <p>Source Chain Deployed? {sourceDeployed ? "Yes ✅" : "Pending..."}</p>
      <p>
        Source Chain User Transfer? {userTransferDone ? "Yes ✅" : "Pending..."}
      </p>
      <p>
        Destination Chain Deployed?{" "}
        {destinationDeployed ? "Yes ✅" : "Pending..."}
      </p>
      <p>
        Destination Filler Transfer?{" "}
        {fillerTransferDone ? "Yes ✅" : "Pending..."}
      </p>
    </div>
  );
};

export default DeploymentWatcher;
