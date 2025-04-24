import { notFound } from 'next/navigation';
import Image from 'next/image';
import { db } from '@/lib/prisma';
import { Download, Eye, ThumbsUp, Calendar, FileType, Scale, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Fetch the model by ID
async function getModel(id: string) {
  const model = await db.model.findUnique({
    where: { id },
    include: {
      images: true,
      user: {
        select: {
          name: true,
          image: true,
          id: true,
        },
      },
    },
  });
  
  if (!model) return null;
  return model;
}

// Format file size for display
function formatFileSize(bytes: bigint) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === BigInt(0)) return '0 Byte';
  const i = Math.floor(Math.log(Number(bytes)) / Math.log(1024));
  return Math.round(Number(bytes) / Math.pow(1024, i)) + ' ' + sizes[i];
}

export default async function ModelPage({ params }: { params: { id: string } }) {
  const model = await getModel(params.id);
  
  if (!model) {
    notFound();
  }
  
  // Extract first image as cover, or use placeholder
  const coverImage = model.images.length > 0 
    ? model.images[0].url 
    : '/placeholder-model.png';
  
  const tagList = model.tags?.split(',').map(tag => tag.trim()) || [];

  return (
    <div className="container max-w-6xl py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Main image */}
        <div className="lg:col-span-2">
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg border">
            <Image 
              src={coverImage} 
              alt={model.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
            />
          </div>
          
          {/* Image gallery */}
          {model.images.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {model.images.map((image, i) => (
                <div 
                  key={image.id} 
                  className="relative aspect-square overflow-hidden rounded-md border cursor-pointer"
                >
                  <Image 
                    src={image.url} 
                    alt={`Preview ${i + 1}`}
                    fill
                    className="object-cover hover:opacity-80 transition-opacity"
                    sizes="(max-width: 768px) 25vw, 10vw"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Right column - Model info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{model.name}</h1>
            <div className="flex items-center gap-2 mt-2 text-muted-foreground">
              <p>By {model.user.name}</p>
              <div className="h-1 w-1 rounded-full bg-muted-foreground"></div>
              <p>Version {model.version}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{model.downloads || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" />
              <span>0</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDistanceToNow(model.createdAt)} ago</span>
            </div>
          </div>

          <Button className="w-full" size="lg">
            <Download className="mr-2 h-5 w-5" />
            Download
          </Button>

          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileType className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">File Type</span>
              </div>
              <span className="font-medium">{model.fileName.split('.').pop()?.toUpperCase()}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Size</span>
              </div>
              <span className="font-medium">{formatFileSize(model.fileSize)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Model Type</span>
              </div>
              <span className="font-medium">{model.modelType}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Base Model</span>
              </div>
              <span className="font-medium">{model.baseModel}</span>
            </div>
          </div>

          {model.license && (
            <div>
              <h3 className="font-medium mb-1">License</h3>
              <p className="text-sm text-muted-foreground">{model.license}</p>
            </div>
          )}

          {tagList.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tagList.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Description & Example Images Tabs */}
      <Tabs defaultValue="description" className="mt-6">
        <TabsList>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="examples">Example Images</TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="mt-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {model.description || "No description provided."}
          </div>
        </TabsContent>
        <TabsContent value="examples" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {model.images.map((image, i) => (
              <div key={image.id} className="rounded-lg overflow-hidden border">
                <div className="relative aspect-square">
                  <Image 
                    src={image.url} 
                    alt={`Example ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
                {image.metadata && (
                  <div className="p-3 bg-muted/50">
                    <h4 className="font-medium text-sm">Generation Parameters</h4>
                    <pre className="text-xs overflow-auto mt-1 max-h-24">
                      {JSON.stringify(image.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
            {model.images.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No example images provided.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}