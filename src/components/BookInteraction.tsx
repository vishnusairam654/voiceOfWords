"use client";

import { useState } from "react";
import { Mic, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import VapiControls from "@/components/VapiControls";
import ChatPanel from "@/components/ChatPanel";
import type { BookInfo } from "@/hooks/useVapi";

interface BookInteractionProps {
  book: BookInfo;
}

export default function BookInteraction({ book }: BookInteractionProps) {
  const [mode, setMode] = useState<"voice" | "chat">("chat");

  return (
    <div className="space-y-4">
      {/* Mode Tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
        <button
          type="button"
          onClick={() => setMode("voice")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
            mode === "voice"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Mic className="size-4" />
          Voice
        </button>
        <button
          type="button"
          onClick={() => setMode("chat")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
            mode === "chat"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageCircle className="size-4" />
          Chat
        </button>
      </div>

      {/* Active Panel */}
      {mode === "voice" ? (
        <VapiControls book={book} />
      ) : (
        <ChatPanel book={book} />
      )}
    </div>
  );
}
