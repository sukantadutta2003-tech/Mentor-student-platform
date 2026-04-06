"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { getSession, getSessionMessages, leaveSession } from "../../lib/api";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import dynamic from "next/dynamic";
import VideoCall from "../../components/VideoCall";
import styles from "./page.module.css";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

interface ChatMessage {
  sessionId: string;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: string;
}

interface SessionData {
  id: string;
  mentorId: number;
  studentId: number | null;
  status: "ACTIVE" | "COMPLETED";
  startTime: string;
  endTime: string | null;
  mentorUsername?: string;
  studentUsername?: string;
}

export default function SessionRoomPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { user, isLoading } = useAuth();

  const [session, setSession] = useState<SessionData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [code, setCode] = useState("// Start coding here...\n");
  const [language, setLanguage] = useState("javascript");
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "video" | "participants">("chat");

  const stompClient = useRef<Client | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  // Fetch session data initially and poll every 5 seconds for real-time updates
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [sessionRes, messagesRes] = await Promise.all([
          getSession(sessionId),
          getSessionMessages(sessionId),
        ]);
        setSession(sessionRes.data);
        setMessages(messagesRes.data);
      } catch {
        router.push("/dashboard");
      }
    };
    fetchData();

    // Poll session data so participants/status updates appear in real-time
    const interval = setInterval(async () => {
      try {
        const res = await getSession(sessionId);
        setSession(res.data);
      } catch { /* ignore */ }
    }, 5000);

    return () => clearInterval(interval);
  }, [sessionId, user, router]);

  useEffect(() => {
    if (!user) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080/ws"),
      connectHeaders: {
        Authorization: `Bearer ${user.token}`,
      },
      onConnect: () => {
        setConnected(true);

        client.subscribe(`/topic/session/${sessionId}`, (message) => {
          const chatMsg: ChatMessage = JSON.parse(message.body);
          setMessages((prev) => [...prev, chatMsg]);
        });

        client.subscribe(
          `/topic/session/${sessionId}/code`,
          (message) => {
            const codeUpdate = JSON.parse(message.body);
            if (codeUpdate.senderId !== user.id) {
              isRemoteUpdate.current = true;
              setCode(codeUpdate.content);
              if (codeUpdate.language) setLanguage(codeUpdate.language);
            }
          }
        );
      },
      onStompError: (frame) => {
        console.error("STOMP error:", frame);
      },
    });

    client.activate();
    stompClient.current = client;

    return () => {
      client.deactivate();
    };
  }, [sessionId, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendChatMessage = () => {
    if (!chatInput.trim() || !stompClient.current?.connected || !user) return;
    stompClient.current.publish({
      destination: `/app/chat/${sessionId}`,
      body: JSON.stringify({
        sessionId,
        senderId: user.id,
        senderName: user.username,
        content: chatInput.trim(),
      }),
    });
    setChatInput("");
  };

  const handleCodeChange = (value: string | undefined) => {
    if (!value || isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    setCode(value);
    if (stompClient.current?.connected && user) {
      stompClient.current.publish({
        destination: `/app/code/${sessionId}`,
        body: JSON.stringify({
          sessionId,
          senderId: user.id,
          content: value,
          language,
        }),
      });
    }
  };


  const navigateDashboard = () => {
    leaveSession(sessionId).catch(() => {});
    router.push("/dashboard");
  };

  if (isLoading || !user || !session) return null;

  return (
    <div className={styles.container}>
      {/* Header Bar */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            onClick={() => router.push("/dashboard")}
            className={styles.backButton}
          >
            ←
          </button>
          <span className={styles.headerLogo}>MentorConnect</span>

        </div>
        <div className={styles.headerRight}>
          <span className={styles.sessionIdBadge}>
            ID: {sessionId.substring(0, 8)}...
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(sessionId)}
            className={styles.copyIdButton}
          >
            Copy ID
          </button>
        </div>
      </header>

      {/* Main Area */}
      <div className={styles.mainArea}>
        {/* Code Editor Panel */}
        <div className={styles.editorPanel}>
          <div className={styles.languageBar}>
            <span className={styles.languageLabel}>Language:</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={styles.languageSelect}
            >
              {[
                "javascript",
                "typescript",
                "python",
                "java",
                "cpp",
                "c",
                "html",
                "css",
                "json",
              ].map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <div className={styles.connectionStatus}>
              <span
                className={`${styles.connectionDot} ${
                  connected ? styles.connectionDotConnected : styles.connectionDotDisconnected
                }`}
              />
              <span className={styles.connectionLabel}>
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
          <div className={styles.editorContainer}>
            <MonacoEditor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                automaticLayout: true,
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            />
          </div>
        </div>

        {/* Right Sidebar: Chat / Video */}
        <div className={styles.sidebar}>
          <div className={styles.tabSwitch}>
            {(["chat", "video", "participants"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ""}`}
              >
                {tab === "chat" ? "Chat" : tab === "video" ? "Video" : "Participants"}
              </button>
            ))}
          </div>

          {/* Chat Panel — always mounted */}
          <div className={styles.chatPanel} style={{ display: activeTab === "chat" ? "flex" : "none" }}>
            <div className={styles.chatMessages}>
              {messages.length === 0 && (
                <p className={styles.chatEmpty}>
                  No messages yet. Say hello!
                </p>
              )}
              {messages.map((msg, i) => {
                const isOwn = msg.senderId === user.id;
                return (
                  <div key={i} className={isOwn ? styles.msgOwn : styles.msgOther}>
                    {!isOwn && (
                      <span className={styles.msgSender}>{msg.senderName}</span>
                    )}
                    <div className={isOwn ? styles.msgBubbleOwn : styles.msgBubbleOther}>
                      {msg.content}
                    </div>
                    <span className={`${styles.msgTime} ${isOwn ? styles.msgTimeOwn : styles.msgTimeOther}`}>
                      {msg.timestamp
                        ? new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <div className={styles.chatInputBar}>
              <input
                className={`input-field ${styles.chatInput}`}
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
              />
              <button
                className={`btn-primary ${styles.chatSendBtn}`}
                onClick={sendChatMessage}
              >
                Send
              </button>
            </div>
          </div>

          {/* Video Panel — always mounted so WebRTC/camera stays alive */}
          <div className={styles.videoPanel} style={{ display: activeTab === "video" ? "flex" : "none" }}>
            <VideoCall
              sessionId={sessionId}
              token={user.token}
              userId={user.id}
              onLeave={navigateDashboard}
            />
          </div>

          {/* Participants Panel — always mounted */}
          <div className={styles.participantsPanel} style={{ display: activeTab === "participants" ? "flex" : "none" }}>
            <h4 className={styles.membersTitle}>Participants ({session.studentUsername ? 2 : 1})</h4>
            <div className={styles.memberList}>
              <div className={styles.memberItem}>
                <span className={styles.memberName}>{session.mentorUsername}</span>
                <span className={styles.memberRole}>Mentor</span>
              </div>
              {session.studentUsername ? (
                <div className={styles.memberItem}>
                  <span className={styles.memberName}>{session.studentUsername}</span>
                  <span className={styles.memberRole}>Student</span>
                </div>
              ) : (
                <div className={styles.memberItemWaiting}>Waiting for student...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
