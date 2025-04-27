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
                      <div className="aspect-square bg-muted relative overflow-hidden">
                        <Image
                          src={image.url}
                          alt={image.model?.name || "Generated image"}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          className="object-cover"
                          loading="lazy"
                          placeholder="blur"
                          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
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
                <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Image Preview */}
                    <div className="bg-muted rounded-md overflow-hidden relative" style={{ height: '400px' }}>
                      <Image
                        src={image.url}
                        alt={image.model?.name || "Generated image"}
                        fill
                        className="object-contain"
                        placeholder="blur"
                        blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                      />
                    </div>

                    {/* Metadata and Details */}
                    <div className="space-y-4 overflow-y-auto pr-2 max-h-[80vh]">
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

                      {/* Prompts */}
                      {(image.metadata?.prompt || image.metadata?.negativePrompt) && (
                        <Card>
                          <CardHeader className="py-3">
                            <CardTitle className="text-sm font-medium">Prompts</CardTitle>
                          </CardHeader>
                          <CardContent className="py-2 space-y-3">
                            {image.metadata?.prompt && (
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <p className="text-xs text-muted-foreground font-medium">Positive</p>
                                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => navigator.clipboard.writeText(image.metadata?.prompt || '')}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                    </svg>
                                    <span className="sr-only">Copy</span>
                                  </Button>
                                </div>
                                <div className="bg-muted p-2 rounded-md text-xs">
                                  {image.metadata.prompt}
                                </div>
                              </div>
                            )}
                            {image.metadata?.positivePrompt && (
                              <PromptWithCopy label="Positive" text={image.metadata.positivePrompt} />
                            )}
                            {image.metadata?.negativePrompt && (
                              <PromptWithCopy label="Negative" text={image.metadata.negativePrompt} />
                            )}


                          </CardContent>
                        </Card>
                      )}

                      {/* Image Information */}
                      {(image.metadata?.width || image.metadata?.height || image.metadata?.bitDepth || image.metadata?.colorType) && (
                        <Card>
                          <CardHeader className="py-3">
                            <CardTitle className="text-sm font-medium">Image Information</CardTitle>
                          </CardHeader>
                          <CardContent className="py-2">
                            <dl className="space-y-2 text-sm">
                              {image.metadata?.width && image.metadata?.height && (
                                <div className="flex justify-between">
                                  <dt className="text-muted-foreground">Dimensions:</dt>
                                  <dd>{image.metadata.width} × {image.metadata.height}</dd>
                                </div>
                              )}
                              {image.metadata?.bitDepth && (
                                <div className="flex justify-between">
                                  <dt className="text-muted-foreground">Bit Depth:</dt>
                                  <dd>{image.metadata.bitDepth}-bit</dd>
                                </div>
                              )}
                              {image.metadata?.colorType && (
                                <div className="flex justify-between">
                                  <dt className="text-muted-foreground">Color Type:</dt>
                                  <dd>{image.metadata.colorType}</dd>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <dt className="text-muted-foreground">Created:</dt>
                                <dd>{formatDate(image.createdAt)}</dd>
                              </div>
                            </dl>
                          </CardContent>
                        </Card>
                      )}

                      {/* Generation Parameters */}
                      {(image.metadata?.model || image.metadata?.seed || image.metadata?.steps || image.metadata?.cfg ||
                        image.metadata?.sampler || image.metadata?.scheduler || image.metadata?.denoise) && (
                          <Card>
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm font-medium">Generation Parameters</CardTitle>
                            </CardHeader>
                            <CardContent className="py-2">
                              <dl className="space-y-2 text-sm">
                                {image.metadata?.model && (
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Model:</dt>
                                    <dd className="max-w-[180px] text-right">{image.metadata.model}</dd>
                                  </div>
                                )}
                                {image.metadata?.seed !== undefined && (
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Seed:</dt>
                                    <dd>{image.metadata.seed}</dd>
                                  </div>
                                )}
                                {image.metadata?.steps !== undefined && (
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Steps:</dt>
                                    <dd>{image.metadata.steps}</dd>
                                  </div>
                                )}
                                {image.metadata?.cfg !== undefined && (
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">CFG Scale:</dt>
                                    <dd>{image.metadata.cfg}</dd>
                                  </div>
                                )}
                                {image.metadata?.sampler && (
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Sampler:</dt>
                                    <dd>{image.metadata.sampler}</dd>
                                  </div>
                                )}
                                {image.metadata?.scheduler && (
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Scheduler:</dt>
                                    <dd>{image.metadata.scheduler}</dd>
                                  </div>
                                )}
                                {image.metadata?.denoise !== undefined && (
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Denoise:</dt>
                                    <dd>{image.metadata.denoise}</dd>
                                  </div>
                                )}
                                {image.metadata?.parameters && Object.entries(image.metadata.parameters).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <dt className="text-muted-foreground">{key}:</dt>
                                    <dd>{String(value)}</dd>
                                  </div>
                                ))}
                              </dl>
                            </CardContent>
                          </Card>
                        )}

                      <div className="pt-2">
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleDownload(image.url, `image-${image.id}.jpg`)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
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