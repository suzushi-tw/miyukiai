import { db } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import {
  CalendarDays,
  Download,
  Tag,
  BookOpen,
  FileText,
  User,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import GalleryImageItem from "@/components/Galleryimageitem";
import ExpandableDescription from "@/components/Expanddescription";
import Link from "next/link";
import { ComfyMetadata } from "@/utils/getimgmetadata";
import { CommentsWithAuth } from "@/components/Comment";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog"

function formatBytes(bytes: bigint, decimals = 2) {
  if (bytes === BigInt(0)) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [
    "Bytes",
    "KB",
    "MB",
    "GB",
    "TB",
    "PB",
    "EB",
    "ZB",
    "YB",
  ];
  const i = Math.floor(Math.log(Number(bytes)) / Math.log(k));
  return (
    parseFloat(
      (Number(bytes) / Math.pow(k, i)).toFixed(dm)
    ) +
    " " +
    sizes[i]
  );
}

interface GalleryImage {
  id: string;
  url: string;
  metadata: ComfyMetadata | null;
  createdAt: Date;
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const model = await db.model.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          url: true,
          metadata: true,
          createdAt: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!model || !model.user) {
    notFound();
  }

  const tags = model.tags
    ? model.tags
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag)
    : [];
  const featuredImage =
    model.images.length > 0
      ? model.images[0]?.url
      : "/placeholder-model.jpg";
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(model.createdAt);
  const formattedFileSize = formatBytes(model.fileSize);
  const galleryImages = model.images.map(img => ({
    ...img,
    metadata: img.metadata as ComfyMetadata | null,
  })) as GalleryImage[];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 md:py-12">
      {galleryImages.length > 0 && (
        <div className="mb-8 md:mb-12">
          <h2 className="text-2xl font-semibold mb-4">Gallery</h2>
          <div className="relative px-8"> {/* Added padding space for buttons */}
            <Carousel className="w-full">
              <CarouselContent className="-ml-4 md:-ml-6">
                {galleryImages.map(image => (
                  <CarouselItem key={image.id} className="pl-4 md:pl-6 sm:basis-1/2 md:basis-1/3 lg:basis-1/3">
                    {/* <div className="h-full p-2">
                      <GalleryImageItem
                        key={image.id}
                        image={image}
                        modelName={model.name}
                      />
                    </div> */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <div
                          className="aspect-square w-60 h-60 md:w-72 md:h-72 flex-shrink-0 rounded-lg overflow-hidden relative group border cursor-pointer"
                          role="button"
                          tabIndex={0}
                        >
                          <Image
                            src={image.url}
                            fill
                            alt={image.id}
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="(max-width: 768px) 240px, 288px"
                            priority={false}
                          />
                        </div>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                        <DialogHeader>
                          <DialogTitle className="text-lg font-medium">Image Details</DialogTitle>
                          <DialogDescription>
                            Generated with {model.name}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4 overflow-hidden">
                          {/* Image Preview */}
                          <div className="lg:col-span-2 relative rounded-md overflow-hidden" style={{ minHeight: "400px" }}>
                            <Image
                              src={image.url}
                              fill
                              alt={model.name || "Model image"}
                              className="object-contain"
                            />
                          </div>

                          {/* Metadata */}
                          <div className="space-y-3 overflow-y-auto pr-2 max-h-[60vh]">
                            {/* Image Info */}
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
                                    <dd>{new Intl.DateTimeFormat("en-US", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    }).format(image.createdAt)}</dd>
                                  </div>
                                </dl>
                              </CardContent>
                            </Card>

                            {/* Generation Parameters */}
                            {(image.metadata?.model || image.metadata?.seed || image.metadata?.steps) && (
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
                                  </dl>
                                </CardContent>
                              </Card>
                            )}

                            {/* Prompts */}
                            {(image.metadata?.positivePrompt || image.metadata?.negativePrompt) && (
                              <Card>
                                <CardHeader className="py-3">
                                  <CardTitle className="text-sm font-medium">Prompts</CardTitle>
                                </CardHeader>
                                <CardContent className="py-2">
                                  {image.metadata?.positivePrompt && (
                                    <div className="mb-3">
                                      <p className="text-xs text-muted-foreground mb-1">Positive:</p>
                                      <p className="text-sm border rounded-md p-2 bg-muted/50">{image.metadata.positivePrompt}</p>
                                    </div>
                                  )}
                                  {image.metadata?.negativePrompt && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Negative:</p>
                                      <p className="text-sm border rounded-md p-2 bg-muted/50">{image.metadata.negativePrompt}</p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </div>

                        <DialogFooter className="mt-4 gap-2">
                          <Button asChild variant="outline" size="sm">
                            <a href={image.url} download target="_blank" rel="noopener noreferrer">
                              <Download className="mr-2 h-4 w-4" /> Download Image
                            </a>
                          </Button>
                          <DialogClose asChild>
                            <Button type="button" variant="secondary" size="sm">
                              Close
                            </Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-0 -translate-x-1/2 bg-background/80 hover:bg-background" />
              <CarouselNext className="right-0 translate-x-1/2 bg-background/80 hover:bg-background" />
            </Carousel>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{model.name}</h1>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <div className="flex items-center">
                <CalendarDays className="w-4 h-4 mr-1.5" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center">
                <Download className="w-4 h-4 mr-1.5" />
                <span>{model.downloads.toLocaleString()} downloads</span>
              </div>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <ExpandableDescription
                description={model.description}
                maxLines={4}
              />
            </CardContent>
          </Card>

          <CommentsWithAuth pageId={id} />
        </div>

        <div className="space-y-6 lg:mt-0">
          <Card>
            <CardContent className="pt-6">
              <Button asChild size="lg" className="w-full">
                <a href={model.fileUrl} download={model.fileName}>
                  <Download className="mr-2 h-5 w-5" /> Download Model
                </a>
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-3">
                {formattedFileSize} • {model.fileName}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Model Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start">
                <Download className="w-5 h-5 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Downloads
                  </p>
                  <p className="font-medium">
                    {model.downloads.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <FileText className="w-5 h-5 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Model Type
                  </p>
                  <p className="font-medium">{model.modelType}</p>
                </div>
              </div>
              <div className="flex items-start">
                <BookOpen className="w-5 h-5 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Base Model
                  </p>
                  <p className="font-medium">{model.baseModel}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Tag className="w-5 h-5 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Version
                  </p>
                  <p className="font-medium">{model.version}</p>
                </div>
              </div>
              {model.license && (
                <div className="flex items-start">
                  <FileText className="w-5 h-5 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      License
                    </p>
                    <p className="font-medium">{model.license}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Creator</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/user/${model.user.id}`}
                className="flex items-center space-x-4 group hover:bg-accent/50 p-2 rounded-md transition-colors -m-2"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={model.user.image ?? undefined}
                    alt={model.user.name ?? "User avatar"}
                  />
                  <AvatarFallback>
                    {model.user.name
                      ? model.user.name.charAt(0).toUpperCase()
                      : <User className="h-6 w-6" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold group-hover:text-primary transition-colors">
                    {model.user.name || "Unknown User"}
                  </p>
                  {model.user.email && (
                    <p className="text-sm text-muted-foreground">
                      {model.user.email}
                    </p>
                  )}
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}