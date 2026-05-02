"use client";

import { useState, useCallback } from "react";
import {
  FileText,
  List,
  AlignLeft,
  RefreshCw,
  Download,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SummaryPanelProps {
  bookId: string;
  bookTitle: string;
  initialSummary?: {
    shortSummary: string;
    detailedSummary: string;
    keyPoints: string[];
  };
}

type SummaryTab = "short" | "detailed" | "keypoints";

export default function SummaryPanel({
  bookId,
  bookTitle,
  initialSummary,
}: SummaryPanelProps) {
  const [activeTab, setActiveTab] = useState<SummaryTab>("short");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(
    initialSummary || { shortSummary: "", detailedSummary: "", keyPoints: [] as string[] }
  );

  const hasSummary =
    summary.shortSummary || summary.detailedSummary || summary.keyPoints.length > 0;

  const generateSummary = useCallback(
    async (mode: "all" | SummaryTab = "all") => {
      setLoading(true);
      try {
        const response = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId, mode }),
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Failed to generate summary");
          return;
        }

        setSummary({
          shortSummary: data.shortSummary || summary.shortSummary,
          detailedSummary: data.detailedSummary || summary.detailedSummary,
          keyPoints: data.keyPoints?.length ? data.keyPoints : summary.keyPoints,
        });
        toast.success("Summary generated!");
      } catch (err) {
        console.error("Summary error:", err);
        toast.error("Failed to generate summary");
      } finally {
        setLoading(false);
      }
    },
    [bookId, summary]
  );

  const exportAsPDF = useCallback(async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
    let y = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(bookTitle, margin, y);
    y += 12;

    doc.setDrawColor(180, 140, 100);
    doc.line(margin, y, margin + pageWidth, y);
    y += 10;

    if (summary.shortSummary) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Short Summary", margin, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(summary.shortSummary, pageWidth);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 10;
    }

    if (summary.detailedSummary) {
      if (y > 240) { doc.addPage(); y = margin; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Detailed Summary", margin, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(summary.detailedSummary, pageWidth);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 10;
    }

    if (summary.keyPoints.length > 0) {
      if (y > 240) { doc.addPage(); y = margin; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Key Points", margin, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      summary.keyPoints.forEach((point) => {
        if (y > 270) { doc.addPage(); y = margin; }
        const lines = doc.splitTextToSize(`• ${point}`, pageWidth - 5);
        doc.text(lines, margin + 5, y);
        y += lines.length * 5 + 3;
      });
    }

    doc.save(`${bookTitle.replace(/\s+/g, "_")}_summary.pdf`);
    toast.success("Summary exported as PDF!");
  }, [bookTitle, summary]);

  const tabs = [
    { id: "short" as const, label: "Short", icon: FileText },
    { id: "detailed" as const, label: "Detailed", icon: AlignLeft },
    { id: "keypoints" as const, label: "Key Points", icon: List },
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-3 p-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded-lg bg-muted"
              style={{ width: `${85 - i * 15}%`, animationDelay: `${i * 100}ms` }}
            />
          ))}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Generating summary with AI...
          </p>
        </div>
      );
    }

    if (!hasSummary) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <FileText className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No summary yet. Click &ldquo;Generate&rdquo; to create one.
          </p>
          <Button onClick={() => generateSummary("all")} size="sm">
            <RefreshCw className="size-3.5" data-icon="inline-start" />
            Generate Summary
          </Button>
        </div>
      );
    }

    switch (activeTab) {
      case "short":
        return (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {summary.shortSummary || "No short summary available."}
          </p>
        );
      case "detailed":
        return (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {summary.detailedSummary || "No detailed summary available."}
          </p>
        );
      case "keypoints":
        return summary.keyPoints.length > 0 ? (
          <ul className="space-y-2">
            {summary.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
                <CheckCircle className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No key points available.</p>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          {hasSummary && (
            <Button
              variant="ghost"
              size="icon"
              onClick={exportAsPDF}
              className="size-8"
              title="Export as PDF"
            >
              <Download className="size-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => generateSummary(activeTab)}
            disabled={loading}
            className="size-8"
            title="Regenerate"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[120px] p-4">{renderContent()}</div>
    </div>
  );
}
