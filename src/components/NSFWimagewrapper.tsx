"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  
  const revealImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealed(true);
  };
  
  // Handle image click when onClick is provided
  const handleImageClick = onClick ? onClick : undefined;
  
  return (
    <div className="relative h-full w-full">
      <Image
        src={imageUrl}
        alt={alt || imageId}
        fill={fill}
        className={`${className} ${isNsfw && !revealed ? 'blur-xl' : ''}`}
        sizes={sizes}
        priority={priority}
        onClick={handleImageClick} // Only pass onClick if it's defined
      />
      
      {isNsfw && !revealed && (
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