# Intent-Based Cross-Chain Bridge UI

This is a **demo** React + Next.js UI flow demonstrating how a user can:

1. **Sign an ERC-7683 Intent and EIP-2612 Permit** (`GaslessCrossChainOrder`).
2. **Transfer tokens** to a deterministic ephemeral address (via `CREATE2`).
3. **Observe** the filler (sponsoring gas) deploy the ephemeral contract on both the source and the destination chains.
4. **View** the bridged tokens on the destination chain.

## Project Structure

- **pages/**  
  Contains the Next.js pages (`index.jsx`, `signer.jsx`, etc.). The **`signer`** flow is where the user signs the intent and observes the bridging steps.

- **components/**  
  Reusable React components (forms, watchers, step indicators, etc.).

  - **`SignIntentForm.jsx`** handles the user’s signing logic.
  - **`DeploymentWatcher.jsx`** tracks bridging events in real time.

- **hooks/**  
  Custom React hooks for specialized logic:

  - **`useSubmitOrder`** automatically submits the final order to your backend or aggregator once the user and permit are signed.
  - **`useDebugLogger`** (optional) can be used for console debugging as you develop.

- **chainConfig.json**  
  Static JSON describing chain details for the UI (e.g., chain IDs, RPC URLs, block explorers, or token addresses).

- **styles/**  
  Global CSS and module CSS files. Adjust these or add custom styling as desired.

## Prerequisites

- **Node.js v14+** recommended.
- **Yarn** or **npm** for installing dependencies.
- **MetaMask** or another injected wallet for signing and sending transactions (the code uses [**wagmi**](https://wagmi.sh/) and watchers for a robust multi-chain setup).

## Installation

1. **Clone** this repository:

   ```bash
   git clone https://github.com/colorfulnotion/intents.git
   cd intents/ui
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

   or

   ```bash
   yarn
   ```

3. **Configure** `chainConfig.json` and other environment variables as needed (chain IDs, RPC URLs, block explorers, etc.).

4. **Start the development server**:

   ```bash
   npm run dev
   ```

   or

   ```bash
   yarn dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## Production Build

To create an optimized production build:

```bash
npm run build
npm run start
```

(Or the equivalent Yarn commands.)

## Outstanding Items

1. **Further Bridging Logic**: Real bridging typically requires verifying cross-chain finality proofs. The code here demonstrates the “intent” flow, but you’d integrate a bridging service (e.g., SP1, ZK, or cross-rollup proofs) for a production environment.
