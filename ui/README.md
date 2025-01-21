# Intent-Based Cross-Chain Bridge UI

This is a **demo** React + Next.js UI flow that shows how a user can:

1. **Sign an ERC-7683 intent** (GaslessCrossChainOrder).
2. **Transfer tokens** to a deterministic ephemeral address (via `CREATE2`).
3. **Observe** the filler (sponsoring gas) deploy the ephemeral contract on the source chain and the destination chain.
4. **View** the bridged tokens on the destination chain.

> **Note**: This is a simplified sample. In a real setup, you'd integrate:
>
> - On-chain factories,
> - Real bridging (SP1 proofs, finality checks),
> - A filler or aggregator service that calls `IntentFactory.createIntent(...)`,
> - Additional UI for verifying proof submission and final escrow unlocking.

## Project Structure

- **pages/**  
  Contains the Next.js pages (`index.tsx`, `signer.tsx`, etc.).
- **components/**  
  Reusable React components (forms, watchers, navbar, footer, etc.).
- **chainConfig.json**  
  Static JSON describing chain details for the UI.
- **styles/**  
  Global CSS and module CSS files.

## Prerequisites

- **Node.js v14+** recommended.
- **Yarn** or **npm** for installing dependencies.
- **MetaMask** or another injected wallet for signing and sending transactions.

## Installation

1. **Clone** this repository:

   ```bash
   git clone https://github.com/your-username/my-intent-bridge-ui.git
   cd my-intent-bridge-ui

   ```

2. Install dependencies:

```bash
npm install
```

or

```bash
yarn
```

3. Configure the chainConfig.json with your specific chain IDs, RPC URLs, block explorers, etc.

4. Start the development server:

```bash
npm run dev
```

or

```bash
yarn dev
```

Open http://localhost:3000 to view in your browser.

## Production Build

To create an optimized production build:

```bash
npm run build
npm run start
```

(Or the equivalent Yarn commands.)

## Outstanding Items

1. Demonstrate the above in vercel with Metamask Wallet Integration: The code uses a simple window.ethereum approach. Consider using wagmi or RainbowKit for robust wallet management.
2. Security & Validation: Proper checks (signatures, deadlines, reverts) are partially mocked.
