import { UseFormReturn } from "react-hook-form";
import { RefObject } from "react";
import { ModelFormSchema } from "@/lib/schemas";
import { ComfyMetadata } from "@/utils/getimgmetadata";

// Define a common type for preview images that includes metadata
export type PreviewImageType = {
  file: File;
  preview: string;
  metadata?: ComfyMetadata;
};

export type ModelUploadStepProps = {
  form: UseFormReturn<ModelFormSchema>;
  modelFile: File | null;
  modelInputRef: React.RefObject<HTMLInputElement>;
  isUploading: boolean;
  uploadProgress: number;
  handleModelUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  previewImages: { file: File; preview: string; metadata?: ComfyMetadata }[];
};

export interface LicenseImagesStepProps {
  form: UseFormReturn<ModelFormSchema>;
  previewImages: PreviewImageType[];
  previewInputRef: RefObject<HTMLInputElement>;
  handlePreviewUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePreviewImage: (index: number) => void;
}

export interface LicenseImagesStepProps {
  form: UseFormReturn<ModelFormSchema>;
  previewImages: Array<{ file: File; preview: string; metadata?: ComfyMetadata }>;
  previewInputRef: React.RefObject<HTMLInputElement>;
  handlePreviewUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePreviewImage: (index: number) => void;
  nsfwStatus: Record<number, boolean>; // Add this
  setNsfwStatus: React.Dispatch<React.SetStateAction<Record<number, boolean>>>; // Add this
}

export interface BasicInfoStepProps {
  form: UseFormReturn<ModelFormSchema>;
}