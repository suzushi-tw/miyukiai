"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface DownloadButtonProps {
    fileUrl: string;
    fileName: string;
    modelId: string;
    fileSize: string;
}

export default function DownloadButton({ fileUrl, fileName, modelId, fileSize }: DownloadButtonProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    
    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            
            // Track the download count first
            fetch(`/api/incrementdownload?id=${modelId}`, { method: 'POST' })
                .catch(err => console.error("Failed to record download:", err));
            
            // Create a hidden anchor element for download
            const link = document.createElement('a');
            link.href = fileUrl;
            link.setAttribute('download', fileName); // This tells browser to download instead of navigate
            link.style.display = 'none';
            document.body.appendChild(link);
            
            // Trigger click event to start download
            link.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(link);
                setIsDownloading(false);
            }, 100);
            
        } catch (error) {
            console.error('Download failed:', error);
            setIsDownloading(false);
        }
    };

    return (
        <>
            <Button 
                size="lg" 
                className="w-full" 
                onClick={handleDownload}
                disabled={isDownloading}
            >
                <Download className="mr-2 h-5 w-5" /> 
                {isDownloading ? "Starting Download..." : "Download Model"}
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-3">
                {fileSize} • {fileName}
            </p>
        </>
    );
}