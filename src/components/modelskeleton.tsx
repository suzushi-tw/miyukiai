import {
  Card,
  CardContent,
  CardFooter,
  CardHeader
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ModelCardSkeleton() {
  return (
    <Card className="overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm bg-white dark:bg-slate-900">
      {/* Larger image skeleton */}
      <div className="relative aspect-[16/10] w-full overflow-hidden">
         <Skeleton className="h-full w-full" />
         {/* Skeleton for floating badges */}
         <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-20 gap-2">
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-12 rounded-md" />
         </div>
         <div className="absolute bottom-3 left-3 z-20">
            <Skeleton className="h-6 w-24 rounded-md" />
         </div>
      </div>

      <CardHeader className="p-4 pb-2">
        {/* Title skeleton */}
        <Skeleton className="h-5 w-3/4" />
      </CardHeader>

      <CardContent className="p-4 pt-1 pb-3 flex-grow">
        {/* Tags skeleton */}
        <div className="flex flex-wrap gap-1.5 items-center mt-1">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-3 flex justify-between items-center border-t border-slate-100 dark:border-slate-800 mt-auto bg-slate-50/30 dark:bg-slate-900/30">
        {/* User info skeleton */}
        <div className="flex items-center space-x-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        {/* Stats skeleton */}
        <div className="flex items-center space-x-3">
           <Skeleton className="h-4 w-10" />
           <Skeleton className="h-4 w-10" />
        </div>
      </CardFooter>
    </Card>
  );
}