import { UseFormReturn } from "react-hook-form";
import { ModelFormSchema } from "./schemas";

export interface StepProps {
  form: UseFormReturn<ModelFormSchema>;
}

export interface LicenseImagesStepProps extends StepProps {
  previewImages: { file: File; preview: string }[];
  previewInputRef: React.RefObject<HTMLInputElement>;
  handlePreviewUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePreviewImage: (index: number) => void;
}

export interface ModelUploadStepProps extends StepProps {
  modelFile: File | null;
  modelInputRef: React.RefObject<HTMLInputElement>;
  isUploading: boolean;
  uploadProgress: number;
  handleModelUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  previewImages: { file: File; preview: string }[];
}