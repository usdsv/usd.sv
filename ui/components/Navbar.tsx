// components/Navbar.tsx
import React from "react";
import Link from "next/link";

const Navbar: React.FC = () => {
  return (
    <nav style={{ backgroundColor: "#fff", padding: "1rem", marginBottom: "1rem" }}>
      <div className="container" style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <strong>Intent Bridge</strong>
        </div>
        <div>
          <Link href="/">Home</Link> | <Link href="/signer">Sign Intent</Link> | <Link href="/transfer">Transfer</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
