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
  const isSettingRemoteDescription = useRef(false);

  const ICE_SERVERS: RTCConfiguration = {
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
      if (state === "disconnected" || state === "failed") {
        // Don't fully tear down — ICE can recover from "disconnected"
        if (state === "failed") {
          setError("Connection lost. Please try refreshing.");
        }
      }
    };

    // "Perfect negotiation" pattern: handle negotiationneeded
    pc.onnegotiationneeded = async () => {
      try {
        makingOffer.current = true;
        await pc.setLocalDescription();
        sendSignal("offer", pc.localDescription);
      } catch (err) {
        console.error("Error during negotiation:", err);
      } finally {
        makingOffer.current = false;
      }
    };

    peerConnection.current = pc;
    return pc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendSignal]);

  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    // Try video + audio first
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch { /* Video failed — try audio only */ }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      setWarning("No camera detected — joined with audio only.");
      setIsVideoOff(true);
      return stream;
    } catch { /* Audio also failed — try video only */ }

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

      // Add tracks to peer connection — this triggers onnegotiationneeded
      // which will automatically create and send the offer
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Notify the other peer that we're ready
      sendSignal("ready", {});
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

  // Connect to signaling server and handle WebRTC signals
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

            const pc = peerConnection.current;

            if (signal.type === "ready") {
              // The other peer is ready — if we already have a connection,
              // re-trigger an offer by restarting ICE
              if (pc && localStreamRef.current) {
                pc.restartIce();
              }
            } else if (signal.type === "offer") {
              if (!pc) return;

              // "Perfect negotiation" — polite peer logic
              // We are "polite" if our userId is greater (arbitrary but consistent rule)
              const polite = userId > signal.senderId;
              const offerCollision = makingOffer.current || pc.signalingState !== "stable";

              if (offerCollision && !polite) {
                // Impolite peer ignores the incoming offer during collision
                return;
              }

              try {
                isSettingRemoteDescription.current = true;
                await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
                isSettingRemoteDescription.current = false;

                // If we don't have tracks added yet, add them now
                if (localStreamRef.current && pc.getSenders().length === 0) {
                  localStreamRef.current.getTracks().forEach((track) =>
                    pc.addTrack(track, localStreamRef.current!)
                  );
                }

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                sendSignal("answer", pc.localDescription);
              } catch (err) {
                isSettingRemoteDescription.current = false;
                console.error("Error handling offer:", err);
              }
            } else if (signal.type === "answer") {
              if (pc && pc.signalingState === "have-local-offer") {
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
                } catch (err) {
                  console.error("Error setting remote answer:", err);
                }
              }
            } else if (signal.type === "ice-candidate") {
              if (pc) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
                } catch (err) {
                  // Ignore ICE candidate errors if we're not in a state to accept them
                  if (!isSettingRemoteDescription.current) {
                    console.error("Error adding ICE candidate:", err);
                  }
                }
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
