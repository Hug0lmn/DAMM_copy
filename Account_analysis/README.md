# Folder: Analyse_Account

## 📄 Purpose
This folder contains code related to the collection and analysis of pools and wallets in order to identify profitable wallets based on their transactions through Meteora DAMM v2 — with the potential goal of copying their transactions.

## 🔄 Next Improvements

- **Enhance `Check_trans_pool.ts`**  
  Update the `Check_trans_pool.ts` file to calculate and display profitability, using a similar method as implemented in `Check_trans_wallet.ts`.

- **Add Wallet Activity Visualization**  
  Create a new module or script dedicated to visualizing wallet activity. This should include charts or summaries of transaction patterns, volume, and any other insightful metrics.

- **Implement Date-Based Filtering**  
  Introduce an option to filter wallet transactions or signatures based on a specified date range. This will allow for more targeted analysis over specific time periods.

## 📦 Contents
- `Get_transac.ts` – Retrieves a list of transactions for a specific address (pool or wallet).
- `Check_trans_pool.ts` – Analyzes the different addresses adding/removing liquidity in a pool and evaluates the profitability of their movements.
- `Check_trans_wallet.ts` – Analyzes liquidity interactions for a specific wallet and evaluates their profitability across pools.

## 🧪 How to Use
First, run `Get_transac.ts` with a specific address and a specific number of max transactions — this can be a DAMM v2 liquidity pool or a wallet address.

Depending on what you want to analyze:
- **Liquidity Pool:** Run `Check_trans_pool.ts`
- **Wallet:** Run `Check_trans_wallet.ts`
