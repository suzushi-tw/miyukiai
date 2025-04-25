"use client";

import { useState } from "react";
import Image from "next/image";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ComfyMetadata } from "@/utils/getimgmetadata"; // Ensure this path and type are correct

// Define the structure of the image prop, including metadata
interface GalleryImage {
    id: string;
    url: string;
    metadata: ComfyMetadata | null;
    createdAt: Date; // Keep if needed, otherwise optional
}

interface GalleryImageItemProps {
  image: GalleryImage;
  modelName: string;
}

export default function GalleryImageItem({ image, modelName }: GalleryImageItemProps) {
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);

  // Function to safely render metadata values
  const renderMetadataValue = (value: unknown) => {
    if (value === undefined || value === null || value === '') return <span className="text-muted-foreground italic">N/A</span>;
    // Handle potential objects/arrays if necessary, otherwise stringify
    const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return <div className="truncate" title={displayValue}>{displayValue}</div>;
  };

  // Only render the item if the URL is valid
  if (!image.url) {
    return null; // Or a placeholder
  }

  return (
    <>
      {/* Image container - clickable to open modal */}
      <div
        className="aspect-square w-60 h-60 md:w-72 md:h-72 flex-shrink-0 rounded-lg overflow-hidden relative group border cursor-pointer"
        onClick={() => image.metadata && setMetadataDialogOpen(true)} // Open modal on click if metadata exists
        role="button" // Indicate clickability
        tabIndex={0} // Make it focusable
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') image.metadata && setMetadataDialogOpen(true)}} // Allow keyboard activation
      >
        <Image
          src={image.url}
          fill
          alt={`Sample of ${modelName} - ${image.id}`}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 240px, 288px" // Optimize image loading based on container size
          priority={false} // Only the main hero image should usually be priority
        />
        {/* Info icon - also clickable, appears on hover */}
        {image.metadata && (
          <div
            className="absolute top-2 right-2 bg-background/80 hover:bg-background rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 pointer-events-auto z-10" // Ensure it's above the overlay and clickable
            aria-label="Show image metadata"
            onClick={(e) => { e.stopPropagation(); setMetadataDialogOpen(true); }} // Prevent div click, open modal
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setMetadataDialogOpen(true); }}}
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
             <div className="p-6 overflow-y-auto">
                <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl">Image Generation Metadata</DialogTitle>
                <DialogDescription className="text-base">
                    Parameters used to generate this image.
                </DialogDescription>
                </DialogHeader>

                {/* Display Metadata - Ensure selectedMetadata is replaced with image.metadata */}
                <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <CardContent className="pt-6">
                            <h4 className="font-medium text-lg mb-4">Image Info</h4>
                            <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-sm">
                                <div className="font-medium text-muted-foreground">Dimensions</div>
                                {renderMetadataValue(`${image.metadata.width} × ${image.metadata.height}px`)}

                                {image.metadata.bitDepth !== undefined && (
                                <>
                                    <div className="font-medium text-muted-foreground">Bit Depth</div>
                                    {renderMetadataValue(image.metadata.bitDepth)}
                                </>
                                )}

                                {image.metadata.colorType && (
                                <>
                                    <div className="font-medium text-muted-foreground">Color Type</div>
                                    {renderMetadataValue(image.metadata.colorType)}
                                </>
                                )}
                            </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                            <h4 className="font-medium text-lg mb-4">Generation Settings</h4>
                            <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-sm">
                                {image.metadata.model && (
                                <>
                                    <div className="font-medium text-muted-foreground">Model</div>
                                    {renderMetadataValue(image.metadata.model)}
                                </>
                                )}

                                {image.metadata.seed !== undefined && (
                                <>
                                    <div className="font-medium text-muted-foreground">Seed</div>
                                    {renderMetadataValue(image.metadata.seed)}
                                </>
                                )}

                                {image.metadata.steps !== undefined && (
                                <>
                                    <div className="font-medium text-muted-foreground">Steps</div>
                                    {renderMetadataValue(image.metadata.steps)}
                                </>
                                )}

                                {image.metadata.cfg !== undefined && (
                                <>
                                    <div className="font-medium text-muted-foreground">CFG Scale</div>
                                    {renderMetadataValue(image.metadata.cfg)}
                                </>
                                )}

                                {image.metadata.sampler && (
                                <>
                                    <div className="font-medium text-muted-foreground">Sampler</div>
                                    {renderMetadataValue(image.metadata.sampler)}
                                </>
                                )}

                                {image.metadata.scheduler && (
                                <>
                                    <div className="font-medium text-muted-foreground">Scheduler</div>
                                    {renderMetadataValue(image.metadata.scheduler)}
                                </>
                                )}

                                {image.metadata.denoise !== undefined && (
                                <>
                                    <div className="font-medium text-muted-foreground">Denoise</div>
                                    {renderMetadataValue(image.metadata.denoise)}
                                </>
                                )}
                            </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        {image.metadata.positivePrompt && (
                            <Card>
                            <CardContent className="pt-6">
                                <h4 className="font-medium text-lg mb-3">Positive Prompt</h4>
                                <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm max-h-40 overflow-y-auto">
                                {image.metadata.positivePrompt}
                                </div>
                            </CardContent>
                            </Card>
                        )}

                        {image.metadata.negativePrompt && (
                            <Card>
                            <CardContent className="pt-6">
                                <h4 className="font-medium text-lg mb-3">Negative Prompt</h4>
                                <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm max-h-40 overflow-y-auto">
                                {image.metadata.negativePrompt}
                                </div>
                            </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}