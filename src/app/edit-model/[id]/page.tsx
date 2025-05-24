'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Edit, Image as ImageIcon } from 'lucide-react';
import ImageReorderDialog from '@/components/ImageReorderDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { modelFormSchema, ModelFormSchema } from '@/lib/schemas';

interface ModelImage {
  id: string;
  url: string;
  isNsfw: boolean;
  order: number;
}

export default function EditModelPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [modelImages, setModelImages] = useState<ModelImage[]>([]);
  
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
      triggerWords: "", 
    },
  });

  // Extract params on component mount
  useEffect(() => {
    async function extractParams() {
      try {
        const resolvedParams = await params;
        setModelId(resolvedParams.id);
      } catch (err) {
        console.error('Error resolving params:', err);
        setError('Failed to load model ID');
      }
    }
    
    extractParams();
  }, [params]);

  // Fetch model data when modelId is available
  useEffect(() => {
    const fetchModelData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/getmodels?id=${modelId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch model data: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.model) {
          throw new Error('Model not found');
        }

        // Set form values from fetched data
        console.log("Model data from API:", data.model);
        console.log("License:", data.model.license);
        console.log("Base Model:", data.model.baseModel);
        
        // Store images for the image reorder component
        setModelImages(data.model.images || []);
        
        // Use setValue for each field instead of form.reset to ensure proper updates
        form.setValue('name', data.model.name || '');
        form.setValue('description', data.model.description || '');
        form.setValue('version', data.model.version || '1.0');
        form.setValue('modelType', data.model.modelType || '');
        form.setValue('baseModel', data.model.baseModel || 'sd15');
        form.setValue('license', data.model.license || '');
        form.setValue('tags', data.model.tags || '');
        form.setValue('triggerWords', data.model.triggerWords || '');
        
        console.log("Form values after setting:", form.getValues());
      } catch (err) {
        console.error('Error fetching model data:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        toast.error('Failed to load model data');
      } finally {
        setIsLoading(false);
      }
    };

    if (modelId) {
      fetchModelData();
    }
  }, [modelId, form]);

  // Handle form submission
  const onSubmit = async (formData: ModelFormSchema) => {
    if (!modelId) {
      toast.error('Model ID not available');
      return;
    }
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/edit-model', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: modelId,
          ...formData,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update model: ${errorText}`);
      }

      toast.success('Model updated successfully!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error updating model:', error);
      toast.error(`Failed to update model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle image reordering
  const handleImagesReordered = (reorderedImages: ModelImage[]) => {
    setModelImages(reorderedImages);
  };
  
  // This useEffect ensures the selects update if default values don't match any options
  useEffect(() => {
    if (!isLoading) {
      const currentValues = form.getValues();
      
      // Check if license is valid in our options
      const licenseValue = currentValues.license;
      console.log("Current license value:", licenseValue);
      
      // Check if baseModel is valid in our options
      const baseModelValue = currentValues.baseModel;
      console.log("Current baseModel value:", baseModelValue);
    }
  }, [isLoading, form]);

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-12 px-4 sm:px-6 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading model data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-5xl mx-auto py-12 px-4 sm:px-6">
        <div className="text-center text-red-500">
          <p>{error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => router.push('/dashboard')}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Edit Model
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Update your model details and manage images
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Model Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Edit className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Model Information</CardTitle>
                    <CardDescription>
                      Update your model details and metadata
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <CardContent className="space-y-8">
                    {/* Basic Information */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center">
                        Basic Information
                      </h3>
                      
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Model Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter model name" 
                                className="h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              A clear, descriptive name for your model.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe your model..." 
                                className="min-h-[120px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" 
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Provide details about your model, its capabilities, and usage examples.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator className="bg-slate-200 dark:bg-slate-700" />

                    {/* Technical Details */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Technical Details
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="version"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Version</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="1.0" 
                                  className="h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="modelType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Model Type</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <SelectValue placeholder="Select model type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="checkpoint">Checkpoint</SelectItem>
                                  <SelectItem value="lora">LoRA</SelectItem>
                                  <SelectItem value="lycoris">LyCORIS</SelectItem>
                                  <SelectItem value="controlnet">ControlNet</SelectItem>
                                  <SelectItem value="textualinversion">Textual Inversion</SelectItem>
                                  <SelectItem value="vae">VAE</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                The type of model you&apos;re sharing.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="baseModel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Base Model</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <SelectValue placeholder="Select base model" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="sd15">Stable Diffusion 1.5</SelectItem>
                                  <SelectItem value="sdxl">Stable Diffusion XL</SelectItem>
                                  <SelectItem value="sd3">Stable Diffusion 3</SelectItem>
                                  <SelectItem value="lora">LoRA</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                The base model this is built upon.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="license"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">License</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <SelectValue placeholder="Select license" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="creativeml-openrail-m">CreativeML Open RAIL-M</SelectItem>
                                  <SelectItem value="cc-by-4.0">Creative Commons CC-BY 4.0</SelectItem>
                                  <SelectItem value="cc-by-nc-4.0">Creative Commons CC-BY-NC 4.0</SelectItem>
                                  <SelectItem value="cc-by-sa-4.0">Creative Commons CC-BY-SA 4.0</SelectItem>
                                  <SelectItem value="cc-by-nc-sa-4.0">Creative Commons CC-BY-NC-SA 4.0</SelectItem>
                                  <SelectItem value="mit">MIT License</SelectItem>
                                  <SelectItem value="apache">Apache 2.0</SelectItem>
                                  <SelectItem value="gpl">GPL</SelectItem>
                                  <SelectItem value="Illustrious">Illustrious License</SelectItem>
                                  <SelectItem value="Stability AI">Stability AI Community License</SelectItem>
                                  <SelectItem value="custom">Custom License</SelectItem>
                                  <SelectItem value="other">Other (specify in description)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                The license that applies to your model.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator className="bg-slate-200 dark:bg-slate-700" />

                    {/* Additional Information */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Additional Information
                      </h3>
                      
                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Tags</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="art, portrait, realistic, etc." 
                                className="h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Add relevant tags separated by commas.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="triggerWords"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Trigger Words</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Add trigger words for this model" 
                                className="h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Special words to activate this model, separated by commas.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex justify-between pt-6 bg-slate-50 dark:bg-slate-800/50">
                    <Button variant="outline" type="button" onClick={() => router.back()}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving} className="min-w-[120px]">
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </div>          {/* Right Column - Image Management */}
          <div className="lg:col-span-1">
          
            <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <ImageIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Image Management</CardTitle>
                    <CardDescription>
                      Organize and reorder your model images
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    {modelImages.length > 0 
                      ? `${modelImages.length} image${modelImages.length !== 1 ? 's' : ''} uploaded`
                      : 'No images uploaded'
                    }
                  </p>
                  
                  {modelId && (
                    <ImageReorderDialog
                      modelId={modelId}
                      images={modelImages}
                      onImagesReordered={handleImagesReordered}
                      trigger={
                        <Button 
                          variant="outline" 
                          className="w-full"
                          disabled={modelImages.length === 0}
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          {modelImages.length > 0 ? 'Reorder Images' : 'No Images to Reorder'}
                        </Button>
                      }
                    />
                  )}
                </div>
                
                {modelImages.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      Current banner:
                    </div>
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img
                        src={modelImages.find(img => img.order === 0)?.url || modelImages[0]?.url}
                        alt="Current banner"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge className="text-xs">
                          Banner
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
