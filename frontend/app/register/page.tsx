"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { loginUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await register({ username, email, password, role });
      loginUser(res.data);
      router.push("/dashboard");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(
        axiosErr.response?.data?.message || "Registration failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main
        style={{
          paddingTop: "64px",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px",
        }}
      >
        <div
          className="glass-card animate-fade-in-up"
          style={{ width: "100%", maxWidth: "440px", padding: "40px" }}
        >
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <h1
              style={{
                fontSize: "1.8rem",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Create Account
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Join as a Mentor or Student
            </p>
          </div>

          {error && (
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "10px",
                color: "var(--danger)",
                fontSize: "0.9rem",
                marginBottom: "20px",
              }}
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                Username
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                Email
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                Password
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                I am a...
              </label>
              <div style={{ display: "flex", gap: "12px" }}>
                {["STUDENT", "MENTOR"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "12px",
                      border:
                        role === r
                          ? "2px solid var(--accent)"
                          : "1px solid var(--border)",
                      background:
                        role === r
                          ? "rgba(99,102,241,0.1)"
                          : "var(--bg-secondary)",
                      color:
                        role === r
                          ? "var(--accent)"
                          : "var(--text-secondary)",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {r === "STUDENT" ? "🎓 Student" : "👨‍🏫 Mentor"}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                width: "100%",
                justifyContent: "center",
                marginTop: "8px",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p
            style={{
              textAlign: "center",
              marginTop: "24px",
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
            }}
          >
            Already have an account?{" "}
            <Link
              href="/login"
              style={{
                color: "var(--accent)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Sign In
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
