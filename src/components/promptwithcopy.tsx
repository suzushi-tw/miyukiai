"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

interface PromptWithCopyProps {
  label: string;
  text: string;
}

export function PromptWithCopy({ label, text }: PromptWithCopyProps) {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <p className="text-xs text-muted-foreground">{label}:</p>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2 text-xs"
          onClick={copyToClipboard}
        >
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      <p className="text-sm border rounded-md p-2 bg-muted/50">{text}</p>
    </div>
  );
}