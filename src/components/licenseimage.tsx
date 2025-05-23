"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Image as ImageIcon, X, Info, AlertCircle, Loader2 } from "lucide-react";

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
import { ComfyMetadata } from "@/utils/getimgmetadata";
import { toast } from "sonner";

// Define response type for NSFW API
interface NsfwApiResponse {
  nsfwScore: number;
  error?: string;
  details?: string;
}

// Define API URL
const NSFW_API_URL = 'https://api.miyukiai.com/analyze';

export interface LicenseImagesStepProps {
  form: any;
  previewImages: { file: File; preview: string; metadata?: ComfyMetadata }[];
  previewInputRef: React.RefObject<HTMLInputElement>;
  handlePreviewUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePreviewImage: (index: number) => void;
  setNsfwStatus: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  nsfwStatus: Record<number, boolean>;
}

export default function LicenseImagesStep({
  form,
  previewImages,
  previewInputRef,
  handlePreviewUpload: originalHandlePreviewUpload,
  removePreviewImage,
  setNsfwStatus,
  nsfwStatus,
}: LicenseImagesStepProps) {
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  const [selectedMetadata, setSelectedMetadata] = useState<ComfyMetadata | null>(null);
  const [revealedImages, setRevealedImages] = useState<Record<number, boolean>>({});
  const [isCheckingNsfw, setIsCheckingNsfw] = useState<Record<number, boolean>>({});
    // Track files using unique identifiers instead of indices
  const checkedImagesRef = useRef<Set<string>>(new Set());
  
  // Add size validation wrapper for the upload handler
  const handlePreviewUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX_SIZE = 6 * 1024 * 1024; // 6MB in bytes
    
    // Filter out files that are too large
    const oversizedFiles = files.filter(file => file.size > MAX_SIZE);
    
    // Show error for oversized files
    if (oversizedFiles.length > 0) {
      oversizedFiles.forEach(file => {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        toast.error(`${file.name} (${sizeMB}MB) exceeds the 6MB limit`);
      });
      
      // Create a new FileList with only valid files
      const validFiles = files.filter(file => file.size <= MAX_SIZE);
      
      // If there are no valid files, reset the input and return
      if (validFiles.length === 0) {
        if (e.target) e.target.value = '';
        return;
      }
      
      // Create a mock event with only valid files
      const dataTransfer = new DataTransfer();
      validFiles.forEach(file => dataTransfer.items.add(file));
      
      const newEvent = {
        ...e,
        target: {
          ...e.target,
          files: dataTransfer.files
        }
      };
      
      // Pass the filtered files to the original handler
      originalHandlePreviewUpload(newEvent as React.ChangeEvent<HTMLInputElement>);
    } else {
      // If all files are valid, proceed normally
      originalHandlePreviewUpload(e);
    }
  };
  
  const licenseOptions = [
    { value: "mit", label: "MIT" },
    { value: "apache", label: "Apache 2.0" },
    { value: "gpl", label: "GPL" },
    { value: "Illustrious", label: "Illustrious License" },
    { value: "Stability AI", label: "Stability AI Community License Agreement" },
    { value: "custom", label: "Custom License" },
  ];
  
  // Generate a unique identifier for a file
  const getFileId = (file: File): string => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  };
  
  // Function to check an image for NSFW content using the ElysiaJS API
  const checkImageForNsfw = useCallback(async (imageFile: File, index: number) => {
    const fileId = getFileId(imageFile);
    
    // Skip if already checking or already checked this specific file
    if (isCheckingNsfw[index] || checkedImagesRef.current.has(fileId)) {
      return;
    }
    
    // Set checking status
    setIsCheckingNsfw(prev => ({ ...prev, [index]: true }));
    
    try {
      console.log(`Checking image ${index} (${fileId}) for NSFW content via API...`);
      
      // Prepare form data for upload
      const formData = new FormData();
      formData.append('image', imageFile);
      
      // Call the ElysiaJS API
      const response = await fetch(NSFW_API_URL, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const result = await response.json() as NsfwApiResponse;
      
      // Check for API error
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Get NSFW score and determine if image is NSFW
      const nsfwScore = result.nsfwScore;
      const isNsfw = nsfwScore > 0.6; // Threshold for NSFW content
      
      console.log(`Image ${index} (${fileId}) NSFW score: ${nsfwScore.toFixed(2)}, Flagged: ${isNsfw}`);
      
      // Update NSFW status
      setNsfwStatus(prev => ({
        ...prev,
        [index]: isNsfw
      }));
      
      // Mark this specific file as checked
      checkedImagesRef.current.add(fileId);
      
    } catch (error) {
      console.error(`Failed to check image ${index} (${fileId}) for NSFW content:`, error);
      toast.error(`Failed to check image ${index + 1} for sensitive content`);
      
      // Default to not NSFW on error
      setNsfwStatus(prev => ({
        ...prev,
        [index]: false
      }));
      
      // Still mark as checked to avoid continuous retries
      checkedImagesRef.current.add(fileId);
    } finally {
      // Clear checking status
      setIsCheckingNsfw(prev => ({ ...prev, [index]: false }));
    }
  }, [isCheckingNsfw, setNsfwStatus]);
  
  // Check images when they're added or changed
  useEffect(() => {
    previewImages.forEach((image, index) => {
      const fileId = getFileId(image.file);
      // Only check if not already checked or checking this specific file
      if (!checkedImagesRef.current.has(fileId) && !isCheckingNsfw[index]) {
        checkImageForNsfw(image.file, index);
      }
    });
  }, [previewImages, checkImageForNsfw, isCheckingNsfw]);
  
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
                className={`object-cover ${isCheckingNsfw[index] ? 'opacity-50' : ''} ${nsfwStatus[index] && !revealedImages[index] ? 'blur-xl' : ''}`}
              />
              
              {/* Loading indicator for NSFW check */}
              {isCheckingNsfw[index] && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
              
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
          ))}          <div 
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
        </div>        <FormDescription>
          Upload sample images created with your model (max 6 MB per image)
        </FormDescription>
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