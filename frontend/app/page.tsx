"use client";

import Link from "next/link";
import Navbar from "./components/Navbar";
import { useAuth } from "./context/AuthContext";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: "64px" }}>
        {/* Hero Section */}
        <section
          style={{
            minHeight: "calc(100vh - 64px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "60px 24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background glow effects */}
          <div
            style={{
              position: "absolute",
              width: "600px",
              height: "600px",
              background:
                "radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)",
              top: "-100px",
              right: "-100px",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "400px",
              height: "400px",
              background:
                "radial-gradient(circle, rgba(168,85,247,0.1), transparent 70%)",
              bottom: "-50px",
              left: "-50px",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />

          <div
            className="animate-fade-in-up"
            style={{ maxWidth: "800px", position: "relative", zIndex: 1 }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "6px 16px",
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.3)",
                borderRadius: "20px",
                color: "var(--accent)",
                fontSize: "0.85rem",
                fontWeight: 500,
                marginBottom: "24px",
              }}
            >
              ✨ Real-Time Mentorship Platform
            </div>

            <h1
              style={{
                fontSize: "clamp(2.5rem, 6vw, 4rem)",
                fontWeight: 800,
                lineHeight: 1.1,
                marginBottom: "24px",
              }}
            >
              Learn Code with
              <br />
              <span className="gradient-text">Expert Mentors</span>
            </h1>

            <p
              style={{
                fontSize: "1.15rem",
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                maxWidth: "600px",
                margin: "0 auto 40px",
              }}
            >
              Connect with experienced developers through live video calls,
              collaborate on code in real-time, and accelerate your learning
              journey.
            </p>

            <div
              style={{
                display: "flex",
                gap: "16px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {user ? (
                <Link href="/dashboard">
                  <button className="btn-primary" style={{ fontSize: "1rem", padding: "14px 32px" }}>
                    📋 Go to Dashboard
                  </button>
                </Link>
              ) : (
                <>
                  <Link href="/register">
                    <button className="btn-primary" style={{ fontSize: "1rem", padding: "14px 32px" }}>
                      🚀 Start Learning
                    </button>
                  </Link>
                  <Link href="/login">
                    <button className="btn-outline" style={{ fontSize: "1rem", padding: "14px 32px" }}>
                      Sign In →
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          style={{
            padding: "80px 24px",
            maxWidth: "1100px",
            margin: "0 auto",
          }}
        >
          <h2
            style={{
              textAlign: "center",
              fontSize: "2rem",
              fontWeight: 700,
              marginBottom: "48px",
            }}
          >
            Everything You Need to{" "}
            <span className="gradient-text">Grow</span>
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px",
            }}
          >
            {[
              {
                icon: "🎥",
                title: "Live Video Calls",
                desc: "Face-to-face mentoring sessions with crystal-clear video and audio powered by WebRTC.",
              },
              {
                icon: "💻",
                title: "Collaborative Code Editor",
                desc: "Write and review code together in real-time with a feature-rich Monaco editor.",
              },
              {
                icon: "💬",
                title: "Instant Messaging",
                desc: "Chat with your mentor during sessions. All messages are saved for future reference.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="glass-card"
                style={{
                  padding: "32px",
                  transition: "transform 0.2s, border-color 0.2s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.borderColor = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>
                  {feature.icon}
                </div>
                <h3
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 600,
                    marginBottom: "10px",
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    fontSize: "0.95rem",
                  }}
                >
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
