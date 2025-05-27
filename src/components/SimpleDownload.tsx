"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Magnet } from "lucide-react";

interface SimpleDownloadProps {
  modelId: string;
  fileUrl: string;
  fileName: string;
  magnetURI?: string | null;
  children?: React.ReactNode;
}

export function SimpleDownload({
  modelId,
  fileUrl,
  fileName,
  magnetURI,
  children
}: SimpleDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (url: string) => {
    try {
      setIsDownloading(true);
      
      // Increment download count
      await fetch(`/api/incrementdownload?id=${modelId}`, {
        method: "POST",
      });
      
      // Start download
      window.location.href = url;
    } catch (error) {
      console.error("Error during download:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Primary download button */}
      <Button 
        size="lg" 
        className="w-full" 
        onClick={() => handleDownload(fileUrl)}
        disabled={isDownloading}
      >
        <Download className="mr-2 h-5 w-5" />
        {children || "Download Model"}
      </Button>

      {/* Magnet link if available */}
      {magnetURI && (
        <Button 
          variant="outline" 
          size="sm"
          className="w-full"
          onClick={() => handleDownload(magnetURI)}
          disabled={isDownloading}
        >
          <Magnet className="mr-2 h-4 w-4" />
          Download via Torrent
        </Button>
      )}
    </div>
  );
}
