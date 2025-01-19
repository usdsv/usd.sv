// components/TransferFundsForm.tsx
import React, { useState } from "react";
import { ethers } from "ethers";

interface Props {
  ephemeralAddress: string; // Address user computed
  tokenAddress: string;     // e.g. from the signed order
  amount: string;           // e.g. from the signed order
}

const TransferFundsForm: React.FC<Props> = ({ ephemeralAddress, tokenAddress, amount }) => {
  const [status, setStatus] = useState("");

  const doTransfer = async () => {
    try {
      if (!window.ethereum) {
        alert("No wallet found!");
        return;
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();

      const erc20 = new ethers.Contract(
        tokenAddress,
        [
          "function transfer(address to, uint256 amount) external returns (bool)"
        ],
        signer
      );

      setStatus("Transferring tokens...");

      const tx = await erc20.transfer(ephemeralAddress, amount);
      await tx.wait();

      setStatus(`Successfully transferred ${amount} tokens to ${ephemeralAddress}`);
    } catch (err: any) {
      console.error(err);
      setStatus("Transfer failed: " + (err.message || "Unknown error"));
    }
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", marginTop: "1rem" }}>
      <h3>Transfer Funds to Ephemeral Address</h3>
      <p>
        Ephemeral Address: <strong>{ephemeralAddress}</strong>
      </p>
      <p>
        Token: <strong>{tokenAddress}</strong>
      </p>
      <p>
        Amount: <strong>{amount}</strong>
      </p>
      <button onClick={doTransfer}>Transfer</button>
      {status && <p>{status}</p>}
    </div>
  );
};

export default TransferFundsForm;
