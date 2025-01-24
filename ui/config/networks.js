import { zeroAddress } from "viem";

export const networkIds = {
  opstack: 357,
  sepolia: 11155111,
  ink: 763373,
};

const knownNetworks = {
  [networkIds.sepolia]: {
    name: "Sepolia",
    chainId: 11155111,
    rpc: "",
    wss: "",
    explorer: "https://sepolia.etherscan.io/",
  },
  [networkIds.ink]: {
    name: "Ink Sepolia",
    chainId: 763373,
    rpc: "https://rpc-gel-sepolia.inkonchain.com",
    wss: "wss://rpc-gel-sepolia.inkonchain.com",
    explorer: "https://explorer-sepolia.inkonchain.com/",
    docs: "https://blog.kraken.com/product/ink-testnet",
  },
  [networkIds.opstack]: {
    name: "OP Stack Rollup",
    chainId: 357,
    rpc: "https://rpc-jam-ccw030wxbz.t.conduit.xyz/Pwe4skpfPaM8HSTPwHDhXzoJoKqdpjfRQ",
    wss: "wss://rpc-jam-ccw030wxbz.t.conduit.xyz/Pwe4skpfPaM8HSTPwHDhXzoJoKqdpjfRQ",
    explorer: "https://explorer-jam-ccw030wxbz.t.conduit.xyz/",
  },
};

const knownContracts = {
  intentFactory: {
    [networkIds.sepolia]: "0x9065Bd9D33770B38cDAf0761Bc626cf5fA45ae68",
    [networkIds.ink]: "0x9065Bd9D33770B38cDAf0761Bc626cf5fA45ae68",
    [networkIds.opstack]: "0x9065Bd9D33770B38cDAf0761Bc626cf5fA45ae68",
  },
};

export const ExplorerLink = (chainId) => {
  return knownNetworks[chainId].explorer;
};

export const getContractAddress = (chainId, name) => {
  try {
    return knownContracts[name][chainId];
  } catch (error) {
    return zeroAddress;
  }
};

export const tokenIds = {
  usdt: "usdt",
  wbtc: "wbtc",
};

const knownTokens = {
  usdt: {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
    icon: "",
    addresses: {
      [networkIds.sepolia]: "0xBF882Fc99800A93494fe4844DC0002FcbaA79A7A",
      [networkIds.ink]: "0xBF882Fc99800A93494fe4844DC0002FcbaA79A7A",
      [networkIds.opstack]: "0xBF882Fc99800A93494fe4844DC0002FcbaA79A7A",
    },
  },
  wbtc: {
    name: "wrapped BTC",
    symbol: "WBTC",
    decimals: 18,
    icon: "",
    addresses: {
      [networkIds.sepolia]: "0xc580C2C0005798751cd0c221292667deeb991157",
      [networkIds.ink]: "0xc580C2C0005798751cd0c221292667deeb991157",
      [networkIds.opstack]: "0xc580C2C0005798751cd0c221292667deeb991157",
    },
  },
};

export const getToken = (chainId, symbol) => {
  try {
    return {
      ...knownTokens[symbol],
      addresses: undefined,
      address: knownTokens[symbol].addresses[chainId],
    };
  } catch (error) {
    return {
      name: "",
      symbol: "",
      decimals: 18,
      icon: "",
      address: zeroAddress,
    };
  }
};
