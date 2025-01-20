import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"

import "dotenv/config"

const OPSTACKROLLUP_RPC_URL = "https://rpc-jam-ccw030wxbz.t.conduit.xyz/Pwe4skpfPaM8HSTPwHDhXzoJoKqdpjfRQ"
const INK_SEPOLIA_RPC_URL = "https://rpc-gel-sepolia.inkonchain.com"
const SEPOLIA_RPC_URL = `https://sepolia.infura.io/v3/${process.env.SEPOLIA_INFURA_KEY}`
const PRIVATE_KEY = process.env.PRIVATE_KEY ?? ""

const config: HardhatUserConfig = {
	defaultNetwork: "hardhat",
	networks: {
		hardhat: {},
		opstackrollup: {
			url: OPSTACKROLLUP_RPC_URL,
			accounts: [PRIVATE_KEY],
		},
		inkSepolia: {
			url: INK_SEPOLIA_RPC_URL,
			accounts: [PRIVATE_KEY],
		},
		sepolia: {
			url: SEPOLIA_RPC_URL,
			accounts: [PRIVATE_KEY],
		},
	},
	etherscan: {
		apiKey: {
			sepolia: "5BSHVNUZ4N21U46JEBW1PAR6T3YVDTYRHN",
		},
	},
	solidity: {
		compilers: [
			{
				version: "0.8.27",
			},
		],
	},
}

export default config
