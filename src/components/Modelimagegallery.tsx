"use client";

import { useState } from "react";
import Image from "next/image";
import { Info, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ComfyMetadata } from "@/utils/getimgmetadata"; // Assuming this type exists and is correct

// Define the type for the images passed as props
interface ModelImage {
  id: string;
  url: string;
  metadata: ComfyMetadata | null; // Changed 'any' to 'null'
}

interface ModelImageGalleryProps {
  images: ModelImage[];
  modelName: string;
}

// Component for individual image items with loading states
function ImageItem({ image, modelName, onShowMetadata }: {
  image: ModelImage;
  modelName: string;
  onShowMetadata: (image: ModelImage) => void;
}) {
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

  return (
    <div className="aspect-square rounded-lg overflow-hidden relative group border">
      {/* Loading state */}
      {imageLoading && !imageError && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center z-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      )}

      {/* Error state */}
      {imageError && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center z-20 p-4">
          <AlertCircle className="h-6 w-6 text-red-500 mb-1" />
          <p className="text-slate-600 dark:text-slate-400 text-xs text-center mb-1">
            Failed to load
          </p>
          {retryCount < 2 && (
            <button
              onClick={retryImageLoad}
              className="text-xs text-blue-500 hover:text-blue-700 underline"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <Image
        src={image.url}
        fill
        alt={`Sample of ${modelName}`}
        className={`object-cover transition-all duration-300 group-hover:scale-105 ${
          imageLoading ? 'opacity-0' : 'opacity-100'
        }`}
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
      {image.metadata && (
        <button
          type="button"
          onClick={() => onShowMetadata(image)}
          className="absolute top-2 right-2 bg-background/80 hover:bg-background rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Show image metadata"
        >
          <Info size={18} className="text-blue-500" />
        </button>
      )}
      {/* Add a subtle overlay on hover */}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    </div>
  );
}

export default function ModelImageGallery({ images, modelName }: ModelImageGalleryProps) {
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  const [selectedMetadata, setSelectedMetadata] = useState<ComfyMetadata | null>(null);
  // Removed unused selectedImageUrl state

  const showMetadata = (image: ModelImage) => {
    if (image.metadata) {
      setSelectedMetadata(image.metadata);
      // Removed setting selectedImageUrl
      setMetadataDialogOpen(true);
    }
    // Optionally handle cases where metadata is null, e.g., show a message
  };

  // Function to safely render metadata values
  const renderMetadataValue = (value: unknown) => { // Changed 'any' to 'unknown'
    if (value === undefined || value === null || value === '') return <span className="text-muted-foreground italic">N/A</span>;
    return <div className="truncate">{String(value)}</div>;
  };
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {images.map((image) => (
          <ImageItem
            key={image.id}
            image={image}
            modelName={modelName}
            onShowMetadata={showMetadata}
          />
        ))}
      </div>

      {/* Metadata Dialog */}
      <Dialog open={metadataDialogOpen} onOpenChange={setMetadataDialogOpen}>
        <DialogContent className="sm:max-w-[800px] md:max-w-[900px] lg:max-w-[1000px] p-0 max-h-[90vh]">
          <div className="p-6 overflow-y-auto">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl">Image Generation Metadata</DialogTitle>
              <DialogDescription className="text-base">
                Parameters used to generate the selected image.
              </DialogDescription>
            </DialogHeader>

            {selectedMetadata ? (
              <div className="space-y-6">
                {/* Optional: Display the image itself */}
                {/* <div className="mb-4 max-h-64 overflow-hidden rounded-md border">
                  <Image src={selectedImageUrl} alt="Selected image" width={300} height={300} className="object-contain w-full h-full" />
                </div> */}

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-medium text-lg mb-4">Image Info</h4>
                      <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-sm">
                        <div className="font-medium text-muted-foreground">Dimensions</div>
                        {renderMetadataValue(`${selectedMetadata.width} × ${selectedMetadata.height}px`)}

                        {selectedMetadata.bitDepth !== undefined && (
                          <>
                            <div className="font-medium text-muted-foreground">Bit Depth</div>
                            {renderMetadataValue(selectedMetadata.bitDepth)}
                          </>
                        )}

                        {selectedMetadata.colorType && (
                          <>
                            <div className="font-medium text-muted-foreground">Color Type</div>
                            {renderMetadataValue(selectedMetadata.colorType)}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-medium text-lg mb-4">Generation Settings</h4>
                      <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-sm">
                        {selectedMetadata.model && (
                          <>
                            <div className="font-medium text-muted-foreground">Model</div>
                            {renderMetadataValue(selectedMetadata.model)}
                          </>
                        )}

                        {selectedMetadata.seed !== undefined && (
                          <>
                            <div className="font-medium text-muted-foreground">Seed</div>
                            {renderMetadataValue(selectedMetadata.seed)}
                          </>
                        )}

                        {selectedMetadata.steps !== undefined && (
                          <>
                            <div className="font-medium text-muted-foreground">Steps</div>
                            {renderMetadataValue(selectedMetadata.steps)}
                          </>
                        )}

                        {selectedMetadata.cfg !== undefined && (
                          <>
                            <div className="font-medium text-muted-foreground">CFG Scale</div>
                            {renderMetadataValue(selectedMetadata.cfg)}
                          </>
                        )}

                        {selectedMetadata.sampler && (
                          <>
                            <div className="font-medium text-muted-foreground">Sampler</div>
                            {renderMetadataValue(selectedMetadata.sampler)}
                          </>
                        )}

                        {selectedMetadata.scheduler && (
                          <>
                            <div className="font-medium text-muted-foreground">Scheduler</div>
                            {renderMetadataValue(selectedMetadata.scheduler)}
                          </>
                        )}

                        {selectedMetadata.denoise !== undefined && (
                          <>
                            <div className="font-medium text-muted-foreground">Denoise</div>
                            {renderMetadataValue(selectedMetadata.denoise)}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  {selectedMetadata.positivePrompt && (
                    <Card>
                      <CardContent className="pt-6">
                        <h4 className="font-medium text-lg mb-3">Positive Prompt</h4>
                        <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm max-h-40 overflow-y-auto">
                          {selectedMetadata.positivePrompt}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedMetadata.negativePrompt && (
                    <Card>
                      <CardContent className="pt-6">
                        <h4 className="font-medium text-lg mb-3">Negative Prompt</h4>
                        <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm max-h-40 overflow-y-auto">
                          {selectedMetadata.negativePrompt}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No metadata available for this image.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}