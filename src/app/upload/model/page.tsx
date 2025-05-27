"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
import ClearUploadsButton from "@/components/cleaupcache";
import ProgressSteps from "@/components/step";
import ModelUploadStep from "@/components/modelupload";
import LicenseImagesStep from "@/components/licenseimage";
import BasicInfoStep from "@/components/modelinfostep";
import { uploadLargeFileToS3, getIncompleteUploads } from "@/lib/multiuploads";
import { ModelFormSchema, modelFormSchema } from "@/lib/schemas";
import { extractImageMetadata, ComfyMetadata } from "@/utils/getimgmetadata";
import { calculateFileHash } from "@/utils/fileHash";
import { useTorrent } from "@/hooks/use-torrent";

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
    const [id, setid] = useState("");
    const [nsfwStatus, setNsfwStatus] = useState<Record<number, boolean>>({});
    const [triggerSeed, setTriggerSeed] = useState(false); // New state for triggering seeding
    
    // Add states for file hashing
    const [isHashing, setIsHashing] = useState(false);
    const [hashProgress, setHashProgress] = useState(0);
    const [fileHash, setFileHash] = useState<string | null>(null);    // Add torrent seeding states
    const [enableSeeding, setEnableSeeding] = useState(false);
    const [magnetURI, setMagnetURI] = useState<string>("");
    const [uploadedFileUrl, setUploadedFileUrl] = useState<string>("");
    const [infoHash, setInfoHash] = useState<string>("");

    // Remove NSFW model states - we'll use the ElysiaJS API instead
    const [incompleteUploads, setIncompleteUploads] = useState<{
        id: string;
        fileName: string;
        progress: number;
        createdAt: Date;
    }[]>([]);
    const [resumingUpload, setResumingUpload] = useState(false);
    const previewInputRef = useRef<HTMLInputElement>(null);
    const modelInputRef = useRef<HTMLInputElement>(null);

    // Remove effect to load NSFW model - using external API instead

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
            triggerWords: "", // Make sure this field is initialized if used in your schema
        },
    });

    // Optimized step navigation
    const navigateToStep = useCallback((step: number) => {
        setCurrentStep(step);
    }, []);

    const saveBasicInfo = async () => {
        try {
            setIsUploading(true);
            toast.info("Saving basic information...");

            if (previewImages.length > 0) {
                toast.info("Uploading preview images...");
            }

            const formData = form.getValues();

            // Upload preview images if we have any
            const uploadedImageUrls = await Promise.all(
                previewImages.map(async (image, index) => {
                    const imageUrl = await uploadImageDirectly(image.file);
                    return {
                        url: imageUrl,
                        metadata: image.metadata || {},
                        isNsfw: nsfwStatus[index] || false, // Include NSFW status
                    };
                })
            );

            console.log('Creating new model record');
            const response = await fetch('/api/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },                body: JSON.stringify({
                    ...formData,
                    fileUrl: "",
                    fileName: "",
                    fileSize: "0", // Convert to string for consistency
                    images: uploadedImageUrls || [],
                }),
            });

            if (!response.ok) {
                // For debugging - get the actual error message from the server
                const errorText = await response.text();
                console.error(`Server returned error: ${errorText}`);
                throw new Error('Failed to save model to database');
            }

            const data = await response.json();

            if (data && data.id) {
                setid(data.id);
                console.log(`New model created with ID: ${data.id}`);
            } else {
                console.error("No ID returned from create API", data);
                throw new Error("Server did not return a model ID");
            }

            toast.success("Basic information saved!");
            navigateToStep(3);
        } catch (error) {
            console.error("Error saving information:", error);
            toast.error(`Failed to save information: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
        }
    };

    const uploadModelFile = async () => {
        if (!modelFile) {
            toast.error("Please select a model file first");
            return;
        }

        try {
            setIsUploading(true);
            toast.info(`Starting upload of ${modelFile.name}...`);

            const uploadedModelUrl = await uploadLargeFileToS3(modelFile, (progress) => {
                setUploadProgress(progress);
            });
            setUploadedFileUrl(uploadedModelUrl);            const updatePayload: any = {
                id: id,
                fileUrl: uploadedModelUrl,
                fileName: modelFile.name,
                fileSize: modelFile.size.toString(), // Convert to string
                fileHash: fileHash,
            };

            const response = await fetch('/api/updatemodel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Failed to update model in database:", errorText);
                throw new Error('Failed to update model in database');
            }
              toast.success("Model file uploaded and database updated!");

            if (enableSeeding) {
                toast.info("Starting P2P torrent creation...");
                setTriggerSeed(true); 
                // Navigation will be handled by onSeedComplete callback
            } else {
                // If not seeding, navigate immediately
                toast.success("Model published successfully!");
                setid(""); 
                router.push("/dashboard");
                setIsUploading(false);
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setIsUploading(false); 
        }
        // setIsUploading(false) is handled conditionally above or by onSeedComplete
    };

    const onSubmit = async (formData: ModelFormSchema) => {
        if (currentStep === 1) {
            // Basic validation before proceeding
            if (!formData.name || !formData.modelType) {
                toast.error("Please fill in all required fields");
                return;
            }
            navigateToStep(2);
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
    const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
            setIsHashing(true);
            toast.info("Checking if this model has been uploaded before...");
            
            // Calculate file hash
            const hash = await calculateFileHash(file, (progress) => {
                setHashProgress(progress);
            });
            
            // Check if model exists with this hash
            const response = await fetch('/api/check-duplicate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ hash }),
            });
            
            const data = await response.json();
            
            if (data.exists) {
                // Model already exists
                toast.error(`This model has already been uploaded with the name "${data.model?.name || 'Unknown'}"`);
                return;
            }
            
            // Save the hash for later use during upload
            setFileHash(hash);
            setModelFile(file);
            toast.success("File ready for upload");
            
        } catch (error) {
            console.error("Error checking file:", error);
            toast.error("Error checking file. Please try again.");
        } finally {
            setIsHashing(false);
            setHashProgress(0);
            
            // Reset the file input
            if (e.target) e.target.value = '';
        }
    };    // Remove preview image
    const removePreviewImage = (index: number) => {
        const updatedImages = [...previewImages];
        URL.revokeObjectURL(updatedImages[index].preview);
        updatedImages.splice(index, 1);
        setPreviewImages(updatedImages);

        // Also remove the NSFW status for this image and reindex remaining images
        const updatedNsfwStatus: Record<number, boolean> = {};
        Object.entries(nsfwStatus).forEach(([key, value]) => {
            const keyNum = parseInt(key);
            if (keyNum < index) {
                // Keep images before the removed one at the same index
                updatedNsfwStatus[keyNum] = value;
            } else if (keyNum > index) {
                // Shift images after the removed one down by 1
                updatedNsfwStatus[keyNum - 1] = value;
            }
            // Skip the image at the removed index
        });
        setNsfwStatus(updatedNsfwStatus);
    };

    // Reorder preview images function
    const reorderPreviewImages = (reorderedImages: { file: File; preview: string; metadata?: ComfyMetadata }[]) => {
        setPreviewImages(reorderedImages);
        
        // Also reorder NSFW status to match new order
        const newNsfwStatus: Record<number, boolean> = {};
        reorderedImages.forEach((reorderedImage, newIndex) => {
            // Find the original index of this image
            const originalIndex = previewImages.findIndex(
                img => img.file === reorderedImage.file && img.preview === reorderedImage.preview
            );
            if (originalIndex !== -1 && nsfwStatus[originalIndex] !== undefined) {
                newNsfwStatus[newIndex] = nsfwStatus[originalIndex];
            }
        });
        setNsfwStatus(newNsfwStatus);
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

    // Clear model ID when component unmounts
    useEffect(() => {
        return () => {
            // Only clear if upload was completed or explicitly canceled
            // This prevents data loss during page refreshes
            if (!isUploading) {
                console.log("Component unmounting - not clearing modelId because it might be needed for resume");
            }
        };
    }, [isUploading]);

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
                        nsfwStatus={nsfwStatus}
                        setNsfwStatus={setNsfwStatus}
                        // Remove HuggingFace-related props
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
                        isHashing={isHashing}
                        hashProgress={hashProgress}
                        enableSeeding={enableSeeding}
                        onSeedingToggle={setEnableSeeding}
                        magnetURI={magnetURI}                        onTorrentCreated={async (newMagnetURI, newInfoHash) => {
                            setMagnetURI(newMagnetURI);
                            setInfoHash(newInfoHash);
                            console.log("Torrent metadata generated:", { newMagnetURI, newInfoHash });
                            toast.info("Torrent metadata ready. Updating server...");
                            
                            // Update the model with torrent information using dedicated endpoint
                            if (id) {
                                try {
                                    const torrentUpdateResponse = await fetch('/api/update-torrent', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            modelId: id,
                                            magnetURI: newMagnetURI,
                                            infoHash: newInfoHash,
                                        }),
                                    });
                                    
                                    if (!torrentUpdateResponse.ok) {
                                        const errorData = await torrentUpdateResponse.json();
                                        console.error("Failed to update model with torrent info:", errorData);
                                        throw new Error(errorData.error || 'Failed to update model with torrent info');
                                    }
                                    
                                    const torrentData = await torrentUpdateResponse.json();
                                    console.log("Torrent info saved to server:", torrentData);
                                    toast.success("Server updated with torrent info.");
                                } catch (error) {
                                    console.error("Error updating model with torrent info:", error);
                                    toast.error("Failed to save torrent info to server.");
                                    // Don't block the completion process if torrent update fails
                                }
                            } else {
                                console.warn("Model ID not available for torrent info update.");
                                toast.warning("Could not save torrent info to server: Model ID missing.");
                            }
                        }}
                        uploadedFileUrl={uploadedFileUrl}
                        triggerSeed={triggerSeed}
                        onSeedComplete={() => { 
                            toast.success("Model published successfully! P2P sharing is now active.");
                            setTriggerSeed(false); 
                            setIsUploading(false); 
                            setid(""); 
                            setMagnetURI("");
                            setInfoHash("");
                            router.push("/dashboard");
                        }}
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
                        <div className="flex justify-between items-center w-full">
                            <div className="flex">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                <AlertTitle>Incomplete uploads found</AlertTitle>
                            </div>
                            <ClearUploadsButton onCleared={() => setIncompleteUploads([])} />
                        </div>
                        <AlertDescription>
                            <div className="mt-2 space-y-3">
                                {incompleteUploads
                                    .filter(upload => upload.progress > 0 && upload.progress < 100)
                                    .map(upload => (
                                        <div key={upload.id} className="flex items-center justify-between bg-white p-2 rounded-md shadow-sm">
                                            <div>
                                                <p className="font-medium">{upload.fileName}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {upload.progress}% uploaded • Started {new Date(upload.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleResumeUpload(upload.id, upload.fileName)}
                                                    disabled={resumingUpload || isUploading}
                                                >
                                                    {resumingUpload ? "Resuming..." : "Resume"}
                                                </Button>
                                                <ClearUploadsButton
                                                    individual
                                                    uploadId={upload.id}
                                                    onCleared={() => {
                                                        setIncompleteUploads(prev =>
                                                            prev.filter(item => item.id !== upload.id)
                                                        );
                                                    }}
                                                />
                                            </div>
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
                                        onClick={() => navigateToStep(currentStep - 1)}
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