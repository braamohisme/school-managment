import React from "react";
import { createRoot } from "react-dom/client";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("App crash:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ fontFamily: "sans-serif", padding: 16 }}>
          <h2>App crashed</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <p>Open browser console for full stack trace.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = createRoot(document.getElementById("root"));

function renderFatal(err) {
  root.render(
    <div style={{ fontFamily: "sans-serif", padding: 16 }}>
      <h2>Startup error</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {String(err?.message || err)}
      </pre>
      <p>Open browser console for full stack trace.</p>
    </div>
  );
}

import("./App.jsx")
  .then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </React.StrictMode>
    );
  })
  .catch((err) => {
    console.error("App module failed to load:", err);
    renderFatal(err);
  });
