// pages/signer.tsx
import React, { useState } from "react";
import SignIntentForm from "../components/SignIntentForm";
import StepIndicator from "../components/StepIndicator";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const SignerPage: React.FC = () => {
  const [signedOrder, setSignedOrder] = useState<string>("");

  const handleSign = (signature: string) => {
    setSignedOrder(signature);
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <StepIndicator currentStep={1} />
        <h2>1. Sign Your Intent</h2>
        <SignIntentForm onSign={handleSign} />
        {signedOrder && (
          <div>
            <p>Signature: {signedOrder}</p>
            <p>
              <strong>Next Step:</strong> Transfer your tokens to the ephemeral
              address you computed.
            </p>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default SignerPage;
