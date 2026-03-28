"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isLanding = pathname === "/";

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(/[_\s]+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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
        height: "52px",
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
        <span style={{ fontSize: "1.3rem" }}>🎓</span>
        <span
          style={{
            fontSize: "1.1rem",
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
                fontSize: "0.85rem",
                transition: "color 0.2s",
              }}
            >
              Dashboard
            </Link>

            {/* Profile Avatar + Dropdown */}
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "4px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1, #a855f7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                    flexShrink: 0,
                    boxShadow: dropdownOpen
                      ? "0 0 0 2px var(--bg-primary), 0 0 0 4px var(--accent)"
                      : "none",
                    transition: "box-shadow 0.2s",
                  }}
                >
                  {getInitials(user.username)}
                </div>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: "220px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5)",
                    overflow: "hidden",
                    animation: "fadeIn 0.15s ease-out",
                    zIndex: 200,
                  }}
                >
                  {/* User Info */}
                  <div
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <p
                      style={{
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        color: "var(--text-primary)",
                        marginBottom: "2px",
                      }}
                    >
                      {user.username}
                    </p>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {user.email}
                    </p>
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: "6px",
                        padding: "2px 8px",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        background:
                          user.role === "MENTOR"
                            ? "rgba(99,102,241,0.15)"
                            : "rgba(34,197,94,0.15)",
                        color:
                          user.role === "MENTOR"
                            ? "var(--accent)"
                            : "var(--success)",
                        borderRadius: "6px",
                      }}
                    >
                      {user.role}
                    </span>
                  </div>

                  {/* Menu Items */}
                  <div style={{ padding: "6px" }}>
                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        color: "var(--text-secondary)",
                        textDecoration: "none",
                        fontSize: "0.85rem",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--bg-secondary)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      📋 Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: "transparent",
                        border: "none",
                        color: "var(--danger)",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        transition: "background 0.15s",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(239,68,68,0.1)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      🚪 Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                  fontSize: "0.85rem",
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
                fontSize: "0.85rem",
              }}
            >
              Login
            </Link>
            <Link href="/register">
              <button className="btn-primary" style={{ padding: "7px 18px", fontSize: "0.82rem" }}>
                Get Started
              </button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
