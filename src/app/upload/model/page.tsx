"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Upload, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import ProgressSteps from "@/components/step";
import ModelUploadStep from "@/components/modelupload";
import LicenseImagesStep from "@/components/licenseimage";
import BasicInfoStep from "@/components/modelinfostep";
import { uploadLargeFileToS3, getIncompleteUploads } from "@/lib/multiuploads";
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
    const [incompleteUploads, setIncompleteUploads] = useState<{
        id: string;
        fileName: string;
        progress: number;
        createdAt: Date;
    }[]>([]);
    const [resumingUpload, setResumingUpload] = useState(false);
    const previewInputRef = useRef<HTMLInputElement>(null);
    const modelInputRef = useRef<HTMLInputElement>(null);

    // Check for incomplete uploads when component mounts
    useEffect(() => {
        const checkIncompleteUploads = async () => {
            try {
                const uploads = await getIncompleteUploads();
                setIncompleteUploads(uploads);
            } catch (error) {
                console.error("Error fetching incomplete uploads:", error);
            }
        };

        checkIncompleteUploads();
    }, []);

    // Log state changes for debugging
    useEffect(() => {
        console.log(`State updated - modelId: ${modelId}, modelFile: ${modelFile?.name || 'none'}, step: ${currentStep}`);
    }, [modelId, modelFile, currentStep]);

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

    // ------- Form Submission Logic -------

    // Core function to create model in database
    const createModelRecord = async (fileInfo?: { url: string, name: string, size: number }) => {
        try {
            const formData = form.getValues();

            // Upload preview images if we have any
            const uploadedImageUrls = await Promise.all(
                previewImages.map(async (image) => {
                    const imageUrl = await uploadImageDirectly(image.file);
                    return {
                        url: imageUrl,
                        metadata: image.metadata || {},
                    };
                })
            );

            // Create initial model record
            const response = await fetch('/api/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    fileUrl: fileInfo?.url || "",
                    fileName: fileInfo?.name || "",
                    fileSize: fileInfo?.size || 0,
                    images: uploadedImageUrls,
                    status: fileInfo ? "published" : "draft"
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save model to database');
            }

            const data = await response.json();
            setModelId(data.id);
            return data.id;
        } catch (error) {
            console.error("Error creating model record:", error);
            throw error;
        }
    };

    // Save basic info and images (Step 1 -> 2)
    const saveBasicInfo = async () => {
        try {
            setIsUploading(true);
            toast.info("Saving basic information...");

            // Only create model record if we have images to save
            if (previewImages.length > 0) {
                toast.info("Uploading preview images...");
                const newModelId = await createModelRecord();
                toast.success("Basic information and images saved!");
            }

            // Proceed to next step
            setCurrentStep(3);
        } catch (error) {
            console.error("Error saving information:", error);
            toast.error(`Failed to save information: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
        }
    };

    // Upload the model file and update the database (Step 3)
    const uploadModelFile = async () => {
        if (!modelFile) {
            toast.error("Please select a model file first");
            return;
        }

        try {
            setIsUploading(true);
            toast.info(`Starting upload of ${modelFile.name}...`);

            // If we don't have a model ID yet, create one first with complete data
            if (!modelId) {
                toast.info("Creating model record...");

                // First upload the model file
                const uploadedModelUrl = await uploadLargeFileToS3(modelFile, (progress) => {
                    setUploadProgress(progress);
                });

                // Then create the model record with everything
                await createModelRecord({
                    url: uploadedModelUrl,
                    name: modelFile.name,
                    size: modelFile.size
                });

                toast.success("Model uploaded and published successfully!");
                router.push("/dashboard");
                return;
            }

            // We already have a model ID, so just upload the file and update the record
            toast.info(`Uploading ${modelFile.name}...`);
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
                    status: "published" // Mark as published
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update model with file data');
            }

            toast.success("Model uploaded and published successfully!");
            router.push("/dashboard");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
        }
    };

    // Handle form submission based on current step
    const onSubmit = async (formData: ModelFormSchema) => {
        if (currentStep === 1) {
            // Basic validation before proceeding
            if (!formData.name || !formData.modelType) {
                toast.error("Please fill in all required fields");
                return;
            }
            setCurrentStep(2);
        } else if (currentStep === 2) {
            await saveBasicInfo();
        } else if (currentStep === 3) {
            await uploadModelFile();
        }
    };

    // ------- File Handling Logic -------

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

            // Reset the file input
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

        // Reset the file input
        if (e.target) e.target.value = '';
    };

    // Remove preview image
    const removePreviewImage = (index: number) => {
        const updatedImages = [...previewImages];
        URL.revokeObjectURL(updatedImages[index].preview);
        updatedImages.splice(index, 1);
        setPreviewImages(updatedImages);
    };

    // ------- Resume Upload Logic -------

    // Handle resuming an upload
    const handleResumeUpload = (uploadId: string, fileName: string) => {
        setResumingUpload(true);

        // Guide user to select the file
        toast.info(`Please select the file "${fileName}" to resume upload`);
        modelInputRef.current?.click();

        // Store original handler
        const originalHandler = modelInputRef.current?.onchange;

        // Replace with resume-specific handler
        if (modelInputRef.current) {
            modelInputRef.current.onchange = (e: Event) => {
                const target = e.target as HTMLInputElement;
                const files = target.files;

                if (files && files[0]) {
                    // Verify it's the correct file
                    if (files[0].name === fileName) {
                        setModelFile(files[0]);
                        toast.info(`Resuming upload of ${fileName}...`);

                        // Set form defaults for resumed uploads
                        if (!form.getValues().name) {
                            const modelName = fileName.split('.')[0] || "Resumed Model";
                            form.setValue("name", modelName);
                            form.setValue("description", "Resumed upload - please update description");
                            form.setValue("modelType", "Checkpoint");
                            form.setValue("baseModel", "sd15");
                        }

                        // Create model record if needed
                        const resumeProcess = async () => {
                            setIsUploading(true);
                            try {
                                let modelRecordId = modelId;

                                // Create model record if we don't have one
                                if (!modelRecordId) {
                                    const formData = form.getValues();
                                    const response = await fetch('/api/create', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            ...formData,
                                            fileUrl: "",
                                            fileName: files[0].name,
                                            fileSize: files[0].size,
                                            images: []
                                        }),
                                    });

                                    if (!response.ok) {
                                        throw new Error("Failed to create model entry");
                                    }

                                    const data = await response.json();
                                    modelRecordId = data.id;
                                    setModelId(modelRecordId);
                                }

                                // Resume the upload
                                setCurrentStep(3);
                                const fileUrl = await uploadLargeFileToS3(
                                    files[0],
                                    setUploadProgress,
                                    uploadId
                                );

                                // Update model with file info
                                const updateResponse = await fetch(`/api/update-model/${modelRecordId}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        fileUrl: fileUrl,
                                        fileName: files[0].name,
                                        fileSize: files[0].size,
                                        status: "published"
                                    }),
                                });

                                if (!updateResponse.ok) {
                                    throw new Error("Failed to update model");
                                }

                                toast.success("Upload successfully completed!");
                                router.push("/dashboard");
                            } catch (error) {
                                console.error("Resume error:", error);
                                toast.error(`Resume failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                            } finally {
                                setIsUploading(false);
                                setResumingUpload(false);

                                // Restore original handler
                                if (modelInputRef.current && originalHandler) {
                                    modelInputRef.current.onchange = originalHandler as any;
                                }
                            }
                        };

                        resumeProcess();
                    } else {
                        toast.error("Selected file doesn't match the incomplete upload");
                        setResumingUpload(false);

                        // Restore original handler
                        if (modelInputRef.current && originalHandler) {
                            modelInputRef.current.onchange = originalHandler as any;
                        }
                    }
                } else {
                    setResumingUpload(false);

                    // Restore original handler
                    if (modelInputRef.current && originalHandler) {
                        modelInputRef.current.onchange = originalHandler as any;
                    }
                }
            };
        }
    };

    // ------- UI Rendering Logic -------

    // Get step content based on current step
    const getStepContent = () => {
        switch (currentStep) {
            case 1:
                return <BasicInfoStep form={form} />;

            case 2:
                return (
                    <LicenseImagesStep
                        form={form}
                        previewImages={previewImages}
                        previewInputRef={previewInputRef as React.RefObject<HTMLInputElement>}
                        handlePreviewUpload={handlePreviewUpload}
                        removePreviewImage={removePreviewImage}
                    />
                );

            case 3:
                return (
                    <ModelUploadStep
                        form={form}
                        modelFile={modelFile}
                        modelInputRef={modelInputRef as React.RefObject<HTMLInputElement>}
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

                {/* Show incomplete uploads if any exist */}
                {incompleteUploads.length > 0 && (
                    <Alert className="bg-amber-50 border-amber-200">
                        <RefreshCw className="h-4 w-4" />
                        <AlertTitle>Incomplete uploads found</AlertTitle>
                        <AlertDescription>
                            <div className="mt-2 space-y-3">
                                {incompleteUploads.map(upload => (
                                    <div key={upload.id} className="flex items-center justify-between bg-white p-2 rounded-md shadow-sm">
                                        <div>
                                            <p className="font-medium">{upload.fileName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {upload.progress}% uploaded • Started {new Date(upload.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleResumeUpload(upload.id, upload.fileName)}
                                            disabled={resumingUpload || isUploading}
                                        >
                                            {resumingUpload ? "Resuming..." : "Resume upload"}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

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
                                        disabled={isUploading || resumingUpload}
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
                                                        resumingUpload ||
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
                                                                Next Step
                                                                <ArrowRight className="ml-2 h-4 w-4" />
                                                            </>
                                                        )
                                                    ) : isUploading ? (
                                                        `Uploading (${uploadProgress}%)...`
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

            {/* Hidden input for file uploads */}
            <input
                type="file"
                style={{ display: 'none' }}
                ref={modelInputRef}
                onChange={handleModelUpload}
                accept=".safetensors,.ckpt,.pt,.bin"
            />
        </div>
    );
}