import { notFound } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";

import { prisma } from "@/lib/db";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Download, Calendar, FileText, Info, Tag, User } from "lucide-react";

interface ModelImage {
  id: string;
  url: string;
  modelId: string;
  userId: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

interface UserModel {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface Model {
  id: string;
  name: string;
  description: string | null;
  version: string;
  modelType: string;
  baseModel: string;
  tags: string | null;
  license: string | null;
  userId: string;
  fileUrl: string;
  fileSize: bigint;
  fileName: string;
  downloads: number;
  createdAt: Date;
  updatedAt: Date;
  user: UserModel;
  images: ModelImage[];
}

// Get model by ID
async function getModel(id: string) {
  try {
    const model = await prisma.model.findUnique({
      where: { id },
      include: {
        user: true,
        images: true,
      },
    });
    
    return model;
  } catch (error) {
    console.error("Failed to fetch model:", error);
    return null;
  }
}

// Format file size
function formatFileSize(bytes: bigint) {
  if (bytes < BigInt(1024)) return `${bytes} bytes`;
  else if (bytes < BigInt(1024 * 1024)) return `${(Number(bytes) / 1024).toFixed(2)} KB`;
  else if (bytes < BigInt(1024 * 1024 * 1024)) return `${(Number(bytes) / (1024 * 1024)).toFixed(2)} MB`;
  else return `${(Number(bytes) / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default async function ModelPage({ params }: { params: { id: string } }) {
  const model = await getModel(params.id) as Model | null;
  
  if (!model) {
    notFound();
  }
  
  // Split tags into array if they exist
  const tags = model.tags ? model.tags.split(',').map((tag: string) => tag.trim()) : [];

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Model Preview */}
        <div className="lg:col-span-1">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="pb-0">
              <div className="aspect-square overflow-hidden rounded-md bg-muted relative">
                {model.images && model.images.length > 0 ? (
                  <Image
                    src={model.images[0].url}
                    alt={`Preview of ${model.name}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No preview available
                  </div>
                )}
              </div>
              
              {model.images && model.images.length > 1 && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {model.images.slice(1, 5).map((image: ModelImage) => (
                    <div key={image.id} className="aspect-square overflow-hidden rounded-md bg-muted relative">
                      <Image
                        src={image.url}
                        alt={`Additional preview of ${model.name}`}
                        fill
                        className="object-cover"
                        sizes="100px"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="mt-6">
              <Button className="w-full" size="lg">
                <Download className="mr-2 h-5 w-5" />
                Download Model
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Creator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src={model.user.image || ""} alt={model.user.name} />
                  <AvatarFallback>{model.user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{model.user.name}</p>
                  <p className="text-sm text-muted-foreground">{model.user.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Model Details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-3xl font-bold">{model.name}</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    v{model.version} • {model.baseModel}
                  </CardDescription>
                </div>
                <Badge className="ml-2" variant="secondary">{model.modelType}</Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="about" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="about">
                    <Info className="mr-2 h-4 w-4" /> About
                  </TabsTrigger>
                  <TabsTrigger value="details">
                    <FileText className="mr-2 h-4 w-4" /> Details
                  </TabsTrigger>
                  <TabsTrigger value="stats">
                    <Download className="mr-2 h-4 w-4" /> Stats
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="about" className="mt-4">
                  <div className="prose max-w-none dark:prose-invert">
                    <p className="text-lg leading-relaxed">
                      {model.description || "No description available for this model."}
                    </p>
                  </div>
                  
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold flex items-center mb-3">
                      <Tag className="mr-2 h-4 w-4" /> Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {tags.length > 0 ? (
                        tags.map((tag: string, i: number) => (
                          <Badge key={i} variant="outline">{tag}</Badge>
                        ))
                      ) : (
                        <p className="text-muted-foreground">No tags specified</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                {/* Rest of your code remains unchanged */}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}