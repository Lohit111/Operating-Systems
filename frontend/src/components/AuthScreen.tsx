import { useState } from "react";
import { authLogin, authRegister } from "../api";

interface Props {
  onAuthSuccess: (uid: string, email: string, lastHead: number) => void;
}

export default function AuthScreen({ onAuthSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (action: "login" | "register") => {
    setError(null);
    setLoading(true);
    try {
      let res;
      if (action === "login") {
        res = await authLogin(email, password);
      } else {
        res = await authRegister(email, password);
      }
      onAuthSuccess(res.uid, email, res.lastHead);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "An error occurred";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0d1117",
        color: "#c9d1d9",
      }}
    >
      <div
        style={{
          background: "#161b22",
          border: "1px solid #30363d",
          borderRadius: 8,
          padding: 32,
          width: 360,
        }}
      >
        <h1 style={{ margin: "0 0 24px", fontSize: 20, color: "#58a6ff" }}>
          📁 File System Simulator
        </h1>
        {error && (
          <div
            style={{
              background: "#3d1a1a",
              border: "1px solid #f85149",
              borderRadius: 4,
              padding: "8px 12px",
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#f85149", fontSize: 14 }}>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                background: "none",
                border: "none",
                color: "#f85149",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              ×
            </button>
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              display: "block",
              marginBottom: 4,
              fontSize: 13,
              color: "#8b949e",
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: "100%",
              padding: "8px 10px",
              background: "#0d1117",
              border: "1px solid #30363d",
              borderRadius: 4,
              color: "#c9d1d9",
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              marginBottom: 4,
              fontSize: 13,
              color: "#8b949e",
            }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: "100%",
              padding: "8px 10px",
              background: "#0d1117",
              border: "1px solid #30363d",
              borderRadius: 4,
              color: "#c9d1d9",
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => handleAuth("login")}
            disabled={loading}
            style={{
              flex: 1,
              padding: "8px 0",
              background: "#238636",
              border: "none",
              borderRadius: 4,
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {loading ? "..." : "Login"}
          </button>
          <button
            onClick={() => handleAuth("register")}
            disabled={loading}
            style={{
              flex: 1,
              padding: "8px 0",
              background: "#1f6feb",
              border: "none",
              borderRadius: 4,
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {loading ? "..." : "Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
