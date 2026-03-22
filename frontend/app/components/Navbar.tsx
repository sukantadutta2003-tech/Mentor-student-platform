"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isLanding = pathname === "/";

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "rgba(10, 10, 26, 0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
        padding: "0 24px",
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Link
        href="/"
        style={{
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span style={{ fontSize: "1.5rem" }}>🎓</span>
        <span
          style={{
            fontSize: "1.2rem",
            fontWeight: 700,
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          MentorConnect
        </span>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {user ? (
          <>
            <Link
              href="/dashboard"
              style={{
                color:
                  pathname === "/dashboard"
                    ? "var(--accent)"
                    : "var(--text-secondary)",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "0.9rem",
                transition: "color 0.2s",
              }}
            >
              Dashboard
            </Link>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "6px 14px",
                background: "var(--bg-card)",
                borderRadius: "10px",
                border: "1px solid var(--border)",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "var(--success)",
                }}
              />
              <span
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 500,
                  fontSize: "0.85rem",
                }}
              >
                {user.username}
              </span>
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  padding: "2px 8px",
                  background: "var(--bg-secondary)",
                  borderRadius: "6px",
                }}
              >
                {user.role}
              </span>
            </div>
            <button
              onClick={logout}
              style={{
                background: "transparent",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                padding: "8px 16px",
                borderRadius: "10px",
                fontWeight: 500,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--danger)";
                e.currentTarget.style.color = "var(--danger)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            {!isLanding && (
              <Link
                href="/"
                style={{
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                  fontWeight: 500,
                  fontSize: "0.9rem",
                }}
              >
                Home
              </Link>
            )}
            <Link
              href="/login"
              style={{
                color: "var(--text-secondary)",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "0.9rem",
              }}
            >
              Login
            </Link>
            <Link href="/register">
              <button className="btn-primary" style={{ padding: "8px 20px", fontSize: "0.85rem" }}>
                Get Started
              </button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
