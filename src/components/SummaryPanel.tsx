"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb,
  Tags,
  Quote,
  RefreshCw,
  Download,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SummaryPanelProps {
  bookId: string;
  bookTitle: string;
  initialSummary?: {
    keyIdeas: Array<{ title: string; description: string }>;
    concepts: string[];
    highlights: string[];
  };
}

type SummaryTab = "ideas" | "concepts" | "highlights";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function SummaryPanel({
  bookId,
  bookTitle,
  initialSummary,
}: SummaryPanelProps) {
  const [activeTab, setActiveTab] = useState<SummaryTab>("ideas");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(
    initialSummary || { keyIdeas: [], concepts: [], highlights: [] }
  );

  const hasSummary =
    summary.keyIdeas.length > 0 ||
    summary.concepts.length > 0 ||
    summary.highlights.length > 0;

  const generateSummary = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to generate summary");
        return;
      }

      setSummary({
        keyIdeas: data.keyIdeas || summary.keyIdeas,
        concepts: data.concepts || summary.concepts,
        highlights: data.highlights || summary.highlights,
      });
      toast.success("Summary generated!");
    } catch (err) {
      console.error("Summary error:", err);
      toast.error("Failed to generate summary");
    } finally {
      setLoading(false);
    }
  }, [bookId, summary]);

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

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, margin + pageWidth, y);
    y += 10;

    if (summary.keyIdeas.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Key Ideas", margin, y);
      y += 8;
      summary.keyIdeas.forEach((idea) => {
        if (y > 270) {
          doc.addPage();
          y = margin;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`• ${idea.title}`, margin, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(idea.description, pageWidth - 10);
        doc.text(lines, margin + 5, y);
        y += lines.length * 5 + 6;
      });
    }

    // ... (simplified PDF export for concepts and highlights)
    if (summary.highlights.length > 0) {
      if (y > 240) {
        doc.addPage();
        y = margin;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Highlights", margin, y);
      y += 8;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      summary.highlights.forEach((highlight) => {
        if (y > 270) {
          doc.addPage();
          y = margin;
        }
        const lines = doc.splitTextToSize(`"${highlight}"`, pageWidth - 5);
        doc.text(lines, margin + 5, y);
        y += lines.length * 5 + 5;
      });
    }

    doc.save(`${bookTitle.replace(/\s+/g, "_")}_summary.pdf`);
    toast.success("Summary exported as PDF!");
  }, [bookTitle, summary]);

  const tabs = [
    { id: "ideas" as const, label: "Key Ideas", icon: Lightbulb },
    { id: "concepts" as const, label: "Concepts", icon: Tags },
    { id: "highlights" as const, label: "Highlights", icon: Quote },
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4 p-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-xl bg-muted/50 p-4"
            >
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="h-5 w-1/3 rounded-lg bg-muted-foreground/20" />
              <div className="mt-3 space-y-2">
                <div className="h-4 w-full rounded-lg bg-muted-foreground/10" />
                <div className="h-4 w-4/5 rounded-lg bg-muted-foreground/10" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (!hasSummary) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center gap-4 py-12 text-center"
        >
          <div className="flex size-16 items-center justify-center rounded-[12px] bg-[image:var(--background-image-ai-gradient)] shadow-[var(--shadow-ai-glow)]">
            <Lightbulb className="size-8 text-white" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-medium text-foreground">
              No Insights Generated
            </h3>
            <p className="text-sm text-muted-foreground">
              Extract key ideas, concepts, and highlights using AI.
            </p>
          </div>
          <Button
            onClick={generateSummary}
            className="mt-2 rounded-full px-6 transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
          >
            <RefreshCw className="mr-2 size-4" />
            Generate Visual Summary
          </Button>
        </motion.div>
      );
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          className="p-6"
        >
          {activeTab === "ideas" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {summary.keyIdeas.map((idea, i) => (
                <motion.div
                  variants={itemVariants}
                  key={i}
                  className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card to-muted/20 p-5 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20"
                >
                  <div className="absolute right-0 top-0 h-16 w-16 -translate-y-8 translate-x-8 rounded-full bg-primary/10 blur-2xl transition-all group-hover:bg-primary/20" />
                  <div className="relative z-10 flex items-start gap-3">
                    <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="font-heading text-sm font-semibold text-foreground">
                        {idea.title}
                      </h4>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {idea.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === "concepts" && (
            <div className="flex flex-wrap gap-2.5">
              {summary.concepts.map((concept, i) => (
                <motion.div
                  variants={itemVariants}
                  key={i}
                  className="flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-sm font-medium text-primary shadow-sm backdrop-blur-sm transition-all hover:scale-105 hover:bg-primary hover:text-primary-foreground"
                >
                  <Tags className="size-3.5 opacity-70" />
                  {concept}
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === "highlights" && (
            <div className="space-y-4">
              {summary.highlights.map((highlight, i) => (
                <motion.div
                  variants={itemVariants}
                  key={i}
                  className="relative rounded-2xl border-l-4 border-primary bg-gradient-to-r from-primary/10 to-transparent p-5 pl-6"
                >
                  <Quote className="absolute -left-2.5 -top-2.5 size-5 rotate-180 bg-background text-primary" />
                  <p className="text-sm font-medium leading-relaxed italic text-foreground/90">
                    "{highlight}"
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="overflow-hidden rounded-[24px] border border-border bg-surface/50 backdrop-blur-glass shadow-[var(--shadow-card)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface/80 px-4 py-3 backdrop-blur-glass">
        <div className="flex items-center gap-1 rounded-xl bg-muted/40 p-1 backdrop-blur-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 rounded-lg bg-background shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="size-3.5" />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {hasSummary && (
            <Button
              variant="ghost"
              size="icon"
              onClick={exportAsPDF}
              className="size-9 rounded-full hover:bg-primary/10 hover:text-primary"
              title="Export as PDF"
            >
              <Download className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={generateSummary}
            disabled={loading}
            className="size-9 rounded-full hover:bg-primary/10 hover:text-primary"
            title="Regenerate"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[250px] bg-gradient-to-b from-card/30 to-background/30">
        {renderContent()}
      </div>
    </div>
  );
}
