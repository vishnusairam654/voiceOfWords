"use client";

import { VOICE_PERSONAS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Mic } from "lucide-react";

interface VoiceSelectorProps {
  value: string;
  onChange: (id: string) => void;
}

export default function VoiceSelector({ value, onChange }: VoiceSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {VOICE_PERSONAS.map((persona) => {
        const isSelected = value === persona.id;
        return (
          <button
            key={persona.id}
            type="button"
            onClick={() => onChange(persona.id)}
            className={cn(
              "group relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all duration-200",
              isSelected
                ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                : "border-border bg-card hover:border-accent/50 hover:bg-muted/50"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:bg-accent/20"
                  )}
                >
                  <Mic className="size-4" />
                </div>
                <span className="font-semibold text-foreground">
                  {persona.name}
                </span>
              </div>
              <Badge
                variant={isSelected ? "default" : "secondary"}
                className="text-[10px] uppercase"
              >
                {persona.gender}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {persona.description}
            </p>
            {isSelected && (
              <div className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <svg
                  className="size-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
