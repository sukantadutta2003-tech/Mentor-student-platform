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

  // ICE_SERVERS with TURN fallback
  const ICE_SERVERS = {
    iceServers: [
      // Primary STUN servers
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      // Fallback TURN servers for NAT traversal
      {
        urls: "turn:turn.av5.net:3478",
        username: "webrtc",
        credential: "webrtc",
      },
      {
        urls: "turn:turn.av5.net:3478?transport=tcp",
        username: "webrtc",
        credential: "webrtc",
      },
    ],
  };

  const sendSignal = useCallback(
    (type: string, payload: unknown) => {
      if (stompClient.current?.connected) {
        console.log(`[WebRTC] Sending ${type} signal`, payload);
        stompClient.current.publish({
          destination: `/app/signal/${sessionId}`,
          body: JSON.stringify({
            sessionId,
            senderId: userId,
            type,
            payload,
          }),
        });
      } else {
        console.warn(`[WebRTC] Cannot send ${type} - WebSocket not connected`);
      }
    },
    [sessionId, userId]
  );

  const createPeerConnection = useCallback(() => {
    console.log("[WebRTC] Creating peer connection with ICE servers:", ICE_SERVERS);
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Log connection state changes
    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state changed:", pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE connection state changed:", pc.iceConnectionState);
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
        console.warn("[WebRTC] ICE connection failed or disconnected, ending call");
        endCall();
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[WebRTC] ICE candidate found:", event.candidate.candidate);
        sendSignal("ice-candidate", event.candidate.toJSON());
      } else {
        console.log("[WebRTC] ICE candidate gathering completed");
      }
    };

    pc.ontrack = (event) => {
      console.log("[WebRTC] Remote track received:", event.track.kind, event.track.id);
      event.streams[0].getTracks().forEach((track) => {
        console.log("[WebRTC] Adding track to remote stream:", track.kind);
        remoteStreamRef.current.addTrack(track);
      });
      setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
    };

    pc.ondatachannel = (event) => {
      console.log("[WebRTC] Data channel received:", event.channel.label);
    };

    peerConnection.current = pc;
    return pc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendSignal]);

  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    // Try video + audio first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log("[WebRTC] Got media stream with video and audio");
      return stream;
    } catch (err) {
      console.warn("[WebRTC] Failed to get video+audio:", err);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
      console.log("[WebRTC] Got media stream with audio only");
      setWarning("No camera detected — joined with audio only.");
      setIsVideoOff(true);
      return stream;
    } catch (err) {
      console.warn("[WebRTC] Failed to get audio only:", err);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      console.log("[WebRTC] Got media stream with video only");
      setWarning("No microphone detected — joined with video only.");
      setIsMuted(true);
      return stream;
    } catch (err) {
      console.error("[WebRTC] Failed to get any media stream:", err);
      throw new DOMException("No media devices found", "NotFoundError");
    }
  }, []);

  const startCall = useCallback(async () => {
    console.log("[WebRTC] Starting call");
    setError(null);
    setWarning(null);
    try {
      const stream = await getMediaStream();
      setLocalStream(stream);

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => {
        console.log("[WebRTC] Adding local track:", track.kind);
        pc.addTrack(track, stream);
      });

      console.log("[WebRTC] Creating offer");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("[WebRTC] Offer created and local description set, sending to peer");
      sendSignal("offer", offer);

      setIsCallActive(true);
    } catch (err) {
      console.error("[WebRTC] Failed to start call:", err);
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
    console.log("[WebRTC] Ending call");
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
    console.log("[WebRTC] Connecting to WebSocket signaling server");
    const client = new Client({
      webSocketFactory: () => new SockJS(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080/ws"),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      onConnect: () => {
        console.log("[WebRTC] WebSocket connected, subscribing to session signals");
        client.subscribe(
          `/topic/session/${sessionId}/signal`,
          async (message) => {
            const signal = JSON.parse(message.body);
            console.log("[WebRTC] Received signal:", signal.type, "from user:", signal.senderId);

            // Ignore our own signals
            if (signal.senderId === userId) {
              console.log("[WebRTC] Ignoring own signal");
              return;
            }

            if (signal.type === "offer") {
              console.log("[WebRTC] Processing offer");
              const pc = peerConnection.current || createPeerConnection();

              // Get local stream if not already available
              let stream = localStream;
              if (!stream) {
                console.log("[WebRTC] Getting local media stream for answerer");
                stream = await navigator.mediaDevices.getUserMedia({
                  video: true,
                  audio: true,
                });
                setLocalStream(stream);
              }
              stream.getTracks().forEach((track) => {
                console.log("[WebRTC] Adding local track for answer:", track.kind);
                pc.addTrack(track, stream!);
              });

              console.log("[WebRTC] Setting remote description from offer");
              await pc.setRemoteDescription(
                new RTCSessionDescription(signal.payload)
              );
              console.log("[WebRTC] Creating answer");
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              console.log("[WebRTC] Answer created, sending to peer");
              sendSignal("answer", answer);
              setIsCallActive(true);
            } else if (signal.type === "answer") {
              console.log("[WebRTC] Processing answer");
              if (peerConnection.current) {
                await peerConnection.current.setRemoteDescription(
                  new RTCSessionDescription(signal.payload)
                );
                console.log("[WebRTC] Remote description set from answer");
              }
            } else if (signal.type === "ice-candidate") {
              console.log("[WebRTC] Processing ICE candidate");
              if (peerConnection.current) {
                try {
                  await peerConnection.current.addIceCandidate(
                    new RTCIceCandidate(signal.payload)
                  );
                  console.log("[WebRTC] ICE candidate added successfully");
                } catch (error) {
                  console.warn("[WebRTC] Error adding ICE candidate:", error);
                }
              }
            }
          }
        );
      },
      onStompError: (frame) => {
        console.error("[WebRTC] WebSocket STOMP Error:", frame);
        setError("WebSocket connection error. Please refresh the page.");
      },
    });

    client.activate();
    stompClient.current = client;

    return () => {
      console.log("[WebRTC] Cleaning up WebSocket connection");
      client.deactivate();
      endCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
