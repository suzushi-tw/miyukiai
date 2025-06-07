"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNsfwStore } from "@/utils/nsfwstate";

interface NsfwImageWrapperProps {
  imageUrl: string;
  imageId: string;
  isNsfw: boolean;
  className?: string;
  alt?: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  onClick?: () => void; // Make it optional
}

export default function NsfwImageWrapper({
  imageUrl,
  imageId,
  isNsfw,
  className = "",
  alt = "",
  fill = true,
  sizes,
  priority = false,
  onClick
}: NsfwImageWrapperProps) {
  const [revealed, setRevealed] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Get global NSFW setting
  const { showNsfwContent } = useNsfwStore();
  
  const revealImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealed(true);
  };

  // Reset states when image URL changes
  const resetImageStates = () => {
    setImageLoading(true);
    setImageError(false);
    setRetryCount(0);
  };

  // Retry loading the image
  const retryImageLoad = () => {
    if (retryCount < 2) { // Allow up to 2 retries
      resetImageStates();
      setRetryCount(prev => prev + 1);
    }
  };
  
  // Handle image click when onClick is provided
  const handleImageClick = onClick ? onClick : undefined;

  // Determine if NSFW content should be shown
  const shouldShowNsfw = showNsfwContent || revealed || !isNsfw;

  return (
    <div className="relative h-full w-full">
      {/* Loading state */}
      {imageLoading && !imageError && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center z-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      )}

      {/* Error state */}
      {imageError && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center z-20 p-4">
          <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
          <p className="text-slate-600 dark:text-slate-400 text-sm text-center mb-2">
            Failed to load image
          </p>
          {retryCount < 2 && (
            <button
              onClick={retryImageLoad}
              className="text-xs text-blue-500 hover:text-blue-700 underline"
            >
              Retry ({retryCount}/2)
            </button>
          )}
        </div>
      )}

      <Image
        src={imageUrl}
        alt={alt || imageId}
        fill={fill}
        className={`${className} ${isNsfw && !shouldShowNsfw ? 'blur-xl' : ''} ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        sizes={sizes}
        priority={priority}
        onClick={handleImageClick}
        onLoad={() => {
          setImageLoading(false);
          setImageError(false); // Clear any previous error state
        }}
        onError={() => {
          setImageLoading(false);
          // Add a slight delay before showing error to handle race conditions
          setTimeout(() => setImageError(true), 100);
        }}
        key={`${imageUrl}-${retryCount}`} // Force re-render on retry
      />
      
      {isNsfw && !shouldShowNsfw && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-3 text-center z-10">
          <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
          <p className="text-white text-sm mb-3">Potentially sensitive content</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={revealImage}
            className="text-xs bg-background/20 hover:bg-background/40 border-white/40 text-white"
          >
            View Anyway
          </Button>
        </div>
      )}
    </div>
  );
}