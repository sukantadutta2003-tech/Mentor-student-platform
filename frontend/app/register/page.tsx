"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import styles from "../styles/auth.module.css";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STUDENT");
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
      <main className={styles.authMain}>
        <div className={`glass-card animate-fade-in-up ${styles.authCard}`}>
          <div className={styles.authHeader}>
            <h1 className={styles.authTitle}>Create Account</h1>
            <p className={styles.authSubtitle}>Join as a Mentor or Student</p>
          </div>

          {error && <div className={styles.authError}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.authForm}>
            <div>
              <label className={styles.label}>Username</label>
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
                minLength={6}
              />
            </div>
            <div>
              <label className={styles.label}>I am a...</label>
              <div className={styles.roleRow}>
                {["STUDENT", "MENTOR"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`${styles.roleButton} ${
                      role === r ? styles.roleButtonActive : ""
                    }`}
                  >
                    {r === "STUDENT" ? "🎓 Student" : "👨‍🏫 Mentor"}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className={`btn-primary ${styles.submitBtn}`}
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className={styles.authFooter}>
            Already have an account?{" "}
            <Link href="/login" className={styles.authLink}>
              Sign In
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
