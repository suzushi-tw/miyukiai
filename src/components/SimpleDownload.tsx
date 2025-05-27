"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Magnet } from "lucide-react";
import { torrentService } from "@/lib/torrent-service";

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
  const [isTorrentDownloading, setIsTorrentDownloading] = useState(false);

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

  const handleTorrentDownload = async () => {
    if (!magnetURI) return;
    
    try {
      setIsTorrentDownloading(true);
      
      // Increment download count
      await fetch(`/api/incrementdownload?id=${modelId}`, {
        method: "POST",
      });
      
      // Try to download via torrent with fallback to direct download
      const success = await torrentService.downloadWithTimeout(
        magnetURI,
        fileUrl,
        fileName,
        30000 // 30 second timeout
      );
      
      if (!success) {
        // If torrent download fails, fall back to direct download
        console.log("Torrent download failed, falling back to direct download");
        window.location.href = fileUrl;
      }
    } catch (error) {
      console.error("Error during torrent download:", error);
      // Fall back to direct download on error
      window.location.href = fileUrl;
    } finally {
      setIsTorrentDownloading(false);
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
          onClick={handleTorrentDownload}
          disabled={isTorrentDownloading}
        >
          <Magnet className="mr-2 h-4 w-4" />
          {isTorrentDownloading ? "Starting P2P Download..." : "Download via Torrent"}
        </Button>
      )}
    </div>
  );
}
