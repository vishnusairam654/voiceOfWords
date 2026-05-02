"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  startVoiceSession,
  endVoiceSession,
} from "@/lib/actions/sessions";

export type CallStatus = "idle" | "connecting" | "active" | "ended";

export interface Message {
  role: "user" | "assistant";
  content: string;
  final: boolean;
}

export interface BookInfo {
  _id: string;
  title: string;
  author: string;
  persona: string;
}

type VapiInstance = import("@vapi-ai/web").default;

let vapiInstance: VapiInstance | null = null;

function getVapi(): VapiInstance {
  if (!vapiInstance) {
    // Dynamic import workaround for SSR — Vapi is client-only
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const VapiSDK = require("@vapi-ai/web").default;
    vapiInstance = new VapiSDK(
      process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!
    ) as VapiInstance;
  }
  return vapiInstance;
}

export function useVapi(book: BookInfo) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserMsg, setCurrentUserMsg] = useState("");
  const [currentAIMsg, setCurrentAIMsg] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isBillingError, setIsBillingError] = useState(false);

  const sessionIdRef = useRef<string>("");
  const maxDurationRef = useRef<number>(3600);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startCall = useCallback(async () => {
    setStatus("connecting");
    setMessages([]);
    setCurrentUserMsg("");
    setCurrentAIMsg("");
    setDuration(0);
    durationRef.current = 0;
    setIsBillingError(false);

    try {
      const sessionResult = await startVoiceSession(book._id);

      if ("error" in sessionResult) {
        toast.error(sessionResult.error);
        setStatus("idle");
        if (
          sessionResult.error &&
          typeof sessionResult.error === "string" &&
          sessionResult.error.toLowerCase().includes("billing")
        ) {
          setIsBillingError(true);
        }
        return;
      }

      sessionIdRef.current = sessionResult.sessionId;
      maxDurationRef.current = sessionResult.maxDuration;

      const vapi = getVapi();

      // Remove all previous listeners to prevent duplicates on repeated calls
      vapi.removeAllListeners();

      vapi.on("call-start", () => {
        setStatus("active");
      });

      vapi.on("call-end", () => {
        setStatus("ended");
        clearTimer();
        // Persist session duration when the call ends
        if (sessionIdRef.current) {
          endVoiceSession(sessionIdRef.current, durationRef.current).catch(
            console.error
          );
        }
      });

      vapi.on("speech-start", () => {
        setIsSpeaking(true);
      });

      vapi.on("speech-end", () => {
        setIsSpeaking(false);
      });

      vapi.on("error", (error) => {
        console.error("Vapi error:", JSON.stringify(error, null, 2));
        console.error("Vapi error raw:", error);
        const msg =
          error?.message || error?.error?.message || "Voice call failed";
        toast.error(String(msg));
        setStatus("idle");
        clearTimer();
      });

      vapi.on("message", (message: Record<string, unknown>) => {
        if (message.type === "transcript") {
          const role = message.role as "user" | "assistant";
          const transcriptType = message.transcriptType as string;
          const transcript = (message.transcript as string) || "";

          if (role === "user") {
            if (transcriptType === "partial") {
              setCurrentUserMsg(transcript);
            } else if (transcriptType === "final") {
              setMessages((prev) => [
                ...prev,
                { role: "user", content: transcript, final: true },
              ]);
              setCurrentUserMsg("");
            }
          } else if (role === "assistant") {
            if (transcriptType === "partial") {
              setCurrentAIMsg(transcript);
            } else if (transcriptType === "final") {
              setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                if (
                  lastMsg &&
                  lastMsg.role === "assistant" &&
                  !lastMsg.final
                ) {
                  return [
                    ...prev.slice(0, -1),
                    { role: "assistant", content: transcript, final: true },
                  ];
                }
                return [
                  ...prev,
                  { role: "assistant", content: transcript, final: true },
                ];
              });
              setCurrentAIMsg("");
            }
          }
        }
      });

      const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
      const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
      console.log("Vapi debug — publicKey:", publicKey);
      console.log("Vapi debug — assistantId:", assistantId);
      console.log("Vapi debug — persona voiceId:", book.persona);

      if (!assistantId) {
        toast.error("Missing VAPI_ASSISTANT_ID. Check your .env.local");
        setStatus("idle");
        return;
      }

      // Only add voice override if it's a real ElevenLabs ID (not a placeholder)
      const isRealVoiceId =
        book.persona && !book.persona.includes("VOICE_ID_HERE");

      const overrides: Record<string, unknown> = {
        variableValues: {
          bookTitle: book.title,
          bookAuthor: book.author,
          bookId: book._id,
        },
      };

      if (isRealVoiceId) {
        overrides.voice = {
          provider: "11labs",
          voiceId: book.persona,
          stability: 0.5,
          similarityBoost: 0.75,
        };
      }

      console.log("Vapi start overrides:", JSON.stringify(overrides, null, 2));
      await vapi.start(assistantId, overrides);

      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);

        if (durationRef.current >= maxDurationRef.current) {
          const vapi = getVapi();
          vapi.stop();
          toast.info("Session limit reached.");
          clearTimer();
        }
      }, 1000);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Failed to start call:", err);
      console.error("Start call error details:", errMsg);
      toast.error(`Failed to start voice session: ${errMsg}`);
      setStatus("idle");
    }
  }, [book, clearTimer]);

  const stopCall = useCallback(async () => {
    try {
      const vapi = getVapi();
      clearTimer();
      vapi.stop();

      // endVoiceSession is also called via the "call-end" listener,
      // but we call it here too in case the event doesn't fire
      if (sessionIdRef.current) {
        await endVoiceSession(sessionIdRef.current, durationRef.current);
        sessionIdRef.current = ""; // prevent double-save
      }
    } catch (err) {
      console.error("Failed to stop call:", err);
    }
  }, [clearTimer]);

  // Cleanup on unmount: stop any active call + timer
  useEffect(() => {
    return () => {
      clearTimer();
      try {
        const vapi = getVapi();
        vapi.removeAllListeners();
        vapi.stop();
      } catch {
        // Vapi may not be initialized — ignore
      }
    };
  }, [clearTimer]);

  return {
    status,
    messages,
    currentUserMsg,
    currentAIMsg,
    isSpeaking,
    duration,
    maxDuration: maxDurationRef.current,
    isBillingError,
    startCall,
    stopCall,
  };
}
