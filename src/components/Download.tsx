"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface DownloadButtonProps {
  modelId: string;
  fileUrl: string;
  fileName: string;
  children?: React.ReactNode;
}

export function DownloadButton({
  modelId,
  fileUrl,
  fileName,
  children
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      
      // First, increment the download count
      await fetch(`/api/incrementdownload?id=${modelId}`, {
        method: "POST",
      });
      
      // Then trigger the actual download
      window.location.href = fileUrl;
    } catch (error) {
      console.error("Error during download:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button 
      size="lg" 
      className="w-full" 
      onClick={handleDownload}
      disabled={isDownloading}
    >
      <Download className="mr-2 h-5 w-5" />
      {children || "Download Model"}
    </Button>
  );
}