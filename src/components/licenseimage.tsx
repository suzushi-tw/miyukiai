"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Image as ImageIcon, X, Info, AlertCircle } from "lucide-react";
import * as nsfwjs from 'nsfwjs';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { LicenseImagesStepProps } from "../lib/types";
import { ComfyMetadata } from "@/utils/getimgmetadata";

export default function LicenseImagesStep({
  form,
  previewImages,
  previewInputRef,
  handlePreviewUpload,
  removePreviewImage
}: LicenseImagesStepProps) {
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  const [selectedMetadata, setSelectedMetadata] = useState<ComfyMetadata | null>(null);
  // New states for NSFW detection
  const [nsfwModel, setNsfwModel] = useState<any>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [nsfwStatus, setNsfwStatus] = useState<Record<number, boolean>>({});
  const [revealedImages, setRevealedImages] = useState<Record<number, boolean>>({});
  
  const licenseOptions = [
    { value: "mit", label: "MIT" },
    { value: "apache", label: "Apache 2.0" },
    { value: "gpl", label: "GPL" },
    { value: "Illustrious", label: "Illustrious License" },
    { value: "Stability AI", label: "Stability AI Community License Agreement" },
    { value: "custom", label: "Custom License" },
  ];
  
  // Load NSFW detection model
  useEffect(() => {
    async function loadNsfwModel() {
      if (!nsfwModel && !isModelLoading) {
        setIsModelLoading(true);
        try {
          const loadedModel = await nsfwjs.load();
          setNsfwModel(loadedModel);
          console.log("NSFW detection model loaded");
        } catch (error) {
          console.error("Failed to load NSFW detection model:", error);
        } finally {
          setIsModelLoading(false);
        }
      }
    }
    
    loadNsfwModel();
  }, [nsfwModel, isModelLoading]);

  // Function to check if image is NSFW
  const checkImageForNsfw = useCallback(async (imageUrl: string, index: number) => {
    if (!nsfwModel) return;
    
    try {
      // Use the browser's HTMLImageElement, not the Next.js Image component
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
      
      img.onload = async () => {
        // Classify the image
        const predictions = await nsfwModel.classify(img);
        
        // Check for NSFW content
        const pornPrediction = predictions.find((p: any) => p.className === 'Porn');
        const hentaiPrediction = predictions.find((p: any) => p.className === 'Hentai');
        
        const pornProb = pornPrediction ? pornPrediction.probability : 0;
        const hentaiProb = hentaiPrediction ? hentaiPrediction.probability : 0;
        
        // Set NSFW status if either category has high probability
        const isNsfw = pornProb > 0.6 || hentaiProb > 0.6;
        
        setNsfwStatus(prev => ({
          ...prev,
          [index]: isNsfw
        }));
      };
    } catch (error) {
      console.error("Failed to classify image:", error);
    }
  }, [nsfwModel]);
  
  // Check images when they're added or when model is loaded
  useEffect(() => {
    if (nsfwModel && previewImages.length > 0) {
      previewImages.forEach((image, index) => {
        // Only check images that haven't been classified yet
        if (nsfwStatus[index] === undefined) {
          checkImageForNsfw(image.preview, index);
        }
      });
    }
  }, [nsfwModel, previewImages, nsfwStatus, checkImageForNsfw]);
  
  const showMetadata = (index: number) => {
    const metadata = previewImages[index].metadata;
    if (metadata) {
      setSelectedMetadata(metadata);
      setMetadataDialogOpen(true);
    }
  };

  // Function to reveal blurred NSFW image
  const revealImage = (index: number) => {
    setRevealedImages(prev => ({
      ...prev,
      [index]: true
    }));
  };


  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">License & Preview Images</h2>
        <p className="text-muted-foreground">
          Add license information and preview images for your model
        </p>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <FormField
            control={form.control}
            name="license"
            render={({ field }) => (
              <FormItem>
                <FormLabel>License*</FormLabel>
                <Select 
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select license" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-80">
                    {licenseOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  How others can use and share your model
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
      
      <div className="space-y-3 mt-6">
        <FormLabel>Preview Images</FormLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {previewImages.map((image, index) => (
            <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-border group">
              {/* Apply blur filter conditionally */}
              <Image
                src={image.preview}
                alt="Preview"
                fill
                className={`object-cover ${nsfwStatus[index] && !revealedImages[index] ? 'blur-xl' : ''}`}
              />
              
              {/* NSFW overlay */}
              {nsfwStatus[index] && !revealedImages[index] && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-3 text-center">
                  <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                  <p className="text-white text-sm mb-3">Potentially sensitive content</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      revealImage(index);
                    }}
                    className="text-xs bg-background/20 hover:bg-background/40 border-white/40 text-white"
                  >
                    View Anyway
                  </Button>
                </div>
              )}
              
              <div className="absolute top-2 right-2 flex space-x-1">
                {image.metadata && (
                  <button
                    type="button"
                    onClick={() => showMetadata(index)}
                    className="bg-background/80 hover:bg-background rounded-full p-1"
                  >
                    <Info size={16} className="text-blue-500" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removePreviewImage(index)}
                  className="bg-background/80 hover:bg-background rounded-full p-1"
                >
                  <X size={16} />
                </button>
              </div>
              
              {image.metadata && !nsfwStatus[index] && (
                <div className="absolute bottom-0 left-0 right-0 bg-background/80 p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  {image.metadata.model && (
                    <div className="truncate">{image.metadata.model}</div>
                  )}
                  {image.metadata.seed !== undefined && (
                    <div className="truncate">Seed: {image.metadata.seed}</div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div 
            className="border-2 border-dashed border-border rounded-md aspect-square flex flex-col items-center justify-center p-4 hover:bg-accent/50 transition cursor-pointer"
            onClick={() => previewInputRef.current?.click()}
          >
            <ImageIcon size={24} className="text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Add image</span>
            <input
              ref={previewInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePreviewUpload}
              className="hidden"
            />
          </div>
        </div>
        <FormDescription>
          Upload sample images created with your model (max 5 images)
        </FormDescription>
        {isModelLoading && (
          <p className="text-xs text-muted-foreground">Loading content detection model...</p>
        )}
      </div>

      {/* Fixed Metadata Dialog */}
      <Dialog open={metadataDialogOpen} onOpenChange={setMetadataDialogOpen}>
        <DialogContent className="sm:max-w-[800px] md:max-w-[900px] lg:max-w-[1000px] p-0">
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl">Image Generation Metadata</DialogTitle>
              <DialogDescription className="text-base">
                Parameters used to generate this image
              </DialogDescription>
            </DialogHeader>
            
            {selectedMetadata && (
              <div className="space-y-6">
                {/* Two-column layout for desktop, single column for mobile */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-medium text-lg mb-4">Image Info</h4>
                      <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-sm">
                        <div className="font-medium text-muted-foreground">Dimensions</div>
                        <div>{selectedMetadata.width}×{selectedMetadata.height}px</div>
                        
                        {selectedMetadata.bitDepth && (
                          <>
                            <div className="font-medium text-muted-foreground">Bit Depth</div>
                            <div>{selectedMetadata.bitDepth}</div>
                          </>
                        )}
                        
                        {selectedMetadata.colorType && (
                          <>
                            <div className="font-medium text-muted-foreground">Color Type</div>
                            <div>{selectedMetadata.colorType}</div>
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
                            <div className="truncate">{selectedMetadata.model}</div>
                          </>
                        )}
                        
                        {selectedMetadata.seed !== undefined && (
                          <>
                            <div className="font-medium text-muted-foreground">Seed</div>
                            <div>{selectedMetadata.seed}</div>
                          </>
                        )}
                        
                        {selectedMetadata.steps !== undefined && (
                          <>
                            <div className="font-medium text-muted-foreground">Steps</div>
                            <div>{selectedMetadata.steps}</div>
                          </>
                        )}
                        
                        {selectedMetadata.cfg !== undefined && (
                          <>
                            <div className="font-medium text-muted-foreground">CFG Scale</div>
                            <div>{selectedMetadata.cfg}</div>
                          </>
                        )}
                        
                        {selectedMetadata.sampler && (
                          <>
                            <div className="font-medium text-muted-foreground">Sampler</div>
                            <div>{selectedMetadata.sampler}</div>
                          </>
                        )}
                        
                        {selectedMetadata.scheduler && (
                          <>
                            <div className="font-medium text-muted-foreground">Scheduler</div>
                            <div>{selectedMetadata.scheduler}</div>
                          </>
                        )}
                        
                        {selectedMetadata.denoise !== undefined && (
                          <>
                            <div className="font-medium text-muted-foreground">Denoise</div>
                            <div>{selectedMetadata.denoise}</div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Prompt sections */}
                <div className="space-y-6">
                  {selectedMetadata.positivePrompt && (
                    <Card>
                      <CardContent className="pt-6">
                        <h4 className="font-medium text-lg mb-3">Positive Prompt</h4>
                        <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm">
                          {selectedMetadata.positivePrompt}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {selectedMetadata.negativePrompt && (
                    <Card>
                      <CardContent className="pt-6">
                        <h4 className="font-medium text-lg mb-3">Negative Prompt</h4>
                        <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm">
                          {selectedMetadata.negativePrompt}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}