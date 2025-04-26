import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Download, Tag, Clock } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import type { TransformedModel } from '@/types/model';

interface ModelCardProps {
  model: TransformedModel;
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
    <Card className="overflow-hidden flex flex-col transition-all hover:shadow-lg hover:translate-y-[-4px] group">
      {/* Image with overlay for model type */}
      <div className="relative aspect-[16/9] w-full bg-black/5">
        <Link href={`/model/${model.id}`}>
          <Image
            src={imageUrl}
            alt={model.name}
            fill
            className="object-cover transition-transform group-hover:scale-105 duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </Link>
        
        {/* Model type badge - top right */}
        <div className="absolute top-2 right-2">
          <Badge className="bg-primary/90 hover:bg-primary font-medium">{model.modelType}</Badge>
        </div>
        
        {/* Version badge - top left */}
        <div className="absolute top-2 left-2">
          <Badge variant="outline" className="bg-white/90 text-black text-xs font-medium">
            v{model.version}
          </Badge>
        </div>
        
        {/* Base model badge - bottom left */}
        <div className="absolute bottom-2 left-2">
          <Badge variant="secondary" className="bg-black/50 hover:bg-black/60 text-white">
            {model.baseModel}
          </Badge>
        </div>
      </div>
      
      {/* Content */}
      <CardHeader className="py-2 px-3 pb-0">
        <Link href={`/model/${model.id}`} className="hover:underline">
          <h3 className="font-medium text-base line-clamp-1">{model.name}</h3>
        </Link>
      </CardHeader>
      
      <CardContent className="px-3 pt-1 pb-2">
        {/* Tags */}
        {tagList.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center">
            <Tag className="w-3 h-3 text-muted-foreground mr-0.5" />
            {tagList.slice(0, 3).map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {tagList.length > 3 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                +{tagList.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
      
      {/* Footer */}
      <CardFooter className="px-3 py-2 flex justify-between items-center border-t">
        {/* User info */}
        <Link href={`/user/${model.user.id}`} className="flex items-center space-x-1.5 hover:underline">
          <Avatar className="h-5 w-5">
            <AvatarImage src={model.user?.image || ""} alt={model.user?.name || "User"} />
            <AvatarFallback className="text-xs">
              {model.user?.name?.substring(0, 2).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">
            {model.user?.name}
          </span>
        </Link>
        
        {/* Downloads and size */}
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <div className="flex items-center">
            <Download className="w-3 h-3 mr-0.5" />
            <span>{model.downloads.toLocaleString()}</span>
          </div>
          <span>•</span>
          <div>{formatFileSize(model.fileSize)}</div>
        </div>
      </CardFooter>
    </Card>
  );
}