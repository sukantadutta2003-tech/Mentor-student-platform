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

  if (isLoading || !user) return null;

  const activeSessions = sessions.filter((s) => s.status === "ACTIVE");
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED");

  return (
    <>
      <Navbar />
      <main
        style={{
          paddingTop: "88px",
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "88px 24px 60px",
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
          {/* Create Session (Mentor) */}
          {user.role === "MENTOR" && (
            <div
              className="glass-card"
              style={{ padding: "28px" }}
            >
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
                style={{ opacity: actionLoading ? 0.7 : 1 }}
              >
                {actionLoading ? "Creating..." : "Create New Session"}
              </button>
            </div>
          )}

          {/* Join Session */}
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
                style={{ flex: 1 }}
              />
              <button
                className="btn-primary"
                onClick={handleJoinSession}
                disabled={actionLoading || !joinId.trim()}
                style={{ opacity: actionLoading || !joinId.trim() ? 0.7 : 1 }}
              >
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Sessions History */}
        <div>
          <h2
            style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "20px" }}
          >
            Your Sessions
          </h2>

          {loadingSessions ? (
            <p style={{ color: "var(--text-muted)" }}>Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <div
              className="glass-card"
              style={{
                padding: "40px",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <p style={{ fontSize: "2rem", marginBottom: "12px" }}>📭</p>
              <p>No sessions yet. Create or join one to get started!</p>
            </div>
          ) : (
            <>
              {/* Active Sessions */}
              {activeSessions.length > 0 && (
                <div style={{ marginBottom: "32px" }}>
                  <h3
                    style={{
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "var(--success)",
                      marginBottom: "12px",
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
                  </h3>
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
                        onClick={() => router.push(`/session/${s.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Sessions */}
              {completedSessions.length > 0 && (
                <div>
                  <h3
                    style={{
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      marginBottom: "12px",
                    }}
                  >
                    Completed Sessions
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    {completedSessions.map((s) => (
                      <SessionCard key={s.id} session={s} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

function SessionCard({
  session,
  onClick,
}: {
  session: Session;
  onClick?: () => void;
}) {
  return (
    <div
      className="glass-card"
      onClick={onClick}
      style={{
        padding: "16px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.2s, transform 0.15s",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = "var(--accent)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div>
        <p
          style={{
            fontSize: "0.85rem",
            fontFamily: "monospace",
            color: "var(--text-secondary)",
            marginBottom: "4px",
          }}
        >
          {session.id}
        </p>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          {new Date(session.startTime).toLocaleString()}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: 600,
            background:
              session.status === "ACTIVE"
                ? "rgba(34,197,94,0.15)"
                : "rgba(107,107,138,0.15)",
            color:
              session.status === "ACTIVE"
                ? "var(--success)"
                : "var(--text-muted)",
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
