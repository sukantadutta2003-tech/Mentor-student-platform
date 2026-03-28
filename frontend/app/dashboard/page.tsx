"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { createSession, getMySessions, joinSession, clearHistory } from "../lib/api";
import Navbar from "../components/Navbar";
import styles from "./page.module.css";

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

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear all completed sessions?")) return;
    try {
      await clearHistory();
      setSessions((prev) => prev.filter((s) => s.status === "ACTIVE"));
    } catch {
      setError("Failed to clear history");
    }
  };

  if (isLoading || !user) return null;

  const activeSessions = sessions.filter((s) => s.status === "ACTIVE");
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED");

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        {/* Welcome Header */}
        <div className={`${styles.welcome} animate-fade-in-up`}>
          <h1 className={styles.welcomeTitle}>
            Welcome, <span className="gradient-text">{user.username}</span>
          </h1>
          <p className={styles.welcomeSubtitle}>
            {user.role === "MENTOR"
              ? "Create a session and share the ID with your student."
              : "Join a session using the ID given by your mentor."}
          </p>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        {/* Action Cards */}
        <div className={styles.actionGrid}>
          {user.role === "MENTOR" && (
            <div className={`glass-card ${styles.actionCard}`}>
              <h3 className={styles.actionCardTitle}>Create Session</h3>
              <p className={styles.actionCardDesc}>
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

          <div className={`glass-card ${styles.actionCard}`}>
            <h3 className={styles.actionCardTitle}>Join Session</h3>
            <p className={`${styles.actionCardDesc} ${styles.actionCardDescSmall}`}>
              Enter the Session ID provided by your{" "}
              {user.role === "STUDENT" ? "mentor" : "peer"}.
            </p>
            <div className={styles.joinRow}>
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
          <div className={styles.tabHeader}>
            <button
              onClick={() => setActiveTab("active")}
              className={`${styles.tabButton} ${activeTab === "active" ? styles.tabButtonActive : ""}`}
            >
              {activeSessions.length > 0 && <span className={styles.activeDot} />}
              Active Sessions
              {activeSessions.length > 0 && (
                <span className={styles.countBadgeGreen}>{activeSessions.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`${styles.tabButton} ${activeTab === "history" ? styles.tabButtonActive : ""}`}
            >
              History
              {completedSessions.length > 0 && (
                <span className={styles.countBadgeMuted}>{completedSessions.length}</span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          {loadingSessions ? (
            <div className={styles.skeletonList}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={`skeleton ${styles.skeletonItem}`} />
              ))}
            </div>
          ) : activeTab === "active" ? (
            activeSessions.length === 0 ? (
              <div className={`glass-card ${styles.emptyState}`}>
                <p className={styles.emptyTitle}>No active sessions</p>
                <p className={styles.emptyDesc}>
                  {user.role === "MENTOR"
                    ? "Create a new session to get started!"
                    : "Ask your mentor for a session ID."}
                </p>
              </div>
            ) : (
              <div className={styles.sessionList}>
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
            <div className={`glass-card ${styles.emptyState}`}>
              <p className={styles.emptyTitle}>No completed sessions yet</p>
              <p className={styles.emptyDesc}>Completed sessions will appear here.</p>
            </div>
          ) : (
            <div className={styles.sessionList}>
              {completedSessions.map((s) => (
                <SessionCard key={s.id} session={s} copiedId={copiedId} onCopy={copySessionId} />
              ))}
              <div className={styles.clearRow}>
                <button onClick={handleClearHistory} className={styles.clearButton}>
                  Clear
                </button>
              </div>
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
  return (
    <div
      className={`glass-card ${styles.sessionCard} ${onClick ? styles.sessionCardClickable : ""}`}
      onClick={onClick}
    >
      <div className={styles.sessionCardBody}>
        <div className={styles.sessionIdRow}>
          <p className={styles.sessionId}>{session.id}</p>
          {session.status === "ACTIVE" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy(session.id);
              }}
              className={`${styles.copyButton} ${
                copiedId === session.id ? styles.copyCopied : styles.copyDefault
              }`}
              title="Copy Session ID"
            >
              {copiedId === session.id ? "✓" : "Copy"}
            </button>
          )}
        </div>
        <div className={styles.sessionMeta}>
          <span>Started: {new Date(session.startTime).toLocaleString()}</span>
          {session.endTime && (
            <span>Ended: {new Date(session.endTime).toLocaleString()}</span>
          )}
        </div>
      </div>
      {onClick && <span className={styles.sessionArrow}>→</span>}
    </div>
  );
}
