"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LinkIcon, Check } from "lucide-react";

interface ShareButtonProps {
  modelId: string;
}

export function ShareButton({ modelId }: ShareButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  
  const handleCopyLink = () => {
    const url = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/model/${modelId}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };
  
  return (
    <Button
      variant="outline"
      size="lg"
      className="w-full"
      onClick={handleCopyLink}
    >
      {isCopied ? (
        <>
          <Check className="mr-2 h-5 w-5" /> Link Copied
        </>
      ) : (
        <>
          <LinkIcon className="mr-2 h-5 w-5" /> Copy Link
        </>
      )}
    </Button>
  );
}