// pages/index.tsx
import React from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Home: React.FC = () => {
  return (
    <div>
      <Navbar />
      <div className="container">
        <h1>Intent-Based Cross-Chain Bridge Demo</h1>
        <p>This is a sample UI to demonstrate how a user can:</p>
        <ol>
          <li>Sign an intent (order)</li>
          <li>Transfer funds to the ephemeral intent address</li>
          <li>Observe contract deployments on source/destination</li>
          <li>View final bridging on the destination chain</li>
        </ol>
        <Link href="/signer">
          <button>Start the Flow</button>
        </Link>
      </div>
      <Footer />
    </div>
  );
};

export default Home;
