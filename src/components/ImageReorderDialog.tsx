'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createSwapy, utils } from 'swapy';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  GripVertical,
  RotateCcw,
  ImageIcon,
  ArrowUpDown,
  Loader2
} from 'lucide-react';

interface ModelImage {
  id: string;
  url: string;
  isNsfw: boolean;
  order: number;
}

interface ImageReorderDialogProps {
  modelId: string;
  images: ModelImage[];
  onImagesReordered: (reorderedImages: ModelImage[]) => void;
  trigger?: React.ReactNode;
}

// Simple image item component optimized for Swapy
const DraggableImageItem = ({
  image,
  index,
  slotId,
  itemId
}: {
  image: ModelImage;
  index: number;
  slotId: string;
  itemId: string;
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  return (
    <div
      data-swapy-slot={slotId}
      className="w-full"
    >
      <div
        data-swapy-item={itemId}
        className="relative group overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-grab active:cursor-grabbing bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 w-full"
      >
        <div className="aspect-square relative w-full">
          {/* Loading state */}
          {imageLoading && !imageError && (
            <div className="aspect-square relative bg-slate-200 dark:bg-slate-700 animate-pulse flex items-center justify-center rounded-lg w-full">
              <div className="flex flex-col items-center text-slate-400 dark:text-slate-500">
                <ImageIcon className="h-8 w-8 mb-2" />
                <span className="text-xs font-medium">Loading...</span>
              </div>
            </div>
          )}

          {/* Error state */}
          {imageError && (
            <div className="aspect-square relative bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg w-full">
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
            className={`object-cover transition-all duration-500 ease-in-out rounded-lg ${
              imageLoading ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
            }`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
            priority={index < 4}
            draggable={false}
          />

          {/* Drag handle */}
          <div className="absolute top-2 right-2 opacity-70 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/70 backdrop-blur-sm rounded p-1.5">
              <GripVertical className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* Order badge */}
          <div className="absolute top-2 left-2">
            <Badge variant={index === 0 ? 'default' : 'secondary'} className="text-xs font-semibold">
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
      </div>
    </div>
  );
};

export default function ImageReorderDialog({
  modelId,
  images,
  onImagesReordered,
  trigger
}: ImageReorderDialogProps) {
  const [open, setOpen] = useState(false);
  const [currentImages, setCurrentImages] = useState<ModelImage[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [slotItemMap, setSlotItemMap] = useState<any[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const swapyRef = useRef<any>(null);

  // Create slotted items from current images and slot item map
  const slottedItems = useMemo(() => {
    if (currentImages.length === 0) return [];
    return utils.toSlottedItems(currentImages, 'id', slotItemMap);
  }, [currentImages, slotItemMap]);

  // Initialize images when dialog opens
  useEffect(() => {
    if (open) {
      const sortedImages = [...images].sort((a, b) => a.order - b.order);
      setCurrentImages(sortedImages);
      setSlotItemMap(utils.initSlotItemMap(sortedImages, 'id'));
      setHasChanges(false);
    } else {
      // Cleanup when dialog closes
      if (swapyRef.current) {
        swapyRef.current.destroy();
        swapyRef.current = null;
      }
    }
  }, [open, images]);  // Initialize Swapy - should only run once when dialog opens
  useEffect(() => {
    if (!open || !containerRef.current) {
      return;
    }

    // Cleanup previous instance
    if (swapyRef.current) {
      swapyRef.current.destroy();
      swapyRef.current = null;
    }

    // Wait for the DOM to be ready and items to be rendered
    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      try {
        console.log('Initializing Swapy with container:', containerRef.current);
        console.log('Container children:', containerRef.current.children);
        
        swapyRef.current = createSwapy(containerRef.current, {
          manualSwap: true,
        });

        swapyRef.current.onSwap((event: any) => {
          console.log('Swap event:', event);
          setSlotItemMap(event.newSlotItemMap.asArray);
          setHasChanges(true);
        });

        console.log('Swapy initialized successfully');
      } catch (error) {
        console.error('Swapy initialization error:', error);
      }
    }, 200); // Increased timeout to ensure DOM is ready

    return () => {
      clearTimeout(timer);
      if (swapyRef.current) {
        swapyRef.current.destroy();
        swapyRef.current = null;
      }
    };
  }, [open]);// Remove currentImages.length dependency  // Update Swapy instance when images change - should run after Swapy is initialized
  useEffect(() => {
    // Only run dynamicSwapy after images are loaded and Swapy is initialized
    if (swapyRef.current && currentImages.length > 0 && open) {
      console.log('Running dynamicSwapy with:', currentImages.length, 'images');
      utils.dynamicSwapy(swapyRef.current, currentImages, 'id', slotItemMap, setSlotItemMap);
    }
  }, [currentImages, slotItemMap, open]);

  const handleSaveOrder = async () => {
    setIsSaving(true);
    try {
      // Create ordered images based on current slot item map
      const orderedImages: ModelImage[] = [];
      slotItemMap.forEach((mapItem, index) => {
        const image = currentImages.find(img => img.id === mapItem.item);
        if (image) {
          orderedImages.push({
            ...image,
            order: index,
          });
        }
      });

      const imageOrders = orderedImages.map((img, index) => ({
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
      onImagesReordered(orderedImages);
      toast.success('Image order updated successfully!');
      setOpen(false);
    } catch (error) {
      toast.error('Failed to save image order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const sortedImages = [...images].sort((a, b) => a.order - b.order);
    setCurrentImages(sortedImages);
    setSlotItemMap(utils.initSlotItemMap(sortedImages, 'id'));
    setHasChanges(false);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="h-9">
      <ArrowUpDown className="h-4 w-4 mr-2" />
      Reorder Images
    </Button>
  );

  if (images.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <div className="flex flex-col items-center">
          <ImageIcon className="h-12 w-12 mb-4 text-slate-300" />
          <p className="text-sm">No images uploaded for this model.</p>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>      <DialogContent className="!max-w-7xl !w-[95vw] max-h-[90vh] p-0 overflow-hidden !sm:max-w-7xl">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <ArrowUpDown className="h-6 w-6" />
            Reorder Images
          </DialogTitle>
          <DialogDescription className="text-base">
            Drag images to reorder them. The first image will become the banner image.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full max-h-[calc(90vh-120px)]">
          {/* Action bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b bg-slate-50 dark:bg-slate-900/50">          <div className="text-sm text-muted-foreground">
            {currentImages.length} image{currentImages.length !== 1 ? 's' : ''} total
          </div>
            {hasChanges && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isSaving}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
          {/* Images grid */}
          <div className="flex-1 overflow-auto">
            <div className="p-6">              <div
                ref={containerRef}
                data-swapy-container
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {slottedItems.map(({ slotId, itemId, item: image }) => {
                  if (!image) return null;
                  const index = currentImages.findIndex(img => img.id === image.id);
                  return (
                    <DraggableImageItem
                      key={slotId}
                      image={image}
                      index={index}
                      slotId={slotId}
                      itemId={itemId}
                    />
                  );
                })}</div>
            </div>
            {/* Change indicator */}
            {hasChanges && (
              <div className="mx-6 mb-4 p-3 border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  You have unsaved changes to the image order.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-slate-50 dark:bg-slate-900/50">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveOrder}
              disabled={!hasChanges || isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Order
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
