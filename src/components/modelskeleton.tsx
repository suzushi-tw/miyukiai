import { 
    Card, 
    CardContent, 
    CardFooter, 
    CardHeader 
  } from "@/components/ui/card";
  import { Skeleton } from "@/components/ui/skeleton";
  
  export default function ModelCardSkeleton() {
    return (
      <Card className="overflow-hidden flex flex-col h-full">
        {/* Image skeleton */}
        <Skeleton className="h-48 w-full rounded-none" />
        
        <CardHeader className="pb-2 space-y-2">
          {/* Title skeleton */}
          <div className="flex justify-between items-start">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-5 w-16 ml-2" />
          </div>
          {/* Description skeleton */}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </CardHeader>
        
        <CardContent className="pb-2 flex-grow">
          <Skeleton className="h-4 w-2/5" />
        </CardContent>
        
        <CardFooter className="pt-1">
          <Skeleton className="h-3 w-1/3" />
        </CardFooter>
      </Card>
    );
  }