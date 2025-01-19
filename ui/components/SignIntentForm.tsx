// components/SignIntentForm.tsx
import React, { useState } from "react";
import { ethers } from "ethers";

interface Props {
  onSign: (signature: string) => void;
}

const SignIntentForm: React.FC<Props> = ({ onSign }) => {
  const [chainId, setChainId] = useState("31337");
  const [nonce, setNonce] = useState("1234");
  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("100");
  const [deadline, setDeadline] = useState("");
  const [signature, setSignature] = useState("");

  // In a real scenario, you'd do wallet connect or use wagmi
  const signOrder = async () => {
    if (!window.ethereum) {
      alert("No wallet found");
      return;
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    // Build a mock order object
    const order = {
      user: await signer.getAddress(),
      originChainId: parseInt(chainId, 10),
      nonce: parseInt(nonce, 10),
      fillDeadline: parseInt(deadline, 10),
      orderDataType: ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("BRIDGE_TRANSFER_ORDER")
      ),
      orderData: {
        token: tokenAddress,
        amount,
      },
    };

    // Convert to bytes for signing (simplified!)
    const orderHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(JSON.stringify(order))
    );

    const sig = await signer.signMessage(ethers.utils.arrayify(orderHash));
    setSignature(sig);
    onSign(sig);
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", marginTop: "1rem" }}>
      <h3>Sign Intent</h3>

      <label>Origin Chain ID</label>
      <input
        type="text"
        value={chainId}
        onChange={(e) => setChainId(e.target.value)}
      />

      <label>Nonce</label>
      <input
        type="text"
        value={nonce}
        onChange={(e) => setNonce(e.target.value)}
      />

      <label>Token Address</label>
      <input
        type="text"
        value={tokenAddress}
        onChange={(e) => setTokenAddress(e.target.value)}
        placeholder="0x1234..."
      />

      <label>Amount</label>
      <input
        type="text"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <label>Fill Deadline (timestamp)</label>
      <input
        type="text"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
      />

      <button onClick={signOrder}>Sign Order</button>

      {signature && (
        <div style={{ marginTop: "1rem" }}>
          <strong>Signature: </strong> {signature}
        </div>
      )}
    </div>
  );
};

export default SignIntentForm;
