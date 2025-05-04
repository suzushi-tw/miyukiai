"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { ArrowLeft, Filter, Download, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { PromptWithCopy } from "@/components/promptwithcopy";
import Link from "next/link";
import NsfwImageWrapper from "@/components/NSFWimagewrapper";

interface ImageMetadata {
  prompt?: string;
  model?: string;
  negativePrompt?: string;
  positivePrompt?: string;
  parameters?: Record<string, any>;
  [key: string]: any;
}

interface Image {
  id: string;
  url: string;
  modelId: string;
  model: {
    id: string;
    name: string;
  };
  userId: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
  metadata: ImageMetadata | null;
  createdAt: string;
  isNsfw?: boolean;
}

// Function to fetch images from API with improved cursor handling
const fetchImages = async ({ pageParam = 1 }) => {
  const params = new URLSearchParams();
  
  // Handle cursor properly - if pageParam is not the initial value, use it as cursor
  if (pageParam !== 1) {
    // Convert pageParam to string to satisfy TypeScript
    params.append("cursor", String(pageParam));
  }
  
  console.log(`Fetching images with params: ${params.toString()}`);
  
  const response = await fetch(`/api/getimages?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch images');
  }

  const data = await response.json();
  console.log(`Received ${data.images.length} images, nextCursor: ${data.nextCursor}`);
  
  return {
    images: data.images,
    nextPage: data.nextCursor
  };
};

export default function ImagesGalleryPage() {
  const router = useRouter();
  const { ref, inView } = useInView();
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [copyState, setCopyState] = useState<Record<string, boolean>>({});

  const handleDownload = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to opening in new tab
      window.open(imageUrl, '_blank');
    }
  };

  // Setup infinite query with proper cursor handling
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ['images'],
    queryFn: fetchImages,
    getNextPageParam: (lastPage) => lastPage.nextPage || undefined, // Return undefined to signal end
    initialPageParam: 1
  });

  // Load more images when scrolling to the bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container max-w-7xl mx-auto py-12 px-4 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Image Gallery</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Explore generated images from our community models
        </p>
      </div>

      {status === 'pending' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-square bg-muted">
                <Skeleton className="w-full h-full" />
              </div>
              <CardFooter className="p-4 flex-col items-start">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : status === 'error' ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-red-500">
            Error loading images
          </h3>
          <p className="mt-2 text-muted-foreground">
            Please try again later
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {data?.pages.flatMap((page, pageIndex) => (
            page.images.map((image: Image, imageIndex: number) => (
              <Dialog key={`${pageIndex}-${image.id}`}>
                <DialogTrigger asChild>
                  <Card className="overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1">
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      <div className="aspect-square bg-muted relative overflow-hidden">
                        <NsfwImageWrapper
                          imageUrl={image.url}
                          imageId={image.id}
                          isNsfw={image.isNsfw || false}
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          priority={false}
                        />
                      </div>
                    </div>
                    <CardFooter className="p-4 flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={image.user?.image || undefined} />
                          <AvatarFallback>{image.user?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate max-w-[100px]">
                          {image.user?.name}
                        </span>
                      </div>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Badge variant="outline" className="text-xs">
                            {image.model?.name?.substring(0, 15) || "Model"}
                          </Badge>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold">{image.model?.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(image.createdAt)}
                            </p>
                            {image.metadata?.prompt && (
                              <>
                                <Separator className="my-2" />
                                <p className="text-xs line-clamp-3">
                                  <span className="font-medium">Prompt: </span>
                                  {image.metadata.prompt}
                                </p>
                              </>
                            )}
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </CardFooter>
                  </Card>
                </DialogTrigger>
                {/* Rest of your dialog content remains the same... */}
                {/* ... */}
              </Dialog>
            ))
          ))}
        </div>
      )}

      {/* Loading more items */}
      {isFetchingNextPage && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={`loading-more-${i}`} className="overflow-hidden">
              <div className="aspect-square bg-muted">
                <Skeleton className="w-full h-full" />
              </div>
              <CardFooter className="p-4">
                <Skeleton className="h-4 w-3/4" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Intersection observer target */}
      <div
        ref={ref}
        className="h-10 w-full flex items-center justify-center mt-8"
      >
        {hasNextPage && !isFetchingNextPage && (
          <span className="text-sm text-muted-foreground">Scroll for more images</span>
        )}
      </div>

      {/* End of results message */}
      {!hasNextPage && status !== 'pending' && data?.pages[0].images.length > 0 && (
        <div className="text-center mt-8 text-muted-foreground">
          You have seen all the images
        </div>
      )}

      {/* Empty state */}
      {status !== 'pending' && data?.pages[0].images.length === 0 && (
        <div className="text-center py-16">
          <h3 className="text-xl font-medium">
            No images found
          </h3>
          <p className="mt-2 text-muted-foreground">
            Be the first to upload model images
          </p>
        </div>
      )}
    </div>
  );
}