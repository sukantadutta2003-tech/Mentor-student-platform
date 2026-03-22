"use client";

import React, { useRef, useEffect } from "react";
import { useWebRTC } from "../hooks/useWebRTC";

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
    <div className="video-call-container">
      <div className="video-grid">
        {/* Remote Video (Main) */}
        <div className="remote-video-wrapper">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="remote-video"
          />
          {!remoteStream && (
            <div className="video-placeholder">
              <span>Waiting for peer...</span>
            </div>
          )}
        </div>

        {/* Local Video (PiP) */}
        <div className="local-video-wrapper">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="local-video"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="video-controls">
        {!isCallActive ? (
          <button onClick={startCall} className="btn-call-start">
            📞 Start Call
          </button>
        ) : (
          <>
            <button
              onClick={toggleMute}
              className={`btn-control ${isMuted ? "btn-active" : ""}`}
            >
              {isMuted ? "🔇 Unmute" : "🎤 Mute"}
            </button>
            <button
              onClick={toggleVideo}
              className={`btn-control ${isVideoOff ? "btn-active" : ""}`}
            >
              {isVideoOff ? "📷 Show Video" : "🎥 Hide Video"}
            </button>
            <button onClick={endCall} className="btn-call-end">
              📴 End Call
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        .video-call-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #1a1a2e;
          border-radius: 12px;
          padding: 12px;
          height: 100%;
        }
        .video-grid {
          position: relative;
          flex: 1;
          min-height: 300px;
          background: #0f0f23;
          border-radius: 8px;
          overflow: hidden;
        }
        .remote-video-wrapper {
          width: 100%;
          height: 100%;
        }
        .remote-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .video-placeholder {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6c6c8a;
          font-size: 1.1rem;
        }
        .local-video-wrapper {
          position: absolute;
          bottom: 12px;
          right: 12px;
          width: 160px;
          height: 120px;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid #6366f1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        .local-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .video-controls {
          display: flex;
          gap: 10px;
          justify-content: center;
          padding: 8px 0;
        }
        .btn-call-start {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 24px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .btn-call-start:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 16px rgba(34, 197, 94, 0.4);
        }
        .btn-control {
          background: #2d2d44;
          color: #e0e0f0;
          border: 1px solid #3d3d5c;
          padding: 10px 18px;
          border-radius: 24px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-control:hover {
          background: #3d3d5c;
        }
        .btn-control.btn-active {
          background: #ef4444;
          border-color: #ef4444;
          color: white;
        }
        .btn-call-end {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 24px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .btn-call-end:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
        }
      `}</style>
    </div>
  );
}
