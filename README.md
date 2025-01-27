# Intent-Based Cross-Chain Bridge UI

This is a **demo** React + Next.js UI flow demonstrating how a user can:

1. **Sign an ERC-7683 Intent and EIP-2612 Permit** (`GaslessCrossChainOrder`).
2. **Transfer tokens** to a deterministic ephemeral address (via `CREATE2`).
3. **Observe** the filler (sponsoring gas) deploy the ephemeral contract on both the source and the destination chains.
4. **View** the bridged tokens on the destination chain.

## Next Steps

1. [UI] Adjust the UI to match the Metamask Bridge design _as closely as possible_.  For deadline UI + gas estimates, have 3 deadline preference {Fast, Auto, Economy} instead of showing Gwei, we can present options as "fee":
* Auto: < 5min -- modest fee 0.01% + Fixed gas price (This is the default)
* Fast: < 1 min -- highest fee 0.1% + Fixed gas price
* Economy: 5-10 min -- cheapest fee 0.05% + Fixed gas price

Map this preference into reasonable openDeadline & fillDeadline as you see fit.  

2. [Script] Refactor the hardhat script into a filler.js script (meaning, both should work with shared components) that takes the exact same JSONBLOB:

```
node fill.js '{"permitsignature":"0x8b9e062cbdae0e34bef31dcc4ce740089821c38abd7f34dea65e8e02101fcd9a6a4fa6cf3a45f6e425b5fad28590d74a44ca90aa8b6071335016fa970f49b8b71c","permitrawbytes":"0x00000000000000000000000007540105a6c4582bc036c87125718861150e4f3a0000000000000000000000009ba9e5cb7df9835267edaa615e6457c09be44b3e0000000000000000000000000000000000000000000000056bc75e2d6310000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000067932c88","ordersignature":"0xc93fda7047ae9a99550cb8a2f7b94252cd924513a21e5fb219cdb980a09da18502d8ce9706698b0c0b22aaaad0228551c40185d31caba12bc67c3d9e0a47012a1c","orderrawbytes":"0x0000000000000000000000009ba9e5cb7df9835267edaa615e6457c09be44b3e00000000000000000000000007540105a6c4582bc036c87125718861150e4f3a00000000000000000000000000000000000000000000000000000000000030390000000000000000000000000000000000000000000000000000000000aa36a70000000000000000000000000000000000000000000000000000000067932c800000000000000000000000000000000000000000000000000000000067946ff0e7916c0abb18c8d4e936c90c4b274f18cfea48ab9203ec4dd4e48f45a126d482000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000bf882fc99800a93494fe4844dc0002fcbaa79a7a0000000000000000000000000000000000000000000000056bc75e2d631000000000000000000000000000000000000000000000000000000000000000000165000000000000000000000000bf882fc99800a93494fe4844dc0002fcbaa79a7a00000000000000000000000007540105a6c4582bc036c87125718861150e4f3a"}'
```

-  `fill.js` should use a _static_ finality proof (provided earlier) to demonstrate that the filler receives the funds on the destination chain.  The escrowed funds should be unlocked for the filler.
- Critically, the result of running this script should show the status indications in the UI.
- Add the intent address and the parsed component of both pieces back into the JSONBLOB so that we talk about each blob between ourselves easily.   Basically, what Sourabh will do is run the fill.js script upon each JSON POST. 
 
3. [Testing] After `fill.js` is running, send Sourabh 3 Mock USDT 0xEaf3223589Ed19bcd171875AC1D0F99D31A5969c using the UI on all chains so he can send 2 USDT to Michael and he can send 1 USDT to you on all chains.  Fix any issues from [PR #6](https://github.com/colorfulnotion/intents/pull/6) and share any guidelines you believe we should be following in the READMEs.  
