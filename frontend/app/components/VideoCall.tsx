"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import styles from "./VideoCall.module.css";

interface VideoCallProps {
  sessionId: string;
  token: string;
  userId: number;
  onLeave?: () => void;
}

interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: string;
}

export default function VideoCall({ sessionId, token, userId, onLeave }: VideoCallProps) {
  const {
    localStream,
    remoteStream,
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

  const [audioDevices, setAudioDevices] = useState<DeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<DeviceInfo[]>([]);
  const [selectedAudio, setSelectedAudio] = useState("");
  const [selectedVideo, setSelectedVideo] = useState("");
  const [showMicDropdown, setShowMicDropdown] = useState(false);
  const [showCamDropdown, setShowCamDropdown] = useState(false);

  const micRef = useRef<HTMLDivElement>(null);
  const camRef = useRef<HTMLDivElement>(null);
  const hasAutoStarted = useRef(false);

  // Auto-start call on mount
  useEffect(() => {
    if (!hasAutoStarted.current) {
      hasAutoStarted.current = true;
      startCall();
    }
  }, [startCall]);

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audio = devices
        .filter((d) => d.kind === "audioinput")
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}`, kind: d.kind }));
      const video = devices
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}`, kind: d.kind }));
      setAudioDevices(audio);
      setVideoDevices(video);
      if (audio.length > 0 && !selectedAudio) setSelectedAudio(audio[0].deviceId);
      if (video.length > 0 && !selectedVideo) setSelectedVideo(video[0].deviceId);
    } catch { /* ignore */ }
  }, [selectedAudio, selectedVideo]);

  useEffect(() => {
    enumerateDevices();
    navigator.mediaDevices.addEventListener("devicechange", enumerateDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", enumerateDevices);
  }, [enumerateDevices]);

  useEffect(() => { if (localStream) enumerateDevices(); }, [localStream, enumerateDevices]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (micRef.current && !micRef.current.contains(e.target as Node)) setShowMicDropdown(false);
      if (camRef.current && !camRef.current.contains(e.target as Node)) setShowCamDropdown(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  // SVG Icons
  const MicOn = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
    </svg>
  );

  const MicOff = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
    </svg>
  );

  const CamOn = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
    </svg>
  );

  const CamOff = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
    </svg>
  );

  const EndCallIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
    </svg>
  );

  const ChevronUp = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
    </svg>
  );

  return (
    <div className={styles.container}>
      <div className={styles.videoGrid}>
        <div className={styles.remoteWrapper}>
          <video ref={remoteVideoRef} autoPlay playsInline className={styles.remoteVideo} />
          {!remoteStream && (
            <div className={styles.placeholder}><span>Waiting for peer...</span></div>
          )}
        </div>
        <div className={styles.localWrapper}>
          <video ref={localVideoRef} autoPlay playsInline muted className={styles.localVideo} />
        </div>
      </div>

      {warning && <div className={styles.warningMessage}>{warning}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.controlBar}>
        {/* Mic button + dropdown */}
        <div ref={micRef} className={styles.controlGroup}>
          <button
            onClick={toggleMute}
            className={`${styles.controlBtn} ${isMuted ? styles.controlBtnOff : ""} ${styles.controlBtnWithArrow}`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff /> : <MicOn />}
          </button>
          <button
            onClick={() => { setShowMicDropdown(!showMicDropdown); setShowCamDropdown(false); }}
            className={`${styles.dropdownArrow} ${isMuted ? styles.dropdownArrowOff : ""}`}
          >
            <ChevronUp />
          </button>
          {showMicDropdown && (
            <div className={styles.deviceDropdown}>
              <div className={styles.deviceDropdownTitle}>Microphone</div>
              {audioDevices.length === 0 ? (
                <div className={styles.noDevices}>No microphones detected</div>
              ) : audioDevices.map((d) => (
                <button key={d.deviceId} className={styles.deviceOption}
                  onClick={() => { setSelectedAudio(d.deviceId); setShowMicDropdown(false); }}>
                  <span className={styles.deviceOptionCheck}>{selectedAudio === d.deviceId ? "✓" : ""}</span>
                  <span className={styles.deviceOptionLabel}>{d.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Camera button + dropdown */}
        <div ref={camRef} className={styles.controlGroup}>
          <button
            onClick={toggleVideo}
            className={`${styles.controlBtn} ${isVideoOff ? styles.controlBtnOff : ""} ${styles.controlBtnWithArrow}`}
            title={isVideoOff ? "Show video" : "Hide video"}
          >
            {isVideoOff ? <CamOff /> : <CamOn />}
          </button>
          <button
            onClick={() => { setShowCamDropdown(!showCamDropdown); setShowMicDropdown(false); }}
            className={`${styles.dropdownArrow} ${isVideoOff ? styles.dropdownArrowOff : ""}`}
          >
            <ChevronUp />
          </button>
          {showCamDropdown && (
            <div className={styles.deviceDropdown}>
              <div className={styles.deviceDropdownTitle}>Camera</div>
              {videoDevices.length === 0 ? (
                <div className={styles.noDevices}>No cameras detected</div>
              ) : videoDevices.map((d) => (
                <button key={d.deviceId} className={styles.deviceOption}
                  onClick={() => { setSelectedVideo(d.deviceId); setShowCamDropdown(false); }}>
                  <span className={styles.deviceOptionCheck}>{selectedVideo === d.deviceId ? "✓" : ""}</span>
                  <span className={styles.deviceOptionLabel}>{d.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* End Call */}
        <button onClick={() => { endCall(); if(onLeave) onLeave(); }} className={styles.btnCallEnd} title="End call">
          <EndCallIcon />
        </button>
      </div>
    </div>
  );
}
