'use client';

import { useState, useEffect, useRef } from 'react';
import { createSwapy } from 'swapy';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { GripVertical, Save, RotateCcw, ImageIcon } from 'lucide-react';

interface ModelImage {
  id: string;
  url: string;
  isNsfw: boolean;
  order: number;
}

interface ImageReorderComponentProps {
  modelId: string;
  images: ModelImage[];
  onImagesReordered: (reorderedImages: ModelImage[]) => void;
}

// Image loading skeleton component
const ImageSkeleton = ({ index }: { index: number }) => (
  <div className="aspect-video relative bg-slate-200 dark:bg-slate-700 animate-pulse flex items-center justify-center">
    <div className="flex flex-col items-center text-slate-400 dark:text-slate-500">
      <ImageIcon className="h-8 w-8 mb-2" />
      <span className="text-xs font-medium">Loading image {index + 1}...</span>
    </div>
  </div>
);

// Individual image item component with loading state
const ImageItem = ({ 
  image, 
  index 
}: { 
  image: ModelImage; 
  index: number; 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <Card
      key={image.id}
      className="relative group overflow-hidden hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing"
      data-swapy-item={image.id}
    >
      <div className="aspect-video relative">
        {/* Loading skeleton */}
        {isLoading && !hasError && (
          <ImageSkeleton index={index} />
        )}
          {/* Error state */}
        {hasError && (
          <div className="aspect-video relative bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
            <div className="flex flex-col items-center text-slate-400 dark:text-slate-500">
              <ImageIcon className="h-8 w-8 mb-2" />
              <span className="text-xs font-medium">Failed to load</span>
              <span className="text-xs text-slate-500 dark:text-slate-600">Image #{index + 1}</span>
            </div>
          </div>
        )}
          {/* Actual image */}
        <Image
          src={image.url}
          alt={`Model image ${index + 1}`}
          fill
          className={`object-cover transition-all duration-500 ease-in-out ${
            isLoading ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
          }`}
          sizes="(max-width: 768px) 100vw, 33vw"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          priority={index < 2} // Prioritize loading the first 2 images
        />
        
        {/* Drag handle - only show when image is loaded */}
        {!isLoading && !hasError && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/50 rounded p-1">
              <GripVertical className="h-4 w-4 text-white" />
            </div>
          </div>
        )}
        
        {/* Order badge */}
        <div className="absolute top-2 left-2">
          <Badge variant={index === 0 ? 'default' : 'secondary'} className="text-xs">
            {index === 0 ? 'Banner' : `#${index + 1}`}
          </Badge>
        </div>
        
        {/* NSFW badge */}
        {image.isNsfw && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="destructive" className="text-xs">
              NSFW
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
};

export default function ImageReorderComponent({
  modelId,
  images,
  onImagesReordered,
}: ImageReorderComponentProps) {
  const [currentImages, setCurrentImages] = useState<ModelImage[]>(images);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const swapyRef = useRef<any>(null);  // Initialize Swapy on mount and when images change
  useEffect(() => {
    if (containerRef.current && currentImages.length > 0) {
      // Destroy existing Swapy instance
      if (swapyRef.current) {
        swapyRef.current.destroy();
      }

      // Add a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (containerRef.current) {
          // Create new Swapy instance
          swapyRef.current = createSwapy(containerRef.current, {
            animation: 'dynamic',
            swapMode: 'hover',
            autoScrollOnDrag: true,
          });

          // Handle swap events
          swapyRef.current.onSwap((event: any) => {
            const { fromIndex, toIndex } = event.data;
            
            if (fromIndex !== toIndex) {
              const newImages = [...currentImages];
              const [movedImage] = newImages.splice(fromIndex, 1);
              newImages.splice(toIndex, 0, movedImage);
              
              // Update order values based on new positions
              const reorderedImages = newImages.map((img, index) => ({
                ...img,
                order: index,
              }));
              
              setCurrentImages(reorderedImages);
              setHasChanges(true);
            }
          });
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        if (swapyRef.current) {
          swapyRef.current.destroy();
        }
      };
    }

    return () => {
      if (swapyRef.current) {
        swapyRef.current.destroy();
      }
    };
  }, [currentImages.length]); // Only depend on length to avoid recreating on every state change

  // Save the new order to the backend
  const handleSaveOrder = async () => {
    setIsSaving(true);
    try {
      const imageOrders = currentImages.map((img, index) => ({
        imageId: img.id,
        order: index,
      }));

      const response = await fetch('/api/update-image-order', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId,
          imageOrders,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update image order');
      }

      setHasChanges(false);
      onImagesReordered(currentImages);
      toast.success('Image order updated successfully!');
    } catch (error) {
      console.error('Error saving image order:', error);
      toast.error('Failed to save image order');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to original order
  const handleReset = () => {
    const sortedImages = [...images].sort((a, b) => a.order - b.order);
    setCurrentImages(sortedImages);
    setHasChanges(false);
  };

  if (currentImages.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <p>No images uploaded for this model.</p>
      </Card>
    );
  }

  return (    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Drag to reorder. First image becomes the banner.
          </p>
        </div>
        
        {hasChanges && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleSaveOrder}
              disabled={isSaving}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>      <div
        ref={containerRef}
        className="grid grid-cols-1 gap-3"
        data-swapy-container
      >
        {currentImages.map((image, index) => (
          <ImageItem 
            key={image.id}
            image={image}
            index={index}
          />
        ))}
      </div>
      
      {hasChanges && (
        <Card className="p-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            You have unsaved changes to the image order. Remember to save your changes.
          </p>
        </Card>
      )}
    </div>
  );
}
