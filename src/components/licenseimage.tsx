"use client";

import { useState } from "react";
import Image from "next/image";
import { Image as ImageIcon, X, Info } from "lucide-react";

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
  
  const licenseOptions = [
    { value: "mit", label: "MIT" },
    { value: "apache", label: "Apache 2.0" },
    { value: "gpl", label: "GPL" },
    { value: "Illustrious", label: "Illustrious License" },
    { value: "Stability AI", label: "Stability AI Community License Agreement" },
    { value: "custom", label: "Custom License" },
  ];
  
  const showMetadata = (index: number) => {
    const metadata = previewImages[index].metadata;
    if (metadata) {
      setSelectedMetadata(metadata);
      setMetadataDialogOpen(true);
    }
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
              <Image
                src={image.preview}
                alt="Preview"
                fill
                className="object-cover"
              />
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
              
              {image.metadata && (
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