"use client";

import { Mic, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import Transcript from "@/components/Transcript";
import { useVapi, type BookInfo } from "@/hooks/useVapi";
import { cn } from "@/lib/utils";

interface VapiControlsProps {
  book: BookInfo;
}

function formatTime(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function VapiControls({ book }: VapiControlsProps) {
  const {
    status,
    messages,
    currentUserMsg,
    currentAIMsg,
    duration,
    maxDuration,
    startCall,
    stopCall,
  } = useVapi(book);

  const statusConfig = {
    idle: { color: "bg-gray-400", label: "Idle" },
    connecting: { color: "bg-yellow-400 animate-pulse", label: "Connecting" },
    active: { color: "bg-emerald-500", label: "Active" },
    ended: { color: "bg-red-400", label: "Ended" },
  };

  const { color, label } = statusConfig[status];

  return (
    <div className="flex h-[600px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-heading text-lg font-semibold text-foreground">
            {book.title}
          </h2>
          <p className="truncate text-sm text-muted-foreground">
            by {book.author}
          </p>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <span
            className={cn("size-2.5 rounded-full", color)}
          />
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
        </div>
      </div>

      {/* Transcript */}
      <Transcript
        messages={messages}
        currentUserMsg={currentUserMsg}
        currentAIMsg={currentAIMsg}
      />

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-5 py-4">
        <div>
          {status === "active" && (
            <span className="font-mono text-sm text-muted-foreground">
              {formatTime(duration)} / {formatTime(maxDuration)}
            </span>
          )}
        </div>

        <div>
          {(status === "idle" || status === "ended") && (
            <Button onClick={startCall} size="lg">
              <Mic className="size-4" data-icon="inline-start" />
              Start Conversation
            </Button>
          )}
          {status === "connecting" && (
            <Button disabled size="lg">
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" data-icon="inline-start" />
              Connecting...
            </Button>
          )}
          {status === "active" && (
            <Button
              onClick={stopCall}
              size="lg"
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <PhoneOff className="size-4" data-icon="inline-start" />
              End Call
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
