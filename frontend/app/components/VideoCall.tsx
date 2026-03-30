"use client";

import React, { useRef, useEffect } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import styles from "./VideoCall.module.css";

interface VideoCallProps {
  sessionId: string;
  token: string;
  userId: number;
}

export default function VideoCall({ sessionId, token, userId }: VideoCallProps) {
  const {
    localStream,
    remoteStream,
    isCallActive,
    isMuted,
    isVideoOff,
    error,
    warning,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useWebRTC({ sessionId, token, userId });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className={styles.container}>
      <div className={styles.videoGrid}>
        {/* Remote Video (Main) */}
        <div className={styles.remoteWrapper}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={styles.remoteVideo}
          />
          {!remoteStream && (
            <div className={styles.placeholder}>
              <span>Waiting for peer...</span>
            </div>
          )}
        </div>

        {/* Local Video (PiP) */}
        <div className={styles.localWrapper}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={styles.localVideo}
          />
        </div>
      </div>

      {/* Warning / Error Messages */}
      {warning && (
        <div className={styles.warningMessage}>{warning}</div>
      )}
      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      {/* Controls */}
      <div className={styles.controls}>
        {!isCallActive ? (
          <button onClick={startCall} className={styles.btnCallStart}>
            📞 Start Call
          </button>
        ) : (
          <>
            <button
              onClick={toggleMute}
              className={`${styles.btnControl} ${isMuted ? styles.btnControlActive : ""}`}
            >
              {isMuted ? "🔇 Unmute" : "🎤 Mute"}
            </button>
            <button
              onClick={toggleVideo}
              className={`${styles.btnControl} ${isVideoOff ? styles.btnControlActive : ""}`}
            >
              {isVideoOff ? "📷 Show Video" : "🎥 Hide Video"}
            </button>
            <button onClick={endCall} className={styles.btnCallEnd}>
              📴 End Call
            </button>
          </>
        )}
      </div>
    </div>
  );
}
