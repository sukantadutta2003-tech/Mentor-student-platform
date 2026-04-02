"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import styles from "./VideoCall.module.css";

interface VideoCallProps {
  sessionId: string;
  token: string;
  userId: number;
}

interface MediaDeviceInfo2 {
  deviceId: string;
  label: string;
  kind: string;
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

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo2[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo2[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string>("");
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  const [showMicDropdown, setShowMicDropdown] = useState(false);
  const [showCamDropdown, setShowCamDropdown] = useState(false);

  const micDropdownRef = useRef<HTMLDivElement>(null);
  const camDropdownRef = useRef<HTMLDivElement>(null);

  // Enumerate devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audio = devices
        .filter((d) => d.kind === "audioinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${i + 1}`,
          kind: d.kind,
        }));
      const video = devices
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
          kind: d.kind,
        }));
      setAudioDevices(audio);
      setVideoDevices(video);
      if (audio.length > 0 && !selectedAudio) setSelectedAudio(audio[0].deviceId);
      if (video.length > 0 && !selectedVideo) setSelectedVideo(video[0].deviceId);
    } catch {
      console.error("Could not enumerate devices");
    }
  }, [selectedAudio, selectedVideo]);

  useEffect(() => {
    enumerateDevices();
    // Re-enumerate when devices change (plug/unplug)
    navigator.mediaDevices.addEventListener("devicechange", enumerateDevices);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", enumerateDevices);
    };
  }, [enumerateDevices]);

  // After starting call, re-enumerate to get proper labels
  useEffect(() => {
    if (localStream) enumerateDevices();
  }, [localStream, enumerateDevices]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (micDropdownRef.current && !micDropdownRef.current.contains(e.target as Node)) {
        setShowMicDropdown(false);
      }
      if (camDropdownRef.current && !camDropdownRef.current.contains(e.target as Node)) {
        setShowCamDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
      {warning && <div className={styles.warningMessage}>{warning}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* Controls */}
      <div className={styles.controlBar}>
        {!isCallActive ? (
          <button onClick={startCall} className={styles.btnCallStart}>
            Start Call
          </button>
        ) : (
          <>
            {/* Microphone Button + Dropdown */}
            <div ref={micDropdownRef} className={styles.controlGroup}>
              <button
                onClick={toggleMute}
                className={`${styles.controlBtn} ${styles.controlBtnWithArrow} ${
                  isMuted ? styles.controlBtnOff : ""
                }`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? "🔇" : "🎤"}
              </button>
              <button
                onClick={() => {
                  setShowMicDropdown(!showMicDropdown);
                  setShowCamDropdown(false);
                }}
                className={`${styles.dropdownArrow} ${isMuted ? styles.dropdownArrowOff : ""}`}
                title="Select microphone"
              >
                ▲
              </button>
              {showMicDropdown && (
                <div className={styles.deviceDropdown}>
                  <div className={styles.deviceDropdownTitle}>Microphone</div>
                  {audioDevices.length === 0 ? (
                    <div className={styles.noDevices}>No microphones detected</div>
                  ) : (
                    audioDevices.map((d) => (
                      <button
                        key={d.deviceId}
                        className={styles.deviceOption}
                        onClick={() => {
                          setSelectedAudio(d.deviceId);
                          setShowMicDropdown(false);
                        }}
                      >
                        <span className={styles.deviceOptionCheck}>
                          {selectedAudio === d.deviceId ? "✓" : ""}
                        </span>
                        <span className={styles.deviceOptionLabel}>{d.label}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Camera Button + Dropdown */}
            <div ref={camDropdownRef} className={styles.controlGroup}>
              <button
                onClick={toggleVideo}
                className={`${styles.controlBtn} ${styles.controlBtnWithArrow} ${
                  isVideoOff ? styles.controlBtnOff : ""
                }`}
                title={isVideoOff ? "Show video" : "Hide video"}
              >
                {isVideoOff ? "📷" : "🎥"}
              </button>
              <button
                onClick={() => {
                  setShowCamDropdown(!showCamDropdown);
                  setShowMicDropdown(false);
                }}
                className={`${styles.dropdownArrow} ${isVideoOff ? styles.dropdownArrowOff : ""}`}
                title="Select camera"
              >
                ▲
              </button>
              {showCamDropdown && (
                <div className={styles.deviceDropdown}>
                  <div className={styles.deviceDropdownTitle}>Camera</div>
                  {videoDevices.length === 0 ? (
                    <div className={styles.noDevices}>No cameras detected</div>
                  ) : (
                    videoDevices.map((d) => (
                      <button
                        key={d.deviceId}
                        className={styles.deviceOption}
                        onClick={() => {
                          setSelectedVideo(d.deviceId);
                          setShowCamDropdown(false);
                        }}
                      >
                        <span className={styles.deviceOptionCheck}>
                          {selectedVideo === d.deviceId ? "✓" : ""}
                        </span>
                        <span className={styles.deviceOptionLabel}>{d.label}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* End Call */}
            <button onClick={endCall} className={styles.btnCallEnd} title="End call">
              📴
            </button>
          </>
        )}
      </div>
    </div>
  );
}
