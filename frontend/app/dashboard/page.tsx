"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { createSession, getMySessions, joinSession } from "../lib/api";
import Navbar from "../components/Navbar";

interface Session {
  id: string;
  mentorId: number;
  studentId: number | null;
  status: "ACTIVE" | "COMPLETED";
  startTime: string;
  endTime: string | null;
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [joinId, setJoinId] = useState("");
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) fetchSessions();
  }, [user]);

  const fetchSessions = async () => {
    try {
      const res = await getMySessions();
      setSessions(res.data);
    } catch {
      console.error("Failed to fetch sessions");
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleCreateSession = async () => {
    setActionLoading(true);
    setError("");
    try {
      const res = await createSession();
      router.push(`/session/${res.data.id}`);
    } catch {
      setError("Failed to create session");
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinSession = async () => {
    if (!joinId.trim()) return;
    setActionLoading(true);
    setError("");
    try {
      await joinSession(joinId.trim());
      router.push(`/session/${joinId.trim()}`);
    } catch {
      setError("Session not found or already full");
    } finally {
      setActionLoading(false);
    }
  };

  const copySessionId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading || !user) return null;

  const activeSessions = sessions.filter((s) => s.status === "ACTIVE");
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED");

  return (
    <>
      <Navbar />
      <main
        style={{
          paddingTop: "76px",
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "76px 24px 60px",
        }}
      >
        {/* Welcome Header */}
        <div className="animate-fade-in-up" style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "8px" }}>
            Welcome, <span className="gradient-text">{user.username}</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
            {user.role === "MENTOR"
              ? "Create a session and share the ID with your student."
              : "Join a session using the ID given by your mentor."}
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
              marginBottom: "24px",
              animation: "fadeIn 0.3s ease-out",
            }}
          >
            {error}
          </div>
        )}

        {/* Action Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
            marginBottom: "48px",
          }}
        >
          {user.role === "MENTOR" && (
            <div className="glass-card" style={{ padding: "28px" }}>
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  marginBottom: "12px",
                }}
              >
                🎯 Create Session
              </h3>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.9rem",
                  marginBottom: "20px",
                  lineHeight: 1.5,
                }}
              >
                Start a new mentoring session. Share the generated Session ID
                with your student.
              </p>
              <button
                className="btn-primary"
                onClick={handleCreateSession}
                disabled={actionLoading}
              >
                {actionLoading ? "Creating..." : "Create New Session"}
              </button>
            </div>
          )}

          <div className="glass-card" style={{ padding: "28px" }}>
            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              🔗 Join Session
            </h3>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.9rem",
                marginBottom: "16px",
                lineHeight: 1.5,
              }}
            >
              Enter the Session ID provided by your{" "}
              {user.role === "STUDENT" ? "mentor" : "peer"}.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                className="input-field"
                placeholder="Paste Session ID"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinSession()}
                style={{ flex: 1 }}
              />
              <button
                className="btn-primary"
                onClick={handleJoinSession}
                disabled={actionLoading || !joinId.trim()}
              >
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Sessions Section with Tabs */}
        <div>
          {/* Tab Header */}
          <div
            style={{
              display: "flex",
              gap: "0",
              marginBottom: "20px",
              borderBottom: "2px solid var(--border)",
            }}
          >
            <button
              onClick={() => setActiveTab("active")}
              style={{
                padding: "12px 24px",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === "active"
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                color:
                  activeTab === "active"
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "0.95rem",
                cursor: "pointer",
                transition: "all 0.2s",
                marginBottom: "-2px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "var(--success)",
                  display: "inline-block",
                }}
              />
              Active Sessions
              {activeSessions.length > 0 && (
                <span
                  style={{
                    padding: "2px 8px",
                    background: "rgba(34,197,94,0.15)",
                    color: "var(--success)",
                    borderRadius: "10px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  {activeSessions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              style={{
                padding: "12px 24px",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === "history"
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                color:
                  activeTab === "history"
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "0.95rem",
                cursor: "pointer",
                transition: "all 0.2s",
                marginBottom: "-2px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              📁 History
              {completedSessions.length > 0 && (
                <span
                  style={{
                    padding: "2px 8px",
                    background: "rgba(107,107,138,0.15)",
                    color: "var(--text-muted)",
                    borderRadius: "10px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  {completedSessions.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          {loadingSessions ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ height: "72px", borderRadius: "12px" }}
                />
              ))}
            </div>
          ) : activeTab === "active" ? (
            activeSessions.length === 0 ? (
              <div
                className="glass-card"
                style={{
                  padding: "48px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                <p style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🟢</p>
                <p style={{ fontSize: "1.05rem", marginBottom: "6px" }}>
                  No active sessions
                </p>
                <p style={{ fontSize: "0.85rem" }}>
                  {user.role === "MENTOR"
                    ? "Create a new session to get started!"
                    : "Ask your mentor for a session ID."}
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {activeSessions.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    copiedId={copiedId}
                    onCopy={copySessionId}
                    onClick={() => router.push(`/session/${s.id}`)}
                  />
                ))}
              </div>
            )
          ) : completedSessions.length === 0 ? (
            <div
              className="glass-card"
              style={{
                padding: "48px",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <p style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📭</p>
              <p style={{ fontSize: "1.05rem", marginBottom: "6px" }}>
                No completed sessions yet
              </p>
              <p style={{ fontSize: "0.85rem" }}>
                Completed sessions will appear here.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {completedSessions.map((s) => (
                <SessionCard key={s.id} session={s} copiedId={copiedId} onCopy={copySessionId} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function SessionCard({
  session,
  onClick,
  copiedId,
  onCopy,
}: {
  session: Session;
  onClick?: () => void;
  copiedId: string | null;
  onCopy: (id: string) => void;
}) {
  const isActive = session.status === "ACTIVE";

  return (
    <div
      className="glass-card"
      style={{
        padding: "18px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
          <p
            style={{
              fontSize: "0.85rem",
              fontFamily: "monospace",
              color: "var(--text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {session.id}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopy(session.id);
            }}
            style={{
              background: "transparent",
              border: "none",
              color: copiedId === session.id ? "var(--success)" : "var(--text-muted)",
              cursor: "pointer",
              fontSize: "0.8rem",
              padding: "2px 6px",
              borderRadius: "4px",
              flexShrink: 0,
            }}
            title="Copy Session ID"
          >
            {copiedId === session.id ? "✓ Copied" : "📋"}
          </button>
        </div>
        <div style={{ display: "flex", gap: "12px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
          <span>Started: {new Date(session.startTime).toLocaleString()}</span>
          {session.endTime && (
            <span>Ended: {new Date(session.endTime).toLocaleString()}</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: 600,
            background: isActive
              ? "rgba(34,197,94,0.15)"
              : "rgba(107,107,138,0.15)",
            color: isActive ? "var(--success)" : "var(--text-muted)",
          }}
        >
          {session.status}
        </span>
        {onClick && (
          <span style={{ color: "var(--accent)", fontSize: "1.2rem" }}>→</span>
        )}
      </div>
    </div>
  );
}
