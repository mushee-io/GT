import { useEffect, useMemo, useState } from "react";
import { connectFreighter } from "./freighterSigner";
import { runPaidSummarize } from "./payment";

const serverUrl = import.meta.env.VITE_SERVER_URL || "";
const rpcUrl =
  import.meta.env.VITE_STELLAR_RPC_URL ||
  "https://soroban-testnet.stellar.org";

export default function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [text, setText] = useState(
    "Stellar is a fast, low-cost blockchain designed for payments and asset movement.",
  );
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      setLoadingConfig(true);
      setError("");
      try {
        const response = await fetch(new URL("/api/config", serverUrl).toString());
        const data = await response.json();
        if (!cancelled) {
          setConfig(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load backend config.");
        }
      } finally {
        if (!cancelled) {
          setLoadingConfig(false);
        }
      }
    }

    if (serverUrl) {
      loadConfig();
    } else {
      setLoadingConfig(false);
      setError("Missing VITE_SERVER_URL");
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const paymentLabel = useMemo(() => {
    if (!config?.payment?.display) return "Waiting for backend";
    return config.payment.display;
  }, [config]);

  async function handleConnect() {
    setError("");
    try {
      const address = await connectFreighter();
      setWalletAddress(address);
    } catch (err) {
      setError(err?.message || "Failed to connect Freighter.");
    }
  }

  async function handleSummarize(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setResult(null);

    try {
      const data = await runPaidSummarize({
        serverUrl,
        walletAddress,
        text,
        rpcUrl,
      });
      setResult(data);
    } catch (err) {
      setError(err?.message || "Payment flow failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Mushee Gate • Stellar Testnet</div>
          <h1>Put a real Stellar paywall in front of an API.</h1>
          <p>
            This frontend connects Freighter, reads the x402 payment challenge from the backend,
            signs the auth entry, and retries the request after payment.
          </p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={handleConnect}>
              {walletAddress ? "Freighter connected" : "Connect Freighter"}
            </button>
            <a className="secondary-link" href="https://stellar.org" target="_blank" rel="noreferrer">
              Stellar
            </a>
          </div>
        </div>
        <div className="hero-card">
          <div className="metric-label">Backend</div>
          <div className="metric-value metric-wrap">{serverUrl || "Missing VITE_SERVER_URL"}</div>
          <div className="metric-grid">
            <Metric label="Network" value={config?.network || "stellar:testnet"} />
            <Metric label="Price" value={paymentLabel} />
            <Metric label="Pay to" value={config?.payment?.payTo || "Waiting for backend"} small />
            <Metric label="Wallet" value={walletAddress || "Not connected"} small />
          </div>
        </div>
      </header>

      <main className="content-grid">
        <section className="card">
          <h2>What this app is doing</h2>
          <ul className="steps-list">
            <li>1. Request the protected summarize endpoint without payment.</li>
            <li>2. Read the x402 payment instructions from the backend.</li>
            <li>3. Sign the Soroban auth entry in Freighter.</li>
            <li>4. Retry with the payment signature.</li>
            <li>5. Show the summary, settlement response, and receipt.</li>
          </ul>
        </section>

        <section className="card form-card">
          <div className="card-header-row">
            <div>
              <h2>Try the paid summarize route</h2>
              <p className="muted">Route: {config?.route || "/api/summarize"}</p>
            </div>
            <span className="pill">{paymentLabel}</span>
          </div>

          <form onSubmit={handleSummarize}>
            <label className="field-label" htmlFor="summary-input">Text to summarize</label>
            <textarea
              id="summary-input"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={8}
              placeholder="Paste text here"
            />
            <div className="action-row">
              <button className="primary-btn" type="submit" disabled={!walletAddress || !text.trim() || submitting || loadingConfig}>
                {submitting ? "Waiting for payment..." : "Summarize with payment"}
              </button>
              <span className="helper-text">
                {walletAddress ? `Payer: ${shorten(walletAddress)}` : "Connect Freighter first"}
              </span>
            </div>
          </form>
        </section>

        {error ? (
          <section className="card error-card">
            <h2>Error</h2>
            <pre>{error}</pre>
          </section>
        ) : null}

        {result ? (
          <>
            <section className="card">
              <h2>Summary</h2>
              <p className="summary-output">{result?.data?.summary || "No summary returned."}</p>
            </section>

            <section className="card two-col-card">
              <div>
                <h3>Settlement</h3>
                <pre>{JSON.stringify(result.settlement, null, 2)}</pre>
              </div>
              <div>
                <h3>Receipt</h3>
                <pre>{JSON.stringify(result?.data?.receipt || null, null, 2)}</pre>
              </div>
            </section>

            <section className="card">
              <h2>Debug</h2>
              <pre>{JSON.stringify(result.debug, null, 2)}</pre>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

function Metric({ label, value, small = false }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${small ? "metric-small" : ""}`}>{value}</div>
    </div>
  );
}

function shorten(value) {
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
}
