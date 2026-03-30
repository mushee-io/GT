import { Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { x402Client, x402HTTPClient } from "@x402/fetch";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { getNetworkPassphrase } from "@x402/stellar";
import { createFreighterSigner } from "./freighterSigner";

export async function runPaidSummarize({ serverUrl, walletAddress, text, rpcUrl }) {
  const signer = createFreighterSigner(walletAddress);
  const client = new x402Client().register(
    "stellar:*",
    new ExactStellarScheme(signer, { url: rpcUrl }),
  );
  const httpClient = new x402HTTPClient(client);

  const url = new URL("/api/summarize", serverUrl).toString();
  const body = JSON.stringify({ text });

  const firstTry = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });

  const rawPaymentRequired =
    firstTry.headers.get("PAYMENT-REQUIRED") ??
    firstTry.headers.get("payment-required");

  const rawPaymentResponse =
    firstTry.headers.get("PAYMENT-RESPONSE") ??
    firstTry.headers.get("payment-response");

  const firstBodyText = await firstTry.text();

  if (firstTry.status !== 402) {
    let parsed;
    try {
      parsed = firstBodyText ? JSON.parse(firstBodyText) : null;
    } catch {
      parsed = firstBodyText;
    }

    return {
      initialStatus: firstTry.status,
      paidStatus: firstTry.status,
      settlement: null,
      data: parsed,
      paymentRequired: null,
      debug: {
        rawPaymentRequired,
        rawPaymentResponse,
        firstBodyText,
      },
    };
  }

  let paymentRequired;
  try {
    paymentRequired = httpClient.getPaymentRequiredResponse((name) => firstTry.headers.get(name));
  } catch (err) {
    throw new Error(
      [
        err?.message || "Invalid payment required response",
        `status=${firstTry.status}`,
        `PAYMENT-REQUIRED=${rawPaymentRequired ? rawPaymentRequired.slice(0, 160) : "<missing>"}`,
        `PAYMENT-RESPONSE=${rawPaymentResponse ? rawPaymentResponse.slice(0, 160) : "<missing>"}`,
        `body=${firstBodyText ? firstBodyText.slice(0, 300) : "<empty>"}`,
      ].join("\n")
    );
  }

  let paymentPayload = await client.createPaymentPayload(paymentRequired);
  paymentPayload = tightenSorobanFee(paymentPayload, paymentRequired.network);
  const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);

  const paidResponse = await fetch(url, {
    method: "POST",
    headers: {
      ...paymentHeaders,
      "content-type": "application/json",
    },
    body,
  });

  const paidBodyText = await paidResponse.text();
  let data;
  try {
    data = paidBodyText ? JSON.parse(paidBodyText) : null;
  } catch {
    data = paidBodyText;
  }

  const settlement = httpClient.getPaymentSettleResponse((name) => paidResponse.headers.get(name));

  return {
    initialStatus: firstTry.status,
    paidStatus: paidResponse.status,
    settlement,
    paymentRequired,
    data,
    debug: {
      rawPaymentRequired,
      rawPaymentResponse,
      firstBodyText,
      paidBodyText,
    },
  };
}

function tightenSorobanFee(paymentPayload, network) {
  const networkPassphrase = getNetworkPassphrase(network);
  const tx = new Transaction(paymentPayload.payload.transaction, networkPassphrase);
  const sorobanData = tx.toEnvelope().v1()?.tx()?.ext()?.sorobanData();

  if (!sorobanData) {
    return paymentPayload;
  }

  return {
    ...paymentPayload,
    payload: {
      ...paymentPayload.payload,
      transaction: TransactionBuilder.cloneFrom(tx, {
        fee: "1",
        sorobanData,
        networkPassphrase,
      })
        .build()
        .toXDR(),
    },
  };
}
