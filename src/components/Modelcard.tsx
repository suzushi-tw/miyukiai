import { AIModel } from '@/services/modelservice';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from 'next/image';

interface ModelCardProps {
  model: AIModel;
}

export default function ModelCard({ model }: ModelCardProps) {
  const formatParams = (params: number) => {
    if (params >= 1e12) return `${(params / 1e12).toFixed(1)}T`;
    if (params >= 1e9) return `${(params / 1e9).toFixed(1)}B`;
    if (params >= 1e6) return `${(params / 1e6).toFixed(1)}M`;
    return params.toString();
  };

  return (
    <Card className="overflow-hidden flex flex-col h-full transition-all hover:shadow-md">
      <div className="relative h-48 w-full">
        <Image
          src={model.imageUrl}
          alt={model.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{model.name}</CardTitle>
          <Badge variant="outline" className="ml-2">
            {model.category}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {model.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2 flex-grow">
        <p className="text-sm text-gray-500">
          Parameters: {formatParams(model.parameters)}
        </p>
      </CardContent>
      <CardFooter className="pt-1">
        <div className="text-xs text-gray-500">
          Released: {model.releaseDate}
        </div>
      </CardFooter>
    </Card>
  );
}