"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Download } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NsfwImageWrapper from "@/components/NSFWimagewrapper";
import type { TransformedModel } from "@/types/model";

interface ModelCardProps {
  model: TransformedModel;
}

export default function ModelCard({ model }: ModelCardProps) {
  // Get first image or use placeholder
  const firstImage = model.images && model.images.length > 0
    ? model.images[0]
    : null;

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(model.createdAt);

  return (
    <Card className="overflow-hidden h-full flex flex-col transition-transform hover:shadow-md">
      <Link 
        href={`/model/${model.id}`}
        className="overflow-hidden h-48 relative"
      >
        {firstImage ? (
          <NsfwImageWrapper
            imageUrl={firstImage.url}
            imageId={firstImage.id}
            isNsfw={!!firstImage.isNsfw}
            className="object-cover transition-transform duration-300 hover:scale-105"
            alt={`${model.name} preview`}
          />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center text-muted-foreground text-sm">
            No image available
          </div>
        )}
      </Link>
      
      <CardContent className="flex flex-col flex-grow p-4">
        <div className="mb-2 flex items-start justify-between">
          <Link 
            href={`/model/${model.id}`}
            className="text-lg font-medium hover:underline line-clamp-1"
          >
            {model.name}
          </Link>
          
          <Badge variant="outline" className="ml-2 shrink-0">
            {model.modelType}
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-auto">
          {model.description || "No description available"}
        </p>
        
        <div className="flex items-center justify-between mt-4 pt-2 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center">
            <Avatar className="w-6 h-6 mr-2">
              <AvatarImage src={model.user.image || undefined} alt={model.user.name} />
              <AvatarFallback>{model.user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="truncate">{model.user.name}</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <Download className="w-3.5 h-3.5 mr-1" />
              <span>{model.downloads.toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <CalendarDays className="w-3.5 h-3.5 mr-1" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}