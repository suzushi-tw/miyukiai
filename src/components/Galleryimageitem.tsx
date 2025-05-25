"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Info, Copy, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ComfyMetadata } from "@/utils/getimgmetadata";
import { toast } from "sonner";

// Define the structure of the image prop, including metadata
interface GalleryImage {
    id: string;
    url: string;
    metadata: ComfyMetadata | null;
    createdAt: Date;
}

interface GalleryImageItemProps {
  image: GalleryImage;
  modelName: string;
}

// Separate component for metadata dialog content to improve performance
const MetadataDialogContent = ({ metadata }: { metadata: ComfyMetadata }) => {
  const [copyingPositive, setCopyingPositive] = useState(false);
  const [copyingNegative, setCopyingNegative] = useState(false);
  
  // Function to safely render metadata values
  const renderMetadataValue = (value: unknown) => {
    if (value === undefined || value === null || value === '') return <span className="text-muted-foreground italic">N/A</span>;
    // Handle potential objects/arrays if necessary, otherwise stringify
    const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return <div className="truncate" title={displayValue}>{displayValue}</div>;
  };

  // Handle copying text to clipboard
  const copyToClipboard = async (text: string, isPositive: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      
      // Show success state briefly
      if (isPositive) {
        setCopyingPositive(true);
        setTimeout(() => setCopyingPositive(false), 2000);
      } else {
        setCopyingNegative(true);
        setTimeout(() => setCopyingNegative(false), 2000);
      }

      // Show toast notification
      toast.success(`${isPositive ? "Positive" : "Negative"} prompt copied to clipboard`);
    } catch (err) {
      toast.error("Failed to copy text");
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <ScrollArea className="h-[80vh]">
      <div className="p-6">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl">Image Generation Metadata</DialogTitle>
          <DialogDescription className="text-base">
            Parameters used to generate this image.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-medium text-lg mb-4">Image Info</h4>
                <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-sm">
                  <div className="font-medium text-muted-foreground">Dimensions</div>
                  {renderMetadataValue(`${metadata.width} × ${metadata.height}px`)}

                  {metadata.bitDepth !== undefined && (
                    <>
                      <div className="font-medium text-muted-foreground">Bit Depth</div>
                      {renderMetadataValue(metadata.bitDepth)}
                    </>
                  )}

                  {metadata.colorType && (
                    <>
                      <div className="font-medium text-muted-foreground">Color Type</div>
                      {renderMetadataValue(metadata.colorType)}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h4 className="font-medium text-lg mb-4">Generation Settings</h4>
                <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-sm">
                  {metadata.model && (
                    <>
                      <div className="font-medium text-muted-foreground">Model</div>
                      {renderMetadataValue(metadata.model)}
                    </>
                  )}

                  {metadata.seed !== undefined && (
                    <>
                      <div className="font-medium text-muted-foreground">Seed</div>
                      {renderMetadataValue(metadata.seed)}
                    </>
                  )}

                  {metadata.steps !== undefined && (
                    <>
                      <div className="font-medium text-muted-foreground">Steps</div>
                      {renderMetadataValue(metadata.steps)}
                    </>
                  )}

                  {metadata.cfg !== undefined && (
                    <>
                      <div className="font-medium text-muted-foreground">CFG Scale</div>
                      {renderMetadataValue(metadata.cfg)}
                    </>
                  )}

                  {metadata.sampler && (
                    <>
                      <div className="font-medium text-muted-foreground">Sampler</div>
                      {renderMetadataValue(metadata.sampler)}
                    </>
                  )}

                  {metadata.scheduler && (
                    <>
                      <div className="font-medium text-muted-foreground">Scheduler</div>
                      {renderMetadataValue(metadata.scheduler)}
                    </>
                  )}

                  {metadata.denoise !== undefined && (
                    <>
                      <div className="font-medium text-muted-foreground">Denoise</div>
                      {renderMetadataValue(metadata.denoise)}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {metadata.positivePrompt && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-lg">Positive Prompt</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(metadata.positivePrompt as string, true)}
                      className="h-8 px-2"
                    >
                      {copyingPositive ? (
                        <><CheckCircle2 className="h-4 w-4 mr-1" /> Copied</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-1" /> Copy</>
                      )}
                    </Button>
                  </div>
                  <ScrollArea className="h-40 rounded-md">
                    <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm">
                      {metadata.positivePrompt}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {metadata.negativePrompt && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-lg">Negative Prompt</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(metadata.negativePrompt as string, false)}
                      className="h-8 px-2"
                    >
                      {copyingNegative ? (
                        <><CheckCircle2 className="h-4 w-4 mr-1" /> Copied</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-1" /> Copy</>
                      )}
                    </Button>
                  </div>
                  <ScrollArea className="h-40 rounded-md">
                    <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm">
                      {metadata.negativePrompt}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

export default function GalleryImageItem({ image, modelName }: GalleryImageItemProps) {
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
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
  
  // Memoize the click handler to avoid recreating on every render
  const handleClick = useCallback(() => {
    if (image.metadata) setMetadataDialogOpen(true);
  }, [image.metadata]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (image.metadata) setMetadataDialogOpen(true);
    }
  }, [image.metadata]);
  
  const handleInfoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMetadataDialogOpen(true);
  }, []);
  
  const handleInfoKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
      setMetadataDialogOpen(true);
    }
  }, []);

  // Only render the item if the URL is valid
  if (!image.url) {
    return null; // Or a placeholder
  }

  return (
    <>      {/* Image container - clickable to open modal */}
      <div
        className="aspect-square w-60 h-60 md:w-72 md:h-72 flex-shrink-0 rounded-lg overflow-hidden relative group border cursor-pointer"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Loading state */}
        {imageLoading && !imageError && (
          <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center z-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          </div>
        )}        {/* Error state */}
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
        )}        <Image
          src={image.url}
          fill
          alt={`Sample of ${modelName} - ${image.id}`}
          className={`object-cover transition-all duration-300 group-hover:scale-105 ${
            imageLoading ? 'opacity-0' : 'opacity-100'
          }`}
          sizes="(max-width: 768px) 240px, 288px"
          priority={false}
          onLoad={() => {
            setImageLoading(false);
            setImageError(false); // Clear any previous error state
          }}
          onError={() => {
            setImageLoading(false);
            // Add a slight delay before showing error to handle race conditions
            setTimeout(() => setImageError(true), 100);
          }}
          key={`${image.url}-${retryCount}`} // Force re-render on retry
        />
        {/* Info icon - also clickable, appears on hover */}
        {image.metadata && (
          <div
            className="absolute top-2 right-2 bg-background/80 hover:bg-background rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 pointer-events-auto z-10"
            aria-label="Show image metadata"
            onClick={handleInfoClick}
            role="button"
            tabIndex={0}
            onKeyDown={handleInfoKeyDown}
          >
            <Info size={18} className="text-primary" />
          </div>
        )}
        {/* Subtle overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      </div>

      {/* Metadata Dialog - Rendered conditionally */}
      {image.metadata && (
        <Dialog open={metadataDialogOpen} onOpenChange={setMetadataDialogOpen}>
          <DialogContent className="sm:max-w-[800px] md:max-w-[900px] lg:max-w-[1000px] p-0 max-h-[90vh]">
            {metadataDialogOpen && <MetadataDialogContent metadata={image.metadata} />}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}