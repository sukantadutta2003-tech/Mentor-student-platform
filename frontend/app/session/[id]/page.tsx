"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { getSession, getSessionMessages, endSession } from "../../lib/api";
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
  const [activeTab, setActiveTab] = useState<"chat" | "video">("chat");

  const stompClient = useRef<Client | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

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
  }, [sessionId, user, router]);

  useEffect(() => {
    if (!user) return;

    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
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

  const handleEndSession = async () => {
    try {
      await endSession(sessionId);
      router.push("/dashboard");
    } catch {
      console.error("Failed to end session");
    }
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
          <span
            className={`${styles.statusBadge} ${
              session.status === "ACTIVE" ? styles.statusActive : styles.statusCompleted
            }`}
          >
            {session.status}
          </span>
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
          {session.status === "ACTIVE" && (
            user.role === "MENTOR" ? (
              <button onClick={handleEndSession} className={styles.endSessionButton}>
                End Session
              </button>
            ) : (
              <button
                onClick={() => router.push("/dashboard")}
                className={styles.leaveSessionButton}
              >
                Leave Session
              </button>
            )
          )}
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
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            />
          </div>
        </div>

        {/* Right Sidebar: Chat / Video */}
        <div className={styles.sidebar}>
          <div className={styles.tabSwitch}>
            {(["chat", "video"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ""}`}
              >
                {tab === "chat" ? "💬 Chat" : "🎥 Video"}
              </button>
            ))}
          </div>

          {/* Chat Panel */}
          {activeTab === "chat" && (
            <div className={styles.chatPanel}>
              <div className={styles.chatMessages}>
                {messages.length === 0 && (
                  <p className={styles.chatEmpty}>
                    No messages yet. Say hello! 👋
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
          )}

          {/* Video Panel */}
          {activeTab === "video" && (
            <div className={styles.videoPanel}>
              <VideoCall
                sessionId={sessionId}
                token={user.token}
                userId={user.id}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
