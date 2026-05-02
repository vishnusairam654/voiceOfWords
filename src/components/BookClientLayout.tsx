"use client";

import { useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SummaryPanel from "@/components/SummaryPanel";
import BookInteraction from "@/components/BookInteraction";
import { cn } from "@/lib/utils";

interface BookClientLayoutProps {
  book: any;
  bookData: any;
  initialSummary: any;
}

export default function BookClientLayout({
  book,
  bookData,
  initialSummary,
}: BookClientLayoutProps) {
  const [showDocument, setShowDocument] = useState(false);

  return (
    <div className="flex flex-1 overflow-hidden bg-background">
      {/* Main Content Area */}
      <div
        className={cn(
          "flex flex-1 flex-col overflow-y-auto transition-all duration-500 ease-in-out",
          showDocument ? "lg:mr-0" : ""
        )}
      >
        <div className={cn(
          "mx-auto w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8",
          showDocument ? "max-w-4xl" : "max-w-3xl"
        )}>
          {/* Document Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
                {book.title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                by {book.author}
                <span className="ml-3 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  {book.fileType || "pdf"}
                </span>
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDocument(!showDocument)}
              className={cn(
                "rounded-full border-border bg-surface/50 backdrop-blur-glass transition-all hover:border-primary/50",
                showDocument && "bg-primary/10 border-primary/50 text-primary"
              )}
            >
              {showDocument ? (
                <>
                  <EyeOff className="mr-2 size-4" />
                  Close Document
                </>
              ) : (
                <>
                  <Eye className="mr-2 size-4" />
                  View Original
                </>
              )}
            </Button>
          </div>

          {/* Summary Section */}
          <SummaryPanel
            bookId={book._id.toString()}
            bookTitle={book.title}
            initialSummary={initialSummary}
          />

          {/* Chat / Voice Section */}
          <BookInteraction book={bookData} />
        </div>
      </div>

      {/* Side Document Viewer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-40 w-full transform border-l border-border bg-surface/80 backdrop-blur-glass transition-all duration-500 ease-in-out sm:w-[450px] lg:static lg:w-[500px] xl:w-[600px]",
          showDocument ? "translate-x-0" : "translate-x-full lg:hidden"
        )}
      >
        {showDocument && (
          <div className="flex h-full flex-col pt-16 lg:pt-0">
            <div className="flex h-14 items-center justify-between border-b border-border bg-surface/50 px-4 backdrop-blur-glass">
              <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Document Preview</span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowDocument(false)}
                className="rounded-full hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="flex-1 bg-muted/20">
              {book.fileURL ? (
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(book.fileURL)}&embedded=true`}
                  className="h-full w-full border-none"
                  title={book.title}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
                  Document source not available.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
