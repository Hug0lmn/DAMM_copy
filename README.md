🛑 Project Status
This project has not been maintained since November 2024.

📌 Project Overview
The goal of this project was to track and notify me about suspicious transactions from specific crypto wallets, commonly referred to as "serial ruggers." At the time, these wallets were launching between 2 to 10 new tokens per day on the Solana blockchain.

⚙️ Technologies Used
To monitor and analyze wallet activity, the project relied on the following services:

Cloudflare Workers – to handle incoming webhook requests

Helius – for blockchain webhooks and RPC access

Telegram API – for sending real-time alerts

Raydium API – for swap data and liquidity info

Dexscreener API – for market insights

Supabase – for database storage and history tracking

🔁 Workflow Example
Here’s a typical flow of how the system operated:

Trigger:
A wallet (previously registered in a Helius webhook) initiates a transaction on the Solana blockchain — e.g., swapping 10 SOL for a new token.

Webhook & Processing:
Helius forwards the transaction data to the Cloudflare Worker, which extracts key information (e.g., transaction time, type, token involved).

Analysis & Notification:

The system checks if the token is new using the Supabase database.

If it's the first interaction with the token:

A new database entry is created.

A Telegram message is sent to notify about the launch of a new coin by a tracked wallet.

If it's not the first interaction:

Additional logic determines whether the transaction could be part of a rug pull.

A different Telegram alert is sent based on the outcome.