"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import ProgressSteps from "@/components/step";
import ModelUploadStep from "@/components/modelupload";
import LicenseImagesStep from "@/components/licenseimage";
import BasicInfoStep from "@/components/modelinfostep";
import { uploadFileToS3 } from "@/lib/upload";
import { ModelFormSchema, modelFormSchema } from "@/lib/schemas";

export default function UploadModelPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [previewImages, setPreviewImages] = useState<{ file: File; preview: string }[]>([]);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const previewInputRef = useRef<HTMLInputElement>(null!) as React.RefObject<HTMLInputElement>;
  const modelInputRef = useRef<HTMLInputElement>(null!) as React.RefObject<HTMLInputElement>;

  // Initialize form
  const form = useForm<ModelFormSchema>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: {
      name: "",
      description: "",
      version: "1.0",
      modelType: "",
      baseModel: "sd15",
      license: "",
      tags: "",
    },
  });

  // Handle form submission
  const onSubmit = async (formData: ModelFormSchema) => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      return;
    }

    if (!modelFile) {
      toast.error("Please upload a model file");
      return;
    }

    try {
      setIsUploading(true);
      
      // Upload preview images
      const uploadedImageUrls = await Promise.all(
        previewImages.map(async (image) => {
          const imageUrl = await uploadFileToS3(image.file);
          return imageUrl;
        })
      );
      
      // Upload model file
      const uploadedModelUrl = await uploadFileToS3(modelFile, (progress) => {
        setUploadProgress(progress);
      });
      
      // Here you would save the model metadata to your database
      // This would include the form values, image URLs, and model URL
      console.log("Upload complete:", {
        formData,
        imageUrls: uploadedImageUrls,
        modelUrl: uploadedModelUrl
      });
      
      toast.success("Model uploaded successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload model");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle preview image upload
  const handlePreviewUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newImages = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    
    setPreviewImages([...previewImages, ...newImages]);
    if (previewInputRef.current) previewInputRef.current.value = '';
  };
  
  // Handle model file upload
  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setModelFile(file);
  };
  
  // Remove preview image
  const removePreviewImage = (index: number) => {
    const updatedImages = [...previewImages];
    URL.revokeObjectURL(updatedImages[index].preview);
    updatedImages.splice(index, 1);
    setPreviewImages(updatedImages);
  };

  // Get step content based on current step
  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep 
            form={form} 
          />
        );
        
      case 2:
        return (
          <LicenseImagesStep 
            form={form} 
            previewImages={previewImages}
            previewInputRef={previewInputRef}
            handlePreviewUpload={handlePreviewUpload}
            removePreviewImage={removePreviewImage}
          />
        );
        
      case 3:
        return (
          <ModelUploadStep 
            form={form} 
            modelFile={modelFile}
            modelInputRef={modelInputRef}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            handleModelUpload={handleModelUpload}
            previewImages={previewImages}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="container max-w-3xl mx-auto py-12 px-4 sm:px-6">
      <Button
        variant="ghost"
        className="mb-8"
        onClick={() => router.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Upload Model</h1>
          <p className="text-muted-foreground mt-2">Share your AI model with the community</p>
        </div>
        
        {/* Progress indicator */}
        <ProgressSteps currentStep={currentStep} />
        
        <div className="bg-card border rounded-lg shadow-sm p-6 sm:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {getStepContent()}
              
              <div className="flex justify-between mt-8 pt-4 border-t">
                {currentStep > 1 ? (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                ) : (
                  <div></div>
                )}
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button 
                          type="submit" 
                          disabled={
                            isUploading || 
                            (currentStep === 3 && !modelFile)
                          }
                        >
                          {currentStep < 3 ? (
                            <>
                              Next
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          ) : isUploading ? (
                            "Uploading..."
                          ) : (
                            <>
                              Publish Model
                              <Upload className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {currentStep === 3 && !modelFile 
                        ? "Please upload a model file to continue" 
                        : ""}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}