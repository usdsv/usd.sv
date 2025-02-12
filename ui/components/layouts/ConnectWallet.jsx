"use client";

import React, { Fragment, useCallback } from "react";
import { useWallets, Widget } from "@rango-dev/widget-embedded";
import { SUPPORTED_WALLETS, WIDGET_CONFIG } from "@/config/constants";
import { Button } from "@mui/material";

function ExternalWallet({ providerName }) {
  const { state, connect, disconnect } = useWallets();
  const providerState = state(providerName);
  const handleClick = useCallback(() => {
    try {
      if (providerState.connected) {
        disconnect(providerName);
      } else {
        connect(providerName);
      }
    } catch (error) {
      console.error(error);
    }
  }, [providerName, providerState, connect, disconnect]);
  return (
    <Button
      disabled={!providerState.installed}
      type={providerState.connected ? "warning" : "primary"}
      size="large"
      onClick={handleClick}
    >
      {providerState.connected
        ? `disconnect ${providerName}`
        : `connect ${providerName}`}
    </Button>
  );
}

const ConnectWallet = () => {
  return (
    <div className="main-container">
      <div className="wallets-container">
        {SUPPORTED_WALLETS.map((providerName, index) => (
          <Fragment key={index}>
            <ExternalWallet providerName={providerName} />
            <br />
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export default ConnectWallet;
