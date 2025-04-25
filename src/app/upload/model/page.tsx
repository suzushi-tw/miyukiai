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
import { uploadLargeFileToS3 } from "@/lib/upload";
import { ModelFormSchema, modelFormSchema } from "@/lib/schemas";
import { extractImageMetadata, ComfyMetadata } from "@/utils/getimgmetadata";

// Direct image upload function with presigned URL
const uploadImageDirectly = async (file: File): Promise<string> => {
  try {
    const response = await fetch('/api/s3url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentType: file.type,
        folder: 'previews', // Using 'previews' prefix for model preview images
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get upload URL');
    }

    const { presignedUrl, fileUrl } = await response.json();

    // Upload to S3
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload image');
    }

    return fileUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export default function UploadModelPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [previewImages, setPreviewImages] = useState<{ file: File; preview: string; metadata?: ComfyMetadata }[]>([]);
    const [modelFile, setModelFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [modelId, setModelId] = useState<string | null>(null);
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

    // Save basic info and images after step 2
    const saveBasicInfo = async () => {
        try {
            setIsUploading(true);
            toast.info("Uploading preview images...");

            // Upload preview images using direct upload method
            const uploadedImageUrls = await Promise.all(
                previewImages.map(async (image) => {
                    const imageUrl = await uploadImageDirectly(image.file);
                    // Return both URL and metadata
                    return {
                        url: imageUrl,
                        metadata: image.metadata || {},
                    };
                })
            );

            const formData = form.getValues();

            // Create initial model record with everything except the model file
            const response = await fetch('/api/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    fileUrl: "", // Empty initially
                    fileName: "",
                    fileSize: 0,
                    images: uploadedImageUrls
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save model to database');
            }

            const data = await response.json();
            setModelId(data.id);
            toast.success("Basic information saved!");
            
            // Proceed to next step
            setCurrentStep(3);
        } catch (error) {
            console.error("Error saving basic information:", error);
            toast.error("Failed to save information");
        } finally {
            setIsUploading(false);
        }
    };

    // Handle uploading the model file and updating the database
    const uploadModelFile = async () => {
        if (!modelFile || !modelId) {
            toast.error("Model file or ID not found");
            return;
        }

        try {
            setIsUploading(true);
            toast.info("Uploading model file...");

            // Upload the large model file
            const uploadedModelUrl = await uploadLargeFileToS3(modelFile, (progress) => {
                setUploadProgress(progress);
            });

            // Update the existing record with the model file information
            const response = await fetch(`/api/update-model/${modelId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileUrl: uploadedModelUrl,
                    fileName: modelFile.name,
                    fileSize: modelFile.size,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update model with file data');
            }

            toast.success("Model uploaded successfully!");
            router.push("/dashboard");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload model file");
        } finally {
            setIsUploading(false);
        }
    };

    // Handle form submission based on current step
    const onSubmit = async (formData: ModelFormSchema) => {
        if (currentStep === 1) {
            setCurrentStep(2);
        } else if (currentStep === 2) {
            await saveBasicInfo();
        } else if (currentStep === 3) {
            await uploadModelFile();
        }
    };

    // Handle preview image upload
    const handlePreviewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        try {
            // Process each file with metadata extraction
            const newImagesPromises = Array.from(files).map(async file => {
                // Extract metadata from the image
                const metadata = await extractImageMetadata(file);

                return {
                    file,
                    preview: URL.createObjectURL(file),
                    metadata,
                };
            });

            const newImages = await Promise.all(newImagesPromises);

            setPreviewImages([...previewImages, ...newImages]);
            if (previewInputRef.current) previewInputRef.current.value = '';
        } catch (error) {
            console.error("Error processing images:", error);
            toast.error("Failed to process image metadata");
        }
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
        <div className="container max-w-5xl mx-auto py-12 px-4 sm:px-6">
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
                                        disabled={isUploading}
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
                                                    {currentStep === 1 ? (
                                                        <>
                                                            Next
                                                            <ArrowRight className="ml-2 h-4 w-4" />
                                                        </>
                                                    ) : currentStep === 2 ? (
                                                        isUploading ? (
                                                            "Saving..."
                                                        ) : (
                                                            <>
                                                                Save & Continue
                                                                <ArrowRight className="ml-2 h-4 w-4" />
                                                            </>
                                                        )
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