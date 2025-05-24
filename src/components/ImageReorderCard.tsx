'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createSwapy } from 'swapy';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  ArrowUpDown,
  GripVertical,
  ImageIcon,
  Loader2,
  RotateCcw,
  Save,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ModelImage {
  id: string;
  url: string;
  isNsfw: boolean;
  order: number;
}

interface ImageReorderCardProps {
  modelId: string;
  images: ModelImage[];
  onImagesReordered: (reorderedImages: ModelImage[]) => void;
}

// Individual image item component
const ImageItem = ({ 
  image, 
  index 
}: { 
  image: ModelImage; 
  index: number 
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative group overflow-hidden rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="aspect-square relative w-full">
        {/* Loading state */}
        {imageLoading && !imageError && (
          <div className="aspect-square bg-slate-200 dark:bg-slate-700 animate-pulse flex items-center justify-center rounded-lg">
            <ImageIcon className="h-8 w-8 text-slate-400" />
          </div>
        )}

        {/* Error state */}
        {imageError && (
          <div className="aspect-square bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
            <div className="flex flex-col items-center text-slate-400">
              <ImageIcon className="h-8 w-8 mb-2" />
              <span className="text-xs">Failed to load</span>
            </div>
          </div>
        )}

        {/* Actual image */}
        {!imageError && (
          <Image
            src={image.url}
            alt={`Model image ${index + 1}`}
            fill
            className={`object-cover rounded-lg transition-opacity duration-300 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
            priority={index < 4}
          />
        )}

        {/* Drag handle */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-black/70 backdrop-blur-sm rounded-md p-1.5">
            <GripVertical className="h-4 w-4 text-white" />
          </div>
        </div>

        {/* Order badge */}
        <div className="absolute top-2 left-2">
          <Badge 
            variant={index === 0 ? 'default' : 'secondary'} 
            className="text-xs font-medium"
          >
            {index === 0 ? 'Cover' : `#${index + 1}`}
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
    </div>
  );
};

export default function ImageReorderCard({
  modelId,
  images,
  onImagesReordered
}: ImageReorderCardProps) {
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const swapyRef = useRef<any>(null);
  
  // Sort images by order for consistent rendering
  const sortedImages = [...images].sort((a, b) => a.order - b.order);
  
  // Initialize Swapy once when component mounts - following the documentation example
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous instance
    if (swapyRef.current) {
      swapyRef.current.destroy();
    }

    try {
      swapyRef.current = createSwapy(containerRef.current, {
        animation: 'dynamic',
      });

      swapyRef.current.onSwap((event: any) => {
        console.log('Swap event:', event);
        setHasChanges(true);
      });

    } catch (error) {
      console.error('Failed to initialize Swapy:', error);
    }

    return () => {
      if (swapyRef.current) {
        swapyRef.current.destroy();
        swapyRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once

  const handleSaveOrder = async () => {
    if (!hasChanges || !swapyRef.current) return;

    setIsSaving(true);
    try {
      // Get current slot-item mapping from Swapy
      const slotItemMap = swapyRef.current.slotItemMap();
      console.log('Current slot-item map:', slotItemMap);
      
      // Create image orders array based on current DOM order
      const imageOrders: { imageId: string; order: number }[] = [];
      
      // Extract order from the DOM
      const container = containerRef.current;
      if (container) {
        const slots = container.querySelectorAll('[data-swapy-slot]');
        slots.forEach((slot, index) => {
          const item = slot.querySelector('[data-swapy-item]');
          if (item) {
            const itemId = item.getAttribute('data-swapy-item');
            if (itemId) {
              const imageId = itemId.replace('item-', '');
              imageOrders.push({ imageId, order: index });
            }
          }
        });
      }

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

      // Create reordered images array based on new order
      const reorderedImages = imageOrders
        .sort((a, b) => a.order - b.order)
        .map((orderItem) => {
          const image = images.find(img => img.id === orderItem.imageId)!;
          return {
            ...image,
            order: orderItem.order,
          };
        });

      setHasChanges(false);
      onImagesReordered(reorderedImages);
      toast.success('Image order updated successfully!');
    } catch (error) {
      console.error('Error saving image order:', error);
      toast.error('Failed to save image order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (swapyRef.current) {
      swapyRef.current.destroy();
      
      // Reinitialize with original order
      setTimeout(() => {
        if (containerRef.current) {
          swapyRef.current = createSwapy(containerRef.current, {
            animation: 'dynamic',
          });
          
          swapyRef.current.onSwap((event: any) => {
            console.log('Swap event:', event);
            setHasChanges(true);
          });
        }
      }, 0);
    }
    setHasChanges(false);
  };

  // Empty state
  if (images.length === 0) {
    return (
      <Card className="shadow-lg bg-white/95 dark:bg-slate-900/95">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
              <ImageIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle>Image Management</CardTitle>
              <CardDescription>Manage and reorder your model images</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>No images uploaded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg bg-white/95 dark:bg-slate-900/95">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
              <ArrowUpDown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle>Image Order</CardTitle>
              <CardDescription>
                Drag and drop to reorder images. First image will be the cover.
              </CardDescription>
            </div>
          </div>
          
          {hasChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Stats and actions */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border">
          <span className="text-sm text-muted-foreground">
            {sortedImages.length} image{sortedImages.length !== 1 ? 's' : ''} total
          </span>
          
          {hasChanges && (
            <Button
              onClick={handleSaveOrder}
              disabled={isSaving}
              size="sm"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save Order
            </Button>
          )}
        </div>

        {/* Images grid with drag and drop */}
        <div
          ref={containerRef}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {sortedImages.map((image, index) => (
            <div
              key={`slot-${image.id}`}
              data-swapy-slot={`slot-${image.id}`}
              className="cursor-grab active:cursor-grabbing"
            >
              <div data-swapy-item={`item-${image.id}`}>
                <ImageItem image={image} index={index} />
              </div>
            </div>
          ))}
        </div>

        {/* Change indicator */}
        {hasChanges && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ You have unsaved changes to the image order.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
