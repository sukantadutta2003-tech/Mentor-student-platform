"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import styles from "../styles/auth.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, loginUser } = useAuth();

  useEffect(() => {
    if (user) router.push("/dashboard");
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login({ email, password });
      loginUser(res.data);
      router.push("/dashboard");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className={styles.authMain}>
        <div className={`glass-card animate-fade-in-up ${styles.authCard}`}>
          <div className={styles.authHeader}>
            <h1 className={styles.authTitle}>Welcome Back</h1>
            <p className={styles.authSubtitle}>Sign in to your account</p>
          </div>

          {error && <div className={styles.authError}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.authForm}>
            <div>
              <label className={styles.label}>Email</label>
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
              <label className={styles.label}>Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className={`btn-primary ${styles.submitBtn}`}
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className={styles.authFooter}>
            Don&apos;t have an account?{" "}
            <Link href="/register" className={styles.authLink}>
              Sign Up
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
