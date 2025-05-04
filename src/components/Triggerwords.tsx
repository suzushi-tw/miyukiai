"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Copy } from "lucide-react";

interface TriggerWordsProps {
  triggerWords: string | null;
}

export function TriggerWords({ triggerWords }: TriggerWordsProps) {
  const [copied, setCopied] = useState(false);

  // If no trigger words, don't render anything
  if (!triggerWords) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(triggerWords);
    setCopied(true);
    
    // Reset copied state after 2 seconds
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Trigger Words</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={handleCopy}
            title="Copy trigger words"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="sr-only">Copy</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="bg-muted/50 p-2 rounded-md text-sm whitespace-pre-wrap">
          {triggerWords}
        </div>
      </CardContent>
    </Card>
  );
}