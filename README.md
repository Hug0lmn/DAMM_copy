# 📊 Project: DAMM_COPY_TRADER

## 📄 Purpose

This repository contains my implementation of a copy trading system for **Meteora's DAMM v2 liquidity pools** on Solana.

## 🧠 Background

I started this project after noticing the emergence of a new type of liquidity pool on Meteora: **DAMM v2**. While several closed-source or paid copy trading bots already exist for DLMM pools, I wanted to explore whether a similar approach would be viable for DAMM pools.

So far, it appears that copy trading with DAMM is **not inherently profitable**, mainly because copied wallets often behave differently across DLMM and DAMM due to differing incentive structures.

A new way to identify potentially profitable wallets is by using the tool provided by [Hanyon Analytics](https://meteora2.hanyon.app/) which could inspire future improvements about the analysis part of this project. 
However, I am not sure whether Hanyon Analytics calculates only DAMM position performance or also includes swap profits, which my code does.

As of today (28th June), the first DAMM copy trader has been made available by [Met Engine](https://www.metengine.xyz/), while [Sol Decoder](https://x.com/SOL_Decoder) currently has a product in closed beta.

While these products are available, they take a small portion of your profit as a fee for their services (which is fair). However, I wanted to build a similar product "at home" without having to lose a part of my profit.

I recognize that since the two products mentioned above already have mindshare in the DLMM copy trading space, my goal wasn't to replace or compete with them but rather to create a personal alternative.

## 🏗️ Architecture Overview

This project originally began as a fork of another repository — a **Telegram bot** using a **Cloudflare Worker** to track wallet transactions on Solana. However, due to Cloudflare's limited execution time (which made it hard to automate NFT minting, liquidity management, etc.), I split the code into two components:

- A **Cloudflare Worker**: Responsible for transaction monitoring and forwarding data to Supabase.
- A **Local Worker**: Runs continuously on a server or local machine to manage trading logic and interact with Meteora.

---

## 🔁 Workflow

1. The **Cloudflare Worker** receives Solana transaction webhooks from Helius, filters for DAMM-related transactions, parses them, and stores relevant data in a **Supabase** database.
2. The **Local Worker** subscribes to Supabase Realtime to detect new entries:
   - If the transaction adds liquidity:
     - Swap a portion of $SOL to the target token.
     - Mint the necessary NFT.
     - Add liquidity to the same pool as the target wallet.
   - If it withdraws liquidity:
     - Withdraw the position from the pool.
     - Swap back tokens to $SOL.
     - If there's no open position but the token exists in the wallet, still swap it back.
3. A **Telegram bot** sends you updates on each action performed.

---

## Prerequisites

- A [Helius](https://www.helius.xyz/) account to set up a webhook.
- A [Supabase](https://supabase.com/) instance.
- A Telegram bot token and chat ID (optional, for notifications).
- A `.env` file configured properly.

## 🔧 Planned Improvements
There are several areas for enhancement:

 - Improve copy-trade logic to handle partial withdrawals from target wallets (currently assumes full withdrawal).

 - Improve error handling and retry mechanisms.

 - Add unit tests and basic CI/CD pipeline.

 - Create a dashboard for visualizing copied trades and pool performance.

## ❗ Challenges Faced
One of the biggest difficulties was working with the Meteora DAMM v2 SDK. At the time of development:

The documentation was incomplete or outdated.

Several functions had incorrect or missing parameter definitions.

I had to dive into the SDK's source code to understand proper usage.