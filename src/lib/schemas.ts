import { z } from "zod";

// Form schema with validation
export const modelFormSchema = z.object({
  name: z.string().min(3, {
    message: "Name must be at least 3 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  version: z.string().min(1, {
    message: "Version is required.",
  }),
  modelType: z.string({
    required_error: "Please select a model type.",
  }),
  baseModel: z.string({
    required_error: "Please select a base model.",
  }),
  license: z.string({
    required_error: "Please select a license.",
  }),
  tags: z.string().optional(),
});

export type ModelFormSchema = z.infer<typeof modelFormSchema>;

// Model types for the selection dropdown
export const MODEL_TYPES = [
  { value: "checkpoint", label: "Checkpoint" },
  { value: "lora", label: "LoRA" },
  { value: "textualInversion", label: "Textual Inversion" },
  { value: "controlnet", label: "ControlNet" },
  { value: "vae", label: "VAE" },
];

// License options
export const LICENSE_OPTIONS = [
  { value: "creativeCommons", label: "Creative Commons" },
  { value: "mit", label: "MIT License" },
  { value: "proprietary", label: "Proprietary" },
  { value: "custom", label: "Custom License" },
];