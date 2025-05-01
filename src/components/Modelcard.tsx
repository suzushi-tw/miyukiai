import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Download, Tag, Calendar } from "lucide-react"; // Keep Calendar if you plan to add date later
import { formatDistanceToNow } from 'date-fns';
import type { TransformedModel } from '@/types/model';
import NsfwImageWrapper from './NSFWimagewrapper';

interface ModelCardProps {
  model: TransformedModel;
}

export default function ModelCard({ model }: ModelCardProps) {
 
  const imageId = model.images?.[0]?.id || model.id;
  const isNsfw = model.images?.[0]?.isNsfw || false;
  // Format the file size
  const formatFileSize = (bytes: bigint) => {
    if (bytes === BigInt(0)) return '0 bytes'; // Handle zero case
    if (bytes < BigInt(1024)) return `${bytes} bytes`;
    const kb = Number(bytes) / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
  };

  // Parse tags
  const tagList = model.tags ? model.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

  // Get first image or placeholder
  const imageUrl = model.images && model.images.length > 0
    ? model.images[0].url
    : '/placeholder-model-image.jpg'; // Ensure you have this placeholder image

  return (
    <Card className="overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 group bg-white dark:bg-slate-900">
      {/* Much larger image container without darkening gradient */}
      <div className="relative aspect-[16/20] w-full overflow-hidden"> {/* Increased height for a much taller image */}
        <Link href={`/model/${model.id}`} className="block h-full">
          <NsfwImageWrapper
            imageUrl={imageUrl}
            imageId={imageId}
            isNsfw={isNsfw}
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            alt={model.name}
            priority={false}
          />
        </Link>

        {/* Floating badges - top */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-20 gap-2">
          <Badge variant="secondary" className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-sm text-slate-800 dark:text-slate-200 text-xs font-medium px-2.5 py-1 rounded-md shadow-sm border border-white/20 dark:border-slate-700/50">
            {model.modelType}
          </Badge>

          {model.version && (
            <Badge variant="outline" className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-sm text-slate-700 dark:text-slate-300 text-xs font-medium px-2.5 py-1 rounded-md shadow-sm border border-white/20 dark:border-slate-700/50">
              v{model.version}
            </Badge>
          )}
        </div>

        {/* Model title overlay on image - bottom with shadow backdrop for visibility */}
        <div className="absolute bottom-3 left-3 right-3 z-20">
          <div className="bg-black/30 backdrop-blur-sm p-2 rounded-md">
            <h3 className="font-semibold text-base md:text-lg leading-tight tracking-tight line-clamp-1 text-white drop-shadow-sm mb-2">
              {model.name}
            </h3>

            {/* Tags on image */}
            {tagList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                {tagList.slice(0, 3).map((tag, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs px-2 py-0.5 rounded-full border-white/20 text-white font-normal bg-black/30 backdrop-blur-sm"
                  >
                    {tag}
                  </Badge>
                ))}
                {tagList.length > 3 && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full border-white/20 text-white font-normal bg-black/30 backdrop-blur-sm">
                    +{tagList.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            {/* Base model badge */}
            {model.baseModel && (
              <Badge variant="secondary" className="bg-black/60 hover:bg-black/75 backdrop-blur-sm text-white text-xs rounded-md px-2.5 py-1 shadow-sm border border-white/10 mt-2">
                Base: {model.baseModel}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Compact footer - no need for other content sections */}
      <CardFooter className="p-3 flex justify-between items-center border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
        {/* User info */}
        <Link href={`/user/${model.user.id}`} className="flex items-center space-x-2 group/user overflow-hidden mr-2">
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={model.user?.image || ""} alt={model.user?.name || "User"} />
            <AvatarFallback className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {model.user?.name?.substring(0, 1).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover/user:text-primary dark:group-hover/user:text-primary-400 transition-colors truncate">
            {model.user?.name || 'Unknown User'}
          </span>
        </Link>

        {/* Stats */}
        <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
          <div className="flex items-center" title={`${model.downloads.toLocaleString()} downloads`}>
            <Download className="w-3.5 h-3.5 mr-1 text-slate-400 dark:text-slate-500" />
            <span className="font-medium">{model.downloads.toLocaleString()}</span>
          </div>
          <div className="flex items-center" title={`File size: ${formatFileSize(model.fileSize)}`}>
            <span className="text-slate-300 dark:text-slate-700 mx-1">|</span>
            <span className="font-medium">{formatFileSize(model.fileSize)}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}