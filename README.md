# Mushee Gate Frontend

React + Vite frontend for the Stellar Testnet paywall.

## What it does

- loads backend payment config
- connects Freighter Browser Extension
- sends the first unpaid request
- reads the x402 `PAYMENT-REQUIRED` challenge
- signs the auth entry in Freighter
- retries with `PAYMENT-SIGNATURE`
- displays the summary, settlement response, and receipt

## Deploy to Vercel

- Create a new Vercel project from this folder
- Framework preset: **Vite**
- Root directory: this frontend folder
- Build command: `npm run build`
- Output directory: `dist`

## Required environment variables

```env
VITE_SERVER_URL=https://your-backend.vercel.app
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
```

## Wallet support

Use **Freighter Browser Extension** on Testnet. Stellar’s current x402 docs list Freighter Browser Extension among the compatible wallets, while Freighter mobile does not currently support x402. citeturn827598search2
