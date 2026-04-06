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
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const makingOffer = useRef(false);
  const peerConnected = useRef(false);
  const retryInterval = useRef<NodeJS.Timeout | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

  const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
    ],
    iceCandidatePoolSize: 10,
  };

  // ── Helpers ──

  const sendSignal = useCallback(
    (type: string, payload: unknown) => {
      if (stompClient.current?.connected) {
        stompClient.current.publish({
          destination: `/app/signal/${sessionId}`,
          body: JSON.stringify({ sessionId, senderId: userId, type, payload }),
        });
      }
    },
    [sessionId, userId]
  );

  const stopRetrying = useCallback(() => {
    if (retryInterval.current) {
      clearInterval(retryInterval.current);
      retryInterval.current = null;
    }
  }, []);

  // Keep sending "ready" every 3 seconds until the peer connects
  const startRetrying = useCallback(() => {
    stopRetrying();
    retryInterval.current = setInterval(() => {
      if (peerConnected.current) {
        stopRetrying();
        return;
      }
      // Re-send ready signal and offer
      if (stompClient.current?.connected && peerConnection.current && localStreamRef.current) {
        sendSignal("ready", {});
        const pc = peerConnection.current;
        if (pc.signalingState === "stable" || pc.signalingState === "have-local-offer") {
          // Create a fresh offer
          pc.createOffer({ iceRestart: true })
            .then((offer) => {
              if (pc.signalingState !== "closed") {
                return pc.setLocalDescription(offer);
              }
            })
            .then(() => {
              if (pc.localDescription) {
                sendSignal("offer", pc.localDescription);
              }
            })
            .catch(() => {});
        }
      }
    }, 3000);
  }, [sendSignal, stopRetrying]);

  const drainIceCandidateQueue = useCallback(async () => {
    const pc = peerConnection.current;
    if (!pc || !pc.remoteDescription) return;
    while (iceCandidateQueue.current.length > 0) {
      const candidate = iceCandidateQueue.current.shift()!;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore errors for stale candidates
      }
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
    }

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
      const state = pc.iceConnectionState;
      if (state === "connected" || state === "completed") {
        peerConnected.current = true;
        setIsCallActive(true);
        stopRetrying();
      }
      if (state === "disconnected") {
        // ICE can recover from disconnected, start retrying
        peerConnected.current = false;
        startRetrying();
      }
      if (state === "failed") {
        // Restart ICE and retry
        peerConnected.current = false;
        pc.restartIce();
        startRetrying();
      }
    };

    peerConnection.current = pc;
    return pc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendSignal, stopRetrying, startRetrying]);

  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch { /* Video failed */ }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      setWarning("No camera detected — joined with audio only.");
      setIsVideoOff(true);
      return stream;
    } catch { /* Audio also failed */ }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setWarning("No microphone detected — joined with video only.");
      setIsMuted(true);
      return stream;
    } catch {
      throw new DOMException("No media devices found", "NotFoundError");
    }
  }, []);

  const startCall = useCallback(async () => {
    setError(null);
    setWarning(null);
    try {
      const stream = await getMediaStream();
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Send ready + offer, and start the retry loop
      if (stompClient.current?.connected) {
        sendSignal("ready", {});
        setTimeout(async () => {
          try {
            makingOffer.current = true;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendSignal("offer", pc.localDescription);
          } catch (err) {
            console.error("Error creating initial offer:", err);
          } finally {
            makingOffer.current = false;
          }
          // Start retrying in case the other peer hasn't joined yet
          startRetrying();
        }, 500);
      } else {
        // STOMP not ready yet — retry loop will handle it once connected
        startRetrying();
      }
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
  }, [createPeerConnection, sendSignal, getMediaStream, startRetrying]);

  const endCall = useCallback(() => {
    stopRetrying();
    peerConnected.current = false;
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    remoteStreamRef.current = new MediaStream();
    setRemoteStream(null);
    setIsCallActive(false);
  }, [stopRetrying]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff((prev) => !prev);
    }
  }, []);

  // ── STOMP connection + signal handling ──
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () =>
        new SockJS(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080/ws"),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe(
          `/topic/session/${sessionId}/signal`,
          async (message) => {
            const signal = JSON.parse(message.body);
            if (signal.senderId === userId) return;

            const pc = peerConnection.current;

            if (signal.type === "ready") {
              // Other peer is here — send them an offer if we're ready
              if (pc && localStreamRef.current && !peerConnected.current) {
                try {
                  makingOffer.current = true;
                  const offer = await pc.createOffer({ iceRestart: true });
                  if (pc.signalingState !== "closed") {
                    await pc.setLocalDescription(offer);
                    sendSignal("offer", pc.localDescription);
                  }
                } catch (err) {
                  console.error("Error sending offer on ready:", err);
                } finally {
                  makingOffer.current = false;
                }
              }
              return;
            }

            if (!pc) return;

            if (signal.type === "offer") {
              const polite = userId > signal.senderId;
              const offerCollision = makingOffer.current || pc.signalingState !== "stable";

              if (offerCollision && !polite) {
                return; // Impolite peer ignores during collision
              }

              try {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));

                // Drain queued ICE candidates now that remote description is set
                await drainIceCandidateQueue();

                // Add tracks if needed
                if (localStreamRef.current && pc.getSenders().length === 0) {
                  localStreamRef.current
                    .getTracks()
                    .forEach((track) => pc.addTrack(track, localStreamRef.current!));
                }

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                sendSignal("answer", pc.localDescription);
              } catch (err) {
                console.error("Error handling offer:", err);
              }
            } else if (signal.type === "answer") {
              if (pc.signalingState === "have-local-offer") {
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
                  await drainIceCandidateQueue();
                } catch (err) {
                  console.error("Error setting remote answer:", err);
                }
              }
            } else if (signal.type === "ice-candidate") {
              // Queue candidates if remote description isn't set yet
              if (!pc.remoteDescription) {
                iceCandidateQueue.current.push(signal.payload);
              } else {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
                } catch (err) {
                  console.error("Error adding ICE candidate:", err);
                }
              }
            }
          }
        );

        // Announce presence immediately
        sendSignal("ready", {});

        // If we already have a PC + stream, send offer right away
        if (peerConnection.current && localStreamRef.current) {
          setTimeout(async () => {
            const pc = peerConnection.current;
            if (!pc || pc.signalingState === "closed") return;
            try {
              makingOffer.current = true;
              const offer = await pc.createOffer({ iceRestart: true });
              await pc.setLocalDescription(offer);
              sendSignal("offer", pc.localDescription);
            } catch (err) {
              console.error("Error sending initial offer:", err);
            } finally {
              makingOffer.current = false;
            }
          }, 300);
        }
      },
      onStompError: (frame) => {
        console.error("WebSocket STOMP Error:", frame);
      },
    });

    client.activate();
    stompClient.current = client;

    return () => {
      stopRetrying();
      client.deactivate();
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
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
