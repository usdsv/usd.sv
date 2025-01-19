// components/Footer.tsx
import React from "react";

const Footer: React.FC = () => {
  return (
    <footer style={{ backgroundColor: "#f1f3f5", marginTop: "2rem", padding: "1rem" }}>
      <div className="container" style={{ textAlign: "center" }}>
        <p style={{ fontSize: "0.9rem" }}>
          Demo UI for Cross-Chain Intent Bridging &copy; 2025
        </p>
      </div>
    </footer>
  );
};

export default Footer;
