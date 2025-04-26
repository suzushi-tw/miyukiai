"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ClearUploadsButtonProps {
  individual?: boolean;
  uploadId?: string;
  onCleared?: () => void;
}

export default function ClearUploadsButton({ 
  individual = false, 
  uploadId,
  onCleared 
}: ClearUploadsButtonProps) {
  const clearAllUploads = () => {
    try {
      // Get all active uploads
      const activeUploads = JSON.parse(localStorage.getItem('active-uploads') || '[]');
      
      // Clear each individual upload state
      activeUploads.forEach((id: string) => {
        localStorage.removeItem(`upload-state-${id}`);
      });
      
      // Clear the active uploads list
      localStorage.removeItem('active-uploads');
      
      toast.success("All incomplete uploads cleared");
      
      // Callback or refresh
      if (onCleared) {
        onCleared();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error("Error clearing uploads:", error);
      toast.error("Failed to clear uploads");
    }
  };

  const clearSingleUpload = () => {
    if (!uploadId) return;
    
    try {
      // Remove this specific upload
      localStorage.removeItem(`upload-state-${uploadId}`);
      
      // Update the active uploads list
      const activeUploads = JSON.parse(localStorage.getItem('active-uploads') || '[]');
      const updatedUploads = activeUploads.filter((id: string) => id !== uploadId);
      localStorage.setItem('active-uploads', JSON.stringify(updatedUploads));
      
      toast.success("Upload cleared");
      
      // Callback or refresh
      if (onCleared) {
        onCleared();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error(`Error clearing upload ${uploadId}:`, error);
      toast.error("Failed to clear upload");
    }
  };

  if (individual) {
    return (
      <Button 
        variant="ghost" 
        size="sm"
        onClick={clearSingleUpload}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button 
      variant="destructive" 
      size="sm"
      onClick={clearAllUploads}
    >
      <Trash2 className="h-4 w-4 mr-2" /> Clear All Uploads
    </Button>
  );
}