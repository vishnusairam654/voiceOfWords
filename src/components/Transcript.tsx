"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MessageCircle } from "lucide-react";

export interface Message {
  role: "user" | "assistant";
  content: string;
  final: boolean;
}

interface TranscriptProps {
  messages: Message[];
  currentUserMsg: string;
  currentAIMsg: string;
}

export default function Transcript({
  messages,
  currentUserMsg,
  currentAIMsg,
}: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentUserMsg, currentAIMsg]);

  const hasContent =
    messages.length > 0 || currentUserMsg || currentAIMsg;

  return (
    <div
      ref={scrollRef}
      className="scrollbar-thin flex-1 overflow-y-auto px-4 py-4"
    >
      {!hasContent ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
          <MessageCircle className="size-10 opacity-40" />
          <p className="text-sm">Start a conversation to see the transcript</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md bg-muted text-foreground"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {currentAIMsg && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground">
                {currentAIMsg}
                <span className="ml-1 inline-block size-2 animate-pulse rounded-full bg-accent" />
              </div>
            </div>
          )}

          {currentUserMsg && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary/70 px-4 py-2.5 text-sm italic leading-relaxed text-primary-foreground">
                {currentUserMsg}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
