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
  CardFooter 
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

interface ImageMetadata {
  prompt?: string;
  model?: string;
  negativePrompt?: string;
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
}

// Function to fetch images from API
const fetchImages = async ({ pageParam = 1 }) => {
  const params = new URLSearchParams();
  
  if (pageParam > 1 && typeof pageParam === 'string') {
    params.append("cursor", pageParam);
  }

  const response = await fetch(`/api/getimages?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch images');
  }

  const data = await response.json();

  return {
    images: data.images,
    nextPage: data.nextCursor
  };
};

export default function ImagesGalleryPage() {
  const router = useRouter();
  const { ref, inView } = useInView();
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);

  // Setup infinite query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ['images'],
    queryFn: fetchImages,
    getNextPageParam: (lastPage) => lastPage.nextPage,
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
          {data?.pages.flatMap((page) => (
            page.images.map((image: Image) => (
              <Dialog key={image.id}>
                <DialogTrigger asChild>
                  <Card className="overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1">
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      <img 
                        src={image.url} 
                        alt={image.model?.name || "Generated image"} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
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
                <DialogContent className="sm:max-w-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted rounded-md overflow-hidden">
                      <img 
                        src={image.url} 
                        alt={image.model?.name || "Generated image"} 
                        className="w-full h-auto object-contain"
                      />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold">Image Details</h3>
                        <p className="text-sm text-muted-foreground">Generated with {image.model?.name}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Avatar>
                            <AvatarImage src={image.user?.image || undefined} />
                            <AvatarFallback>{image.user?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{image.user?.name}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(image.createdAt)}</p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {image.metadata?.prompt && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Prompt</h4>
                          <p className="text-sm bg-muted p-3 rounded-md">{image.metadata.prompt}</p>
                        </div>
                      )}
                      
                      {image.metadata?.negativePrompt && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Negative Prompt</h4>
                          <p className="text-sm bg-muted p-3 rounded-md">{image.metadata.negativePrompt}</p>
                        </div>
                      )}

                      {image.metadata?.parameters && Object.keys(image.metadata.parameters).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Parameters</h4>
                          <div className="bg-muted p-3 rounded-md">
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(image.metadata.parameters).map(([key, value]) => (
                                <div key={key} className="text-xs">
                                  <span className="font-medium">{key}: </span>
                                  <span>{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2 pt-2">
                        <Button variant="outline" size="sm" className="w-full" asChild>
                          <a href={image.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open Original
                          </a>
                        </Button>
                        <Button size="sm" className="w-full" asChild>
                          <a href={image.url} download>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
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