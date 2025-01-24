export const DualChainIntent_ABI = [
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "intentAddress",
            type: "address",
          },
          {
            internalType: "address",
            name: "user",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "nonce",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "sourceChainId",
            type: "uint256",
          },
          {
            internalType: "uint32",
            name: "openDeadline",
            type: "uint32",
          },
          {
            internalType: "uint32",
            name: "fillDeadline",
            type: "uint32",
          },
          {
            internalType: "bytes32",
            name: "orderDataType",
            type: "bytes32",
          },
          {
            internalType: "bytes",
            name: "orderData",
            type: "bytes",
          },
        ],
        internalType: "struct GaslessCrossChainOrder",
        name: "_order",
        type: "tuple",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
    ],
    name: "SafeERC20FailedOperation",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "orderId",
        type: "bytes32",
      },
    ],
    name: "Completed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "orderId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "address",
        name: "filler",
        type: "address",
      },
    ],
    name: "Open",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "orderId",
        type: "bytes32",
      },
    ],
    name: "Withdraw",
    type: "event",
  },
  {
    inputs: [],
    name: "bridgeData",
    outputs: [
      {
        internalType: "address",
        name: "filler",
        type: "address",
      },
      {
        internalType: "address",
        name: "sourceToken",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "destinationChainId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "destinationToken",
        type: "address",
      },
      {
        internalType: "address",
        name: "beneficiary",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "destinationFulfilled",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "orderId",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "originData",
        type: "bytes",
      },
      {
        internalType: "bytes",
        name: "fillerData",
        type: "bytes",
      },
    ],
    name: "fill",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "programVKey",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "publicValues",
        type: "bytes",
      },
      {
        internalType: "bytes",
        name: "proofBytes",
        type: "bytes",
      },
    ],
    name: "finalizeOnOrigin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "intentAddress",
            type: "address",
          },
          {
            internalType: "address",
            name: "user",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "nonce",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "sourceChainId",
            type: "uint256",
          },
          {
            internalType: "uint32",
            name: "openDeadline",
            type: "uint32",
          },
          {
            internalType: "uint32",
            name: "fillDeadline",
            type: "uint32",
          },
          {
            internalType: "bytes32",
            name: "orderDataType",
            type: "bytes32",
          },
          {
            internalType: "bytes",
            name: "orderData",
            type: "bytes",
          },
        ],
        internalType: "struct GaslessCrossChainOrder",
        name: "_order",
        type: "tuple",
      },
    ],
    name: "generateOrderId",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_filler",
        type: "address",
      },
    ],
    name: "initializeFiller",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "intentFactory",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "order",
    outputs: [
      {
        internalType: "address",
        name: "intentAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "nonce",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "sourceChainId",
        type: "uint256",
      },
      {
        internalType: "uint32",
        name: "openDeadline",
        type: "uint32",
      },
      {
        internalType: "uint32",
        name: "fillDeadline",
        type: "uint32",
      },
      {
        internalType: "bytes32",
        name: "orderDataType",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "orderData",
        type: "bytes",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "originCompleted",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "orderId",
        type: "bytes32",
      },
      {
        internalType: "uint8",
        name: "v",
        type: "uint8",
      },
      {
        internalType: "bytes32",
        name: "r",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "s",
        type: "bytes32",
      },
    ],
    name: "submitPermit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "orderId",
        type: "bytes32",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
