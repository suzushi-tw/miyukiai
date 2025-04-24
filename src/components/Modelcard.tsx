import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Download, Tag, Clock } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

interface ModelImage {
  url: string;
}

interface User {
  name: string;
  image?: string | null;
}

interface Model {
  id: string;
  name: string;
  description: string | null;
  version: string;
  modelType: string;
  baseModel: string;
  tags: string | null;
  downloads: number;
  fileSize: bigint;
  createdAt: Date;
  images: ModelImage[];
  user: User;
}

interface ModelCardProps {
  model: Model;
}

export default function ModelCard({ model }: ModelCardProps) {
  // Format the file size
  const formatFileSize = (bytes: bigint) => {
    if (bytes < BigInt(1024)) return `${bytes} bytes`;
    if (bytes < BigInt(1024 * 1024)) return `${(Number(bytes) / 1024).toFixed(1)} KB`;
    if (bytes < BigInt(1024 * 1024 * 1024)) return `${(Number(bytes) / (1024 * 1024)).toFixed(1)} MB`;
    return `${(Number(bytes) / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };
  
  // Parse tags
  const tagList = model.tags ? model.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
  
  // Get first image or placeholder
  const imageUrl = model.images && model.images.length > 0 
    ? model.images[0].url 
    : '/placeholder-model-image.jpg'; // Replace with your actual placeholder
  
  return (
    <Link href={`/model/${model.id}`} className="block h-full">
      <Card className="overflow-hidden flex flex-col h-full transition-all hover:shadow-lg hover:translate-y-[-4px]">
        {/* Image with overlay for model type */}
        <div className="relative aspect-[4/3] w-full bg-black/5">
          <Image
            src={imageUrl}
            alt={model.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Model type badge - top right */}
          <div className="absolute top-2 right-2">
            <Badge className="bg-primary/90 hover:bg-primary">{model.modelType}</Badge>
          </div>
          
          {/* Base model badge - bottom left */}
          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="bg-black/50 hover:bg-black/60 text-white">
              {model.baseModel}
            </Badge>
          </div>
          
          {/* Version badge - bottom right */}
          <div className="absolute bottom-2 right-2">
            <Badge variant="outline" className="bg-white/80 text-black text-xs">
              v{model.version}
            </Badge>
          </div>
        </div>
        
        {/* Content */}
        <CardContent className="flex-grow p-4">
          <div className="space-y-3">
            {/* Title */}
            <h3 className="font-medium text-lg line-clamp-1">{model.name}</h3>
            
            {/* Description */}
            <p className="text-sm text-muted-foreground line-clamp-2">
              {model.description || "No description available"}
            </p>
            
            {/* Tags */}
            {tagList.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <Tag className="w-3.5 h-3.5 text-muted-foreground mr-1" />
                {tagList.slice(0, 3).map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs px-2 py-0">
                    {tag}
                  </Badge>
                ))}
                {tagList.length > 3 && (
                  <Badge variant="outline" className="text-xs px-2 py-0">
                    +{tagList.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
        
        {/* Footer */}
        <CardFooter className="flex items-center justify-between p-4 pt-0 border-t">
          {/* Creator */}
          <div className="flex items-center space-x-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={model.user?.image || ""} alt={model.user?.name || "User"} />
              <AvatarFallback className="text-xs">
                {model.user?.name?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {model.user?.name}
            </span>
          </div>
          
          {/* Downloads + File size */}
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDistanceToNow(new Date(model.createdAt), { addSuffix: true })}</span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Download className="w-3.5 h-3.5" />
              <span>{model.downloads}</span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}