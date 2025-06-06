# Folder: Analyse_Account

## 📄 Purpose
This folder contains code related to the collection and analysis of pools and wallets in order to identify profitable wallets based on their transactions through Meteora DAMM v2 — with the potential goal of copying their transactions.

## 🔄 Next Improvements
Currently, the results of these scripts require manual evaluation to determine profitability (in the latest version). I haven't taken the time (nor seen a strong advantage) in calculating the SOL value of each traded token. While this is feasible, it would add unnecessary complexity for my current goals.

However, I may add a parameter to inspect each signature starting from the oldest one (useful mainly for pool analysis).

## 📦 Contents
- `Get_transac.ts` – Retrieves a list of transactions for a specific address (pool or wallet).
- `Check_trans_pool.ts` – Analyzes the different addresses adding/removing liquidity in a pool and evaluates the profitability of their movements.
- `Check_trans_wallet.ts` – Analyzes liquidity interactions for a specific wallet and evaluates their profitability across pools.

## 🧪 How to Use
First, run `Get_transac.ts` with a specific address — this can be a DAMM v2 liquidity pool or a wallet address.

Depending on what you want to analyze:
- **Liquidity Pool:** Run `Check_trans_pool.ts`
- **Wallet:** Run `Check_trans_wallet.ts`
