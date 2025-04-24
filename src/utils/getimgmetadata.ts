import ExifReader from 'exifreader';

// Define types for ComfyUI workflow data
interface ComfyNode {
  inputs: Record<string, unknown>;
  class_type: string;
  _meta?: {
    title?: string;
  };
}

interface KSamplerInputs {
  seed: number;
  steps: number;
  cfg: number;
  sampler_name: string;
  scheduler: string;
  denoise: number;
  model: [string, number];
  positive: [string, number];
  negative: [string, number];
  latent_image: [string, number];
}

interface TextNodeInputs {
  text: string;
  clip: [string, number];
}

interface ModelNodeInputs {
  ckpt_name: string;
}

export interface ComfyMetadata {
  width?: number;
  height?: number;
  bitDepth?: number;
  colorType?: string;
  prompt?: Record<string, ComfyNode>;
  seed?: number;
  steps?: number;
  cfg?: number;
  sampler?: string;
  model?: string;
  positivePrompt?: string;
  negativePrompt?: string;
  scheduler?: string;
  denoise?: number;
  rawWorkflow?: Record<string, ComfyNode>;
}

export async function extractImageMetadata(file: File): Promise<ComfyMetadata> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        if (!e.target?.result) {
          return resolve({});
        }
        
        // Extract EXIF data - ensure we're passing an ArrayBuffer
        const buffer = e.target.result as ArrayBuffer;
        const tags = ExifReader.load(buffer);
        
        const metadata: ComfyMetadata = {
          width: typeof tags.ImageWidth?.value === 'number' ? tags.ImageWidth.value : 
                 typeof tags['Image Width']?.value === 'number' ? tags['Image Width'].value : undefined,
          height: typeof tags.ImageHeight?.value === 'number' ? tags.ImageHeight.value : 
                  typeof tags['Image Height']?.value === 'number' ? tags['Image Height'].value : undefined,
          bitDepth: typeof tags.BitDepth?.value === 'number' ? tags.BitDepth.value : 
                    typeof tags.BitDepth?.value === 'string' ? parseInt(tags.BitDepth.value, 10) : undefined,
          colorType: typeof tags.ColorType?.value === 'string' ? tags.ColorType.value : undefined,
        };
        
        // Look for ComfyUI metadata (commonly stored in various fields)
        let promptData: Record<string, ComfyNode> | null = null;
        
        // Check common locations for metadata
        const metadataFields = ['parameters', 'prompt', 'Comment', 'UserComment', 'Description'];
        for (const field of metadataFields) {
          if (tags[field]?.value) {
            try {
              // Try parsing it as JSON
              const value = tags[field].value.toString();
              if (value.includes('{') && value.includes('}')) {
                promptData = JSON.parse(value) as Record<string, ComfyNode>;
                break;
              }
            } catch (e) {
              console.log(`Failed to parse ${field} as JSON:`, e);
            }
          }
        }
        
        // If we found ComfyUI workflow data
        if (promptData) {
          metadata.rawWorkflow = promptData;
          
          // Extract common parameters from ComfyUI format
          try {
            // Find KSampler node - use type assertion with specific node types
            const kSamplerNodes = Object.entries(promptData)
              .filter(([_id, node]) => node.class_type === 'KSampler') // Fixed unused variable
              .map(([id, node]) => ({
                id,
                node: node as ComfyNode & { inputs: KSamplerInputs }
              }));
              
            if (kSamplerNodes.length > 0) {
              const { node: kSampler } = kSamplerNodes[0];
              metadata.seed = kSampler.inputs.seed;
              metadata.steps = kSampler.inputs.steps;
              metadata.cfg = kSampler.inputs.cfg;
              metadata.sampler = kSampler.inputs.sampler_name;
              metadata.scheduler = kSampler.inputs.scheduler;
              metadata.denoise = kSampler.inputs.denoise;
              
              // Find model
              const modelNodeId = kSampler.inputs.model[0];
              const modelNode = promptData[modelNodeId] as ComfyNode & { inputs: ModelNodeInputs };
              if (modelNode && modelNode.inputs.ckpt_name) {
                metadata.model = modelNode.inputs.ckpt_name;
              }
              
              // Find positive prompt
              const positiveNodeId = kSampler.inputs.positive[0];
              const positiveNode = promptData[positiveNodeId] as ComfyNode & { inputs: TextNodeInputs };
              if (positiveNode && positiveNode.inputs.text) {
                metadata.positivePrompt = positiveNode.inputs.text;
              }
              
              // Find negative prompt
              const negativeNodeId = kSampler.inputs.negative[0];
              const negativeNode = promptData[negativeNodeId] as ComfyNode & { inputs: TextNodeInputs };
              if (negativeNode && negativeNode.inputs.text) {
                metadata.negativePrompt = negativeNode.inputs.text;
              }
            }
          } catch (error) {
            console.error("Error parsing ComfyUI workflow:", error);
          }
        }
        
        resolve(metadata);
      } catch (error) {
        console.error("Error extracting metadata:", error);
        resolve({}); // Return empty object on error rather than failing
      }
    };
    
    reader.onerror = () => reject(new Error("Failed to read file"));
    
    // Read file as array buffer for EXIF extraction
    reader.readAsArrayBuffer(file);
  });
}