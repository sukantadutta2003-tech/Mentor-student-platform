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
  const stompConnected = useRef(false);

  // STUN + TURN servers for NAT traversal
  // TURN is critical when peers are on different networks (WiFi + mobile data)
  const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
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
  };

  // Send signal via the stored STOMP client
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

  // Explicitly create and send an offer
  const createAndSendOffer = useCallback(async () => {
    const pc = peerConnection.current;
    if (!pc || !stompClient.current?.connected) return;
    if (pc.signalingState === "closed") return;

    try {
      makingOffer.current = true;
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      sendSignal("offer", pc.localDescription);
    } catch (err) {
      console.error("Error creating offer:", err);
    } finally {
      makingOffer.current = false;
    }
  }, [sendSignal]);

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
        setIsCallActive(true);
      }
      if (state === "failed") {
        setError("Connection lost. Please try refreshing.");
      }
    };

    peerConnection.current = pc;
    return pc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendSignal]);

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

      // If STOMP is already connected, send offer now
      // Otherwise, the STOMP onConnect handler will send it
      if (stompConnected.current) {
        // Small delay to ensure subscription is active on both sides
        setTimeout(() => {
          createAndSendOffer();
          sendSignal("ready", {});
        }, 300);
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
  }, [createPeerConnection, sendSignal, getMediaStream, createAndSendOffer]);

  const endCall = useCallback(() => {
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
  }, []);

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

  // Single useEffect: connect STOMP and handle all signaling
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () =>
        new SockJS(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080/ws"),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      onConnect: () => {
        stompConnected.current = true;

        client.subscribe(
          `/topic/session/${sessionId}/signal`,
          async (message) => {
            const signal = JSON.parse(message.body);

            // Ignore our own signals
            if (signal.senderId === userId) return;

            const pc = peerConnection.current;

            if (signal.type === "ready") {
              // The other peer announced itself — send them an offer
              if (pc && localStreamRef.current) {
                // Small delay so their subscription is fully ready
                setTimeout(async () => {
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
                }, 500);
              }
              return;
            }

            if (!pc) return;

            if (signal.type === "offer") {
              // Perfect negotiation: determine polite vs impolite peer
              const polite = userId > signal.senderId;
              const offerCollision =
                makingOffer.current || pc.signalingState !== "stable";

              if (offerCollision && !polite) {
                // Impolite peer ignores incoming offer during collision
                return;
              }

              try {
                await pc.setRemoteDescription(
                  new RTCSessionDescription(signal.payload)
                );

                // Add tracks if not already added
                if (localStreamRef.current && pc.getSenders().length === 0) {
                  localStreamRef.current
                    .getTracks()
                    .forEach((track) =>
                      pc.addTrack(track, localStreamRef.current!)
                    );
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
                  await pc.setRemoteDescription(
                    new RTCSessionDescription(signal.payload)
                  );
                } catch (err) {
                  console.error("Error setting remote answer:", err);
                }
              }
            } else if (signal.type === "ice-candidate") {
              try {
                if (pc.remoteDescription) {
                  await pc.addIceCandidate(
                    new RTCIceCandidate(signal.payload)
                  );
                }
              } catch (err) {
                console.error("Error adding ICE candidate:", err);
              }
            }
          }
        );

        // After subscribing, announce presence and send offer if ready
        sendSignal("ready", {});

        if (peerConnection.current && localStreamRef.current) {
          setTimeout(async () => {
            try {
              const pc = peerConnection.current;
              if (!pc || pc.signalingState === "closed") return;
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
      onDisconnect: () => {
        stompConnected.current = false;
      },
    });

    client.activate();
    stompClient.current = client;

    return () => {
      stompConnected.current = false;
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
