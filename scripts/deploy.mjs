// Deploy contracts/grafiti.py to GenLayer StudioNet.
//
// Usage (Windows PowerShell):
//   $env:DEPLOYER_PRIVATE_KEY = "0x..."   # a funded StudioNet account
//   node scripts/deploy.mjs
//
// Prints the deployed contract address; put it in .env.local as
// NEXT_PUBLIC_CONTRACT_ADDRESS.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const key = process.env.DEPLOYER_PRIVATE_KEY;
if (!key) {
  console.error("Set DEPLOYER_PRIVATE_KEY (0x-prefixed) before running.");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(join(here, "..", "contracts", "grafiti.py"), "utf8");

const account = createAccount(key);
const client = createClient({ chain: studionet, account });

console.log(`Deploying Grafiti from ${account.address} to ${studionet.name}…`);
const hash = await client.deployContract({ code, args: [] });
console.log(`Deploy tx: ${hash}`);

const receipt = await client.waitForTransactionReceipt({
  hash,
  status: TransactionStatus.ACCEPTED,
  interval: 3000,
  retries: 100,
});

const address =
  receipt?.data?.contract_address ??
  receipt?.contract_address ??
  receipt?.txDataDecoded?.contractAddress;

console.log("Deployment accepted.");
console.log(`Contract address: ${address ?? "(inspect receipt below)"}`);
if (!address) console.dir(receipt, { depth: 4 });
console.log("\nNext: add to .env.local ->");
console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address ?? "0x..."}`);
