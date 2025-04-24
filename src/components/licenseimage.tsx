import Image from "next/image";
import { Image as ImageIcon, X } from "lucide-react";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { LicenseImagesStepProps } from "../lib/types";
import { LICENSE_OPTIONS } from "../lib/schemas";

export default function LicenseImagesStep({
  form,
  previewImages,
  previewInputRef,
  handlePreviewUpload,
  removePreviewImage
}: LicenseImagesStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">License & Preview Images</h2>
        <p className="text-muted-foreground">
          Add license information and preview images for your model
        </p>
      </div>
      
      <FormField
        control={form.control}
        name="license"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>License</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-col space-y-1"
              >
                {LICENSE_OPTIONS.map((option) => (
                  <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value={option.value} />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {option.label}
                    </FormLabel>
                  </FormItem>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <div className="space-y-3">
        <FormLabel>Preview Images</FormLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {previewImages.map((image, index) => (
            <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-border">
              <Image
                src={image.preview}
                alt="Preview"
                fill
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => removePreviewImage(index)}
                className="absolute top-2 right-2 bg-background/80 hover:bg-background rounded-full p-1"
              >
                <X size={16} />
              </button>
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
    </div>
  );
}