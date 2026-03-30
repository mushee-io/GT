import { useEffect, useMemo, useState } from "react";
import { connectFreighter } from "./freighterSigner";
import { runPaidSummarize } from "./payment";

const DEFAULT_TEXT = `Agents are one of the biggest stories in tech right now, but most agents still run into the same hard stop: payments. They can reason, plan, and act — right up until they need to pay for an API call, unlock a tool, access premium data, or complete a paid task. With x402 on Stellar, builders can turn ordinary HTTP requests into paid interactions using micropayments and Soroban authorization, letting apps, services, and agents transact natively on the web.`;

const trustCards = [
  {
    label: "Pay per request",
    title: "Native XLM gating on Stellar testnet",
    body: "Every summarize call can trigger a real paid interaction instead of a fake demo checkout."
  },
  {
    label: "Receipts",
    title: "Proof after payment",
    body: "The result panel stores the paid response and settlement metadata so the flow feels operational, not theoretical."
  },
  {
    label: "Freighter flow",
    title: "Wallet-first interaction",
    body: "Connect Freighter, trigger the route, and complete the flow from a live frontend tied to your backend."
  }
];

const steps = [
  "Connect a Stellar testnet wallet.",
  "Load payment configuration from the backend.",
  "Request a paid summary from /api/summarize.",
  "Approve the x402 payment flow and receive the result."
];

const statFallbacks = [
  { value: "1", label: "Live route", note: "Paid summarize path" },
  { value: "XLM", label: "Asset", note: "Native testnet payment" },
  { value: "x402", label: "Protocol", note: "Paid HTTP request flow" }
];

export default function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [config, setConfig] = useState(null);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("Waiting for backend");
  const [error, setError] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const serverUrl = useMemo(() => import.meta.env.VITE_SERVER_URL || "http://localhost:3001", []);
  const rpcUrl = useMemo(() => import.meta.env.VITE_STELLAR_RPC_URL || "https://soroban-testnet.stellar.org", []);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoadingConfig(true);
    try {
      const response = await fetch(`${serverUrl}/api/config`);
      const data = await response.json();
      setConfig(data);
      setStatus("Backend connected");
    } catch (err) {
      setError(err.message || "Failed to load backend config.");
      setStatus("Backend unavailable");
    } finally {
      setLoadingConfig(false);
    }
  }

  async function handleConnect() {
    setError("");
    try {
      const address = await connectFreighter();
      setWalletAddress(address);
      setStatus("Freighter connected");
    } catch (err) {
      setError(err.message || "Failed to connect Freighter.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!walletAddress) {
      setError("Connect Freighter first.");
      return;
    }

    if (!text.trim()) {
      setError("Paste some text to summarize.");
      return;
    }

    try {
      setSubmitting(true);
      setStatus("Requesting payment");
      const response = await runPaidSummarize({
        serverUrl,
        walletAddress,
        text,
        rpcUrl,
      });
      setResult(response);
      setStatus(response?.paidStatus === 200 ? "Summary settled" : `Request finished with status ${response?.paidStatus || "unknown"}`);
    } catch (err) {
      setError(err.message || "Payment failed.");
      setStatus("Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  const amountDisplay = config?.payment?.amountDisplay || "1";
  const payTo = config?.payment?.payTo || "Waiting for backend";
  const network = config?.network || "stellar:testnet";
  const stats = [
    { value: `${amountDisplay} XLM`, label: "Price per request", note: "Paid summarize route" },
    { value: network.replace("stellar:", "").toUpperCase(), label: "Network", note: "Configured by backend" },
    { value: walletAddress ? "Live" : "Ready", label: "Wallet state", note: walletAddress ? "Freighter connected" : "Connect to pay" },
  ];

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="#top">
          <span className="brand-mark">✦</span>
          <span>Mushee Gate</span>
        </a>
        <nav className="navlinks">
          <a href="#why">Why</a>
          <a href="#flow">Flow</a>
          <a href="#app">App</a>
        </nav>
        <button className="nav-cta" onClick={() => document.getElementById("app")?.scrollIntoView({ behavior: "smooth" })}>
          Open app
        </button>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">Stellar-inspired interface · testnet-first · real wallet flow</p>
            <h1>
              Build the payment layer for agents
              <span> that actually ships on Stellar testnet.</span>
            </h1>
            <p className="hero-text">
              Mushee Gate wraps your paid summarize flow in a cleaner product surface: prelanding story up top, live wallet-powered interaction underneath, and a layout that feels closer to a real protocol launch than a dev sandbox.
            </p>
            <div className="hero-actions">
              <button className="primary-btn" onClick={() => document.getElementById("app")?.scrollIntoView({ behavior: "smooth" })}>
                Launch live flow
              </button>
              <button className="ghost-btn" onClick={() => document.getElementById("flow")?.scrollIntoView({ behavior: "smooth" })}>
                See how it works
              </button>
            </div>
            <div className="hero-mini-stats">
              {stats.map((item) => (
                <div key={item.label} className="mini-stat">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                  <small>{item.note}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-panel">
            <div className="panel-glow" />
            <div className="hero-card orbit-card">
              <div className="badge-row">
                <span className="soft-badge">Live backend</span>
                <span className="soft-badge">{network}</span>
              </div>
              <h3>Payment-ready summarize gateway</h3>
              <p>
                A single route, one clean wallet action, and a testnet flow you can build out into the full product surface later.
              </p>
              <div className="command-list">
                <div>
                  <span>Status</span>
                  <strong>{status}</strong>
                </div>
                <div>
                  <span>Price</span>
                  <strong>{amountDisplay} XLM</strong>
                </div>
                <div>
                  <span>Recipient</span>
                  <strong className="address-preview">{payTo}</strong>
                </div>
              </div>
            </div>
            <div className="hero-card quote-card">
              <p>“Prelanding should feel premium. Landing should still convert. App should still work.”</p>
              <span>That’s the build.</span>
            </div>
          </div>
        </section>

        <section id="why" className="content-section two-column-section">
          <div className="section-heading">
            <p className="section-kicker">Why this page works</p>
            <h2>Clean story first. Live product second.</h2>
            <p>
              The top half explains the product like a real network homepage. The lower half keeps the actual testnet interaction intact so you are not sacrificing functionality for style.
            </p>
          </div>
          <div className="card-grid">
            {trustCards.map((card) => (
              <article key={card.title} className="info-card">
                <span className="card-label">{card.label}</span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="flow" className="content-section flow-section">
          <div className="section-heading narrow">
            <p className="section-kicker">How it works</p>
            <h2>One route. One payment flow. One live result.</h2>
          </div>
          <div className="timeline-grid">
            {steps.map((step, index) => (
              <div className="timeline-card" key={step}>
                <span className="timeline-index">0{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="content-section metrics-section">
          <div className="section-heading narrow">
            <p className="section-kicker">Runtime snapshot</p>
            <h2>Backend-connected by default.</h2>
          </div>
          <div className="metrics-grid">
            {(config ? stats : statFallbacks).map((item) => (
              <div className="metric-card" key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
                <small>{item.note}</small>
              </div>
            ))}
          </div>
        </section>

        <section id="app" className="app-shell">
          <div className="app-header">
            <div>
              <p className="section-kicker">Live app</p>
              <h2>Testnet summarize console</h2>
            </div>
            <div className="app-header-actions">
              <button className="primary-btn" onClick={handleConnect}>
                {walletAddress ? "Freighter connected" : "Connect Freighter"}
              </button>
              <button className="ghost-btn" onClick={loadConfig}>
                {loadingConfig ? "Refreshing..." : "Reload config"}
              </button>
            </div>
          </div>

          <div className="app-grid">
            <aside className="surface sidebar-card">
              <h3>Connection</h3>
              <div className="detail-list">
                <div>
                  <span>Network</span>
                  <strong>{network}</strong>
                </div>
                <div>
                  <span>Asset</span>
                  <strong>{config?.payment?.asset || "XLM"}</strong>
                </div>
                <div>
                  <span>Price</span>
                  <strong>{amountDisplay} XLM</strong>
                </div>
                <div>
                  <span>Pay to</span>
                  <strong className="address-preview">{payTo}</strong>
                </div>
              </div>

              <div className="status-panel">
                <span className={`status-dot ${error ? "error" : "ok"}`} />
                <div>
                  <strong>{status}</strong>
                  <p>{walletAddress ? walletAddress : "No wallet connected yet"}</p>
                </div>
              </div>

              {error ? <div className="message error-message">{error}</div> : null}
              {!error && result?.paymentRequired ? (
                <div className="message note-message">Paywall detected. Freighter should prompt you for the auth flow.</div>
              ) : null}
            </aside>

            <div className="surface console-card">
              <div className="console-head">
                <div>
                  <span className="console-label">Paid route</span>
                  <h3>/api/summarize</h3>
                </div>
                <span className="price-chip">{amountDisplay} XLM</span>
              </div>

              <form className="composer" onSubmit={handleSubmit}>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={11}
                  placeholder="Paste text here"
                />
                <div className="composer-actions">
                  <p>
                    Live backend: <span>{serverUrl}</span>
                  </p>
                  <button className="primary-btn" type="submit" disabled={submitting}>
                    {submitting ? "Processing..." : `Pay ${amountDisplay} XLM and summarize`}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="result-grid">
            <section className="surface result-card">
              <div className="result-head">
                <span className="section-kicker">Result</span>
                <h3>Summary output</h3>
              </div>
              <div className="rich-output">{result?.data?.summary || "No summary yet. Run the paid flow to populate this panel."}</div>
            </section>

            <section className="surface result-card">
              <div className="result-head">
                <span className="section-kicker">Settlement</span>
                <h3>Receipt payload</h3>
              </div>
              <pre className="receipt-box">{JSON.stringify(result?.data?.receipt || result?.settlement || {}, null, 2)}</pre>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
