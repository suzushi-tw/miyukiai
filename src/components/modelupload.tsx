import { CheckCircle2, Upload, X, RefreshCw } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { ModelUploadStepProps } from "../lib/types";
import { LICENSE_OPTIONS, MODEL_TYPES } from "../lib/schemas";

export default function ModelUploadStep({
  form,
  modelFile,
  modelInputRef,
  isUploading,
  uploadProgress,
  handleModelUpload,
  previewImages,
  isHashing,
  hashProgress
}: ModelUploadStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Upload Model</h2>
        <p className="text-muted-foreground">
          Upload your model file and review your submission
        </p>
      </div>
      
      <div className="space-y-3">
        <FormLabel>Model File</FormLabel>
        <Card className="border-2 border-dashed">
          <CardContent className="pt-6 text-center">
            <div
              className="flex flex-col items-center justify-center space-y-3 py-4 cursor-pointer"
              onClick={() => !isUploading && !isHashing && modelInputRef.current?.click()}
            >
              {!modelFile ? (
                <>
                  {isHashing ? (
                    <div className="w-full space-y-4">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin">
                          <RefreshCw size={24} className="text-muted-foreground" />
                        </div>
                        <p className="font-medium">Checking file...</p>
                      </div>
                      <div className="space-y-2">
                        <Progress value={hashProgress || 0} className="h-2" />
                        <p className="text-xs text-muted-foreground text-center">
                          {hashProgress || 0}% processed
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload size={40} className="text-muted-foreground" />
                      <div className="space-y-1">
                        <p className="font-medium">Click to upload or drag and drop</p>
                        <p className="text-sm text-muted-foreground">
                          Support for .safetensors, .ckpt, .bin, and .pt files
                        </p>
                      </div>
                      <input
                        ref={modelInputRef}
                        type="file"
                        accept=".safetensors,.ckpt,.bin,.pt"
                        onChange={handleModelUpload}
                        className="hidden"
                      />
                    </>
                  )}
                </>
              ) : (
                <div className="w-full space-y-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 size={24} className="text-green-500" />
                    <div className="flex-1 text-left">
                      <p className="font-medium truncate">{modelFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(modelFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    {!isUploading && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (modelInputRef.current) modelInputRef.current.value = '';
                        }}
                      >
                        <X size={16} />
                      </Button>
                    )}
                  </div>
                  {isUploading && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground text-center">
                        {uploadProgress}% uploaded
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Separator />
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Review Submission</h3>
        
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{form.getValues().name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Version</p>
              <p className="font-medium">{form.getValues().version}</p>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Type</p>
            <p className="font-medium">
              {MODEL_TYPES.find(t => t.value === form.getValues().modelType)?.label || form.getValues().modelType}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">License</p>
            <p className="font-medium">
              {LICENSE_OPTIONS.find(l => l.value === form.getValues().license)?.label || "Not specified"}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Tags</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {form.getValues().tags?.split(',').map((tag, i) => (
                <Badge key={i} variant="secondary">
                  {tag.trim()}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Preview Images</p>
            <p className="font-medium">{previewImages.length} image(s)</p>
          </div>
        </div>
      </div>
    </div>
  );
}