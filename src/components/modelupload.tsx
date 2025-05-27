import { CheckCircle2, Upload, X, RefreshCw, Share2, Download } from "lucide-react";
import { useState, useCallback, useEffect } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { ModelUploadStepProps } from "../lib/types";
import { LICENSE_OPTIONS, MODEL_TYPES } from "../lib/schemas";
import { useTorrent } from "@/hooks/use-torrent";

// Add torrent seeding props
interface ExtendedModelUploadStepProps extends ModelUploadStepProps {
  enableSeeding: boolean;
  onSeedingToggle: (enabled: boolean) => void;
  magnetURI?: string;
  onTorrentCreated?: (magnetURI: string, infoHash: string) => Promise<void>; // Can be async
  uploadedFileUrl?: string;
  triggerSeed?: boolean; // New prop
  onSeedComplete?: () => void; // New prop
}

export default function ModelUploadStep({
  form,
  modelFile,
  modelInputRef,
  isUploading,
  uploadProgress,
  handleModelUpload,
  previewImages,
  isHashing,
  hashProgress,
  enableSeeding,
  onSeedingToggle,
  magnetURI,
  onTorrentCreated,
  uploadedFileUrl,
  triggerSeed, // Destructure new prop
  onSeedComplete, // Destructure new prop
}: ExtendedModelUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const {
    createTorrent,
    isCreatingTorrent,
    torrentProgress
  } = useTorrent();

  const handleCreateTorrent = useCallback(async () => {
    if (!modelFile) {
      console.error("Model file is not available for torrent creation.");
      return;
    }
    if (!onTorrentCreated) {
      console.error("onTorrentCreated callback is not provided.");
      return;
    }

    const modelNameFromForm = form.getValues().name;
    const modelVersionFromForm = form.getValues().version;

    const torrentOptions = {
      name: modelNameFromForm || modelFile.name,
      comment: `AI Model: ${modelNameFromForm || modelFile.name} v${modelVersionFromForm || 'N/A'}`,
    };

    try {
      const torrentInfo = await createTorrent(modelFile, torrentOptions);
      if (torrentInfo) {
        await onTorrentCreated(torrentInfo.magnetURI, torrentInfo.infoHash);
      }
    } catch (error) {
      console.error("Error creating torrent or calling onTorrentCreated:", error);
      // Optionally, notify the user if the callback doesn't handle it
    }
  }, [modelFile, form, createTorrent, onTorrentCreated]);

  useEffect(() => {
    let isMounted = true;
    if (triggerSeed && uploadedFileUrl) { // Ensure file is uploaded before trying to seed
      if (enableSeeding && modelFile) {
        const initSeeding = async () => {
          try {
            await handleCreateTorrent();
          } catch (error) {
            console.error("Error during automated torrent creation:", error);
          } finally {
            if (isMounted && onSeedComplete) {
              onSeedComplete();
            }
          }
        };
        initSeeding();
      } else if (onSeedComplete) {
        // If seeding is not enabled, or modelFile is missing, but trigger was set,
        // still call onSeedComplete to finalize the upload process.
        if (isMounted) {
          onSeedComplete();
        }
      }
    }
    return () => { isMounted = false; };
  }, [triggerSeed, modelFile, uploadedFileUrl, enableSeeding, handleCreateTorrent, onSeedComplete]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // You can add custom logic here if needed, e.g., to check file types
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      // Indicate that a drop is allowed
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isUploading || isHashing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Pass the first dropped file to the existing handler
      // Assuming handleModelUpload expects an event-like object or can handle a File directly
      // If handleModelUpload expects a ChangeEvent, we might need to adapt this
      // For now, let's assume it can handle a FileList or a single File.
      // We'll simulate a change event for handleModelUpload
      const mockEvent = {
        target: {
          files: e.dataTransfer.files,
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleModelUpload(mockEvent);
      e.dataTransfer.clearData();
    }
  };
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Upload Model</h2>
        <p className="text-muted-foreground">
          Upload your model file and review your submission
        </p>
      </div>

      {/* P2P Seeding Toggle - Show prominently before file selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Enable P2P Sharing</p>
              <p className="text-xs text-muted-foreground">
                Create a torrent to allow peer-to-peer downloads after upload. This helps distribute your model more efficiently.
              </p>
            </div>
            <Switch
              checked={enableSeeding}
              onCheckedChange={onSeedingToggle}
              disabled={isCreatingTorrent || isUploading}
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-3">
        <FormLabel>Model File</FormLabel>
        <Card className={`border-2 border-dashed ${isDragging ? 'border-primary bg-muted/50' : ''}`}>
          <CardContent className="pt-6 text-center">
            <div
              className="flex flex-col items-center justify-center space-y-3 py-4 cursor-pointer"
              onClick={() => !isUploading && !isHashing && modelInputRef.current?.click()}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
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
                </>              ) : (
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
                    )}                  </div>

                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground text-center">
                        {uploadProgress}% uploaded
                      </p>
                      
                      {/* Show seeding status during upload if enabled */}
                      {enableSeeding && (
                        <p className="text-xs text-muted-foreground text-center">
                          P2P sharing will be enabled after upload
                        </p>
                      )}
                    </div>
                  )}

                  {/* Post-upload seeding section - Only show if seeding is enabled and file is uploaded */}
                  {!isUploading && uploadedFileUrl && enableSeeding && (
                    <div className="space-y-4">
                      <Separator />
                      
                      {/* Torrent Creation Progress */}
                      {isCreatingTorrent && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin">
                              <RefreshCw size={16} className="text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium">Creating torrent...</p>
                          </div>
                          <Progress value={torrentProgress} className="h-2" />
                          <p className="text-xs text-muted-foreground text-center">
                            {torrentProgress}% complete
                          </p>
                        </div>
                      )}

                      {/* Magnet Link Display */}
                      {magnetURI && (
                        <Alert>
                          <Share2 size={16} />
                          <AlertDescription className="space-y-2">
                            <p className="font-medium">Torrent created successfully!</p>
                            <div className="p-2 bg-muted rounded text-xs font-mono break-all max-h-20 overflow-y-auto">
                              {magnetURI}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => navigator.clipboard.writeText(magnetURI)}
                                variant="outline"
                                size="sm"
                                className="flex-1"
                              >
                                Copy Magnet Link
                              </Button>
                              <Button
                                onClick={() => {
                                  const blob = new Blob([magnetURI], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${form.getValues().name}.magnet`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                variant="outline"
                                size="sm"
                                className="flex-1"
                              >
                                <Download size={16} className="mr-1" />
                                Download
                              </Button>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
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
              <p className="font-medium">{form.getValues().name || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Version</p>
              <p className="font-medium">{form.getValues().version || 'Not specified'}</p>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Type</p>
            <p className="font-medium">
              {MODEL_TYPES.find(t => t.value === form.getValues().modelType)?.label || 'Not specified'}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">License</p>
            <p className="font-medium">
              {LICENSE_OPTIONS.find(l => l.value === form.getValues().license)?.label || 'Not specified'}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Tags</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {form.getValues().tags?.split(',').filter(tag => tag.trim()).map((tag, i) => (
                <Badge key={i} variant="secondary">
                  {tag.trim()}
                </Badge>
              )) || <span className="text-sm text-muted-foreground">No tags</span>}
            </div>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Preview Images</p>
            <p className="font-medium">{previewImages.length} image(s)</p>
          </div>

          {enableSeeding && (
            <div>
              <p className="text-sm text-muted-foreground">P2P Sharing</p>
              <p className="text-sm font-medium text-green-600">
                {magnetURI ? 'Torrent ready for distribution' : 'Seeding enabled'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}