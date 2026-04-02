"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

interface UseWebRTCOptions {
  sessionId: string;
  token: string;
  userId: number;
}

export function useWebRTC({ sessionId, token, userId }: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const stompClient = useRef<Client | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());

  const ICE_SERVERS = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  const sendSignal = useCallback(
    (type: string, payload: unknown) => {
      if (stompClient.current?.connected) {
        stompClient.current.publish({
          destination: `/app/signal/${sessionId}`,
          body: JSON.stringify({
            sessionId,
            senderId: userId,
            type,
            payload,
          }),
        });
      }
    },
    [sessionId, userId]
  );

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("ice-candidate", event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStreamRef.current.addTrack(track);
      });
      setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
        endCall();
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [sendSignal]);

  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    // Try video + audio first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      return stream;
    } catch {
      // Video failed — try audio only
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
      setWarning("No camera detected — joined with audio only.");
      setIsVideoOff(true);
      return stream;
    } catch {
      // Audio also failed — try video only
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      setWarning("No microphone detected — joined with video only.");
      setIsMuted(true);
      return stream;
    } catch {
      // Both failed
      throw new DOMException("No media devices found", "NotFoundError");
    }
  }, []);

  const startCall = useCallback(async () => {
    setError(null);
    setWarning(null);
    try {
      const stream = await getMediaStream();
      setLocalStream(stream);

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal("offer", offer);

      setIsCallActive(true);
    } catch (err) {
      console.error("Failed to start call:", err);
      if (err instanceof DOMException) {
        if (err.name === "NotFoundError") {
          setError("No camera or microphone found. Please connect a device and try again.");
        } else if (err.name === "NotAllowedError") {
          setError("Camera/microphone access denied. Please allow permissions in your browser settings.");
        } else {
          setError(`Could not access media devices: ${err.message}`);
        }
      } else {
        setError("Failed to start call. Please try again.");
      }
    }
  }, [createPeerConnection, sendSignal, getMediaStream]);

  const endCall = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    remoteStreamRef.current = new MediaStream();
    setRemoteStream(null);
    setIsCallActive(false);
  }, [localStream]);

  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  }, [localStream, isMuted]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  }, [localStream, isVideoOff]);

  // Connect to signaling server and listen for WebRTC signals
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080/ws"),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      onConnect: () => {
        client.subscribe(
          `/topic/session/${sessionId}/signal`,
          async (message) => {
            const signal = JSON.parse(message.body);

            // Ignore our own signals
            if (signal.senderId === userId) return;

            if (signal.type === "offer") {
              const pc =
                peerConnection.current || createPeerConnection();
              
              // Get local stream if not already available
              let stream = localStream;
              if (!stream) {
                stream = await navigator.mediaDevices.getUserMedia({
                  video: true,
                  audio: true,
                });
                setLocalStream(stream);
              }
              stream.getTracks().forEach((track) => pc.addTrack(track, stream!));

              await pc.setRemoteDescription(
                new RTCSessionDescription(signal.payload)
              );
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendSignal("answer", answer);
              setIsCallActive(true);
            } else if (signal.type === "answer") {
              if (peerConnection.current) {
                await peerConnection.current.setRemoteDescription(
                  new RTCSessionDescription(signal.payload)
                );
              }
            } else if (signal.type === "ice-candidate") {
              if (peerConnection.current) {
                await peerConnection.current.addIceCandidate(
                  new RTCIceCandidate(signal.payload)
                );
              }
            }
          }
        );
      },
      onStompError: (frame) => {
        console.error("WebSocket STOMP Error:", frame);
      },
    });

    client.activate();
    stompClient.current = client;

    return () => {
      client.deactivate();
      endCall();
    };
  }, [sessionId, token, userId]);

  return {
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
  };
}
