"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageCircle, Sparkles, BookOpen, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  book: {
    _id: string;
    title: string;
    author: string;
  };
}

const QUICK_ACTIONS = [
  { id: "explain", label: "Explain simply", icon: Sparkles, prompt: "Can you explain the main concept of this document in simple terms, as if to a beginner?" },
  { id: "examples", label: "Give examples", icon: BookOpen, prompt: "Can you provide some concrete examples from the text that support its main arguments?" },
  { id: "notes", label: "Convert to notes", icon: PenTool, prompt: "Can you convert the most important parts of this document into a bulleted list of study notes?" },
];

export default function ChatPanel({ book }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto-resize textarea
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      e.target.style.height = "auto";
      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    },
    []
  );

  const sendMessage = useCallback(async (customPrompt?: string) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: textToSend };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          bookId: book._id,
          bookTitle: book.title,
          bookAuthor: book.author,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to get response");
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, messages, book]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  return (
    <div className="flex h-[600px] flex-col overflow-hidden rounded-[20px] border border-border/50 bg-card/40 backdrop-blur-md shadow-2xl shadow-black/5">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/40 bg-card/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary shadow-inner">
            <MessageCircle className="size-4" />
          </div>
          <div>
            <h2 className="font-heading text-sm font-semibold text-foreground">
              AI Assistant
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Ask anything about {book.title}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-card/30 to-background/30 px-4 py-6 sm:px-6"
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex h-full flex-col items-center justify-center gap-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/5 shadow-inner">
                  <Sparkles className="size-8 text-primary/60" />
                </div>
                <h3 className="font-heading text-lg font-medium text-foreground">
                  How can I help you?
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  I've read the document and I'm ready to answer your questions.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="grid w-full max-w-sm gap-2">
                {QUICK_ACTIONS.map((action, i) => (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 + 0.2 }}
                    onClick={() => sendMessage(action.prompt)}
                    className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-left transition-all hover:bg-muted/50 hover:shadow-md"
                  >
                    <action.icon className="size-4 text-primary opacity-70 transition-transform group-hover:scale-110 group-hover:opacity-100" />
                    <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">
                      {action.label}
                    </span>
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/5 to-transparent transition-transform duration-500 group-hover:translate-x-[100%]" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn(
                    "flex w-full",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "relative max-w-[85%] rounded-[20px] px-5 py-3.5 text-[15px] leading-relaxed whitespace-pre-wrap shadow-sm",
                      msg.role === "user"
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm border border-border/50 bg-card/80 text-foreground backdrop-blur-sm"
                    )}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex rounded-[20px] rounded-bl-sm border border-border/50 bg-card/80 px-5 py-4 backdrop-blur-sm shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <motion.div
                        className="size-2 rounded-full bg-primary/60"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                      />
                      <motion.div
                        className="size-2 rounded-full bg-primary/60"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                      />
                      <motion.div
                        className="size-2 rounded-full bg-primary/60"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t border-border/40 bg-card/50 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="relative flex items-end gap-2 rounded-2xl border border-border/50 bg-background/50 p-1.5 shadow-sm transition-colors focus-within:border-primary/50 focus-within:bg-background">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            className="scrollbar-none max-h-32 min-h-[44px] w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="mb-1 mr-1 size-10 shrink-0 rounded-xl bg-primary text-primary-foreground shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <Send className="size-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
