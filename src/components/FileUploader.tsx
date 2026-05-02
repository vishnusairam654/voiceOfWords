"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Upload, FileText, Image as ImageIcon } from "lucide-react";

interface FileUploaderProps {
  label: string;
  accept: string;
  onChange: (file: File) => void;
  selectedFile?: File;
}

export default function FileUploader({
  label,
  accept,
  onChange,
  selectedFile,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPdf = accept.includes("pdf");
  const Icon = isPdf ? FileText : ImageIcon;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onChange(file);
    },
    [onChange]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onChange(file);
    },
    [onChange]
  );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all duration-200",
        isDragging
          ? "border-primary bg-primary/5 scale-[1.01]"
          : selectedFile
            ? "border-primary/40 bg-primary/5"
            : "border-border hover:border-accent/50 hover:bg-muted/30"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-full transition-colors",
          selectedFile
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent"
        )}
      >
        {selectedFile ? <Icon className="size-6" /> : <Upload className="size-6" />}
      </div>
      {selectedFile ? (
        <div className="text-center">
          <p className="font-medium text-foreground">{selectedFile.name}</p>
          <p className="text-xs text-muted-foreground">
            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB — Click or drag
            to replace
          </p>
        </div>
      ) : (
        <div className="text-center">
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">
            Drag and drop or click to browse
          </p>
        </div>
      )}
    </div>
  );
}
