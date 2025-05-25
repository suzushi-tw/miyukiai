"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface DebugImageLoaderProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
}

export default function DebugImageLoader({ src, alt, className = "", sizes }: DebugImageLoaderProps) {
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const startTime = Date.now();

  useEffect(() => {
    // Reset state when src changes
    setLoadState('loading');
    setLoadTime(null);
    setRetryCount(0);
  }, [src]);

  const handleLoad = () => {
    setLoadState('loaded');
    setLoadTime(Date.now() - startTime);
    console.log(`Image loaded successfully: ${src} (${Date.now() - startTime}ms)`);
  };

  const handleError = () => {
    setLoadState('error');
    console.error(`Image failed to load: ${src} (attempt ${retryCount + 1})`);
  };

  const retry = () => {
    setRetryCount(prev => prev + 1);
    setLoadState('loading');
    setLoadTime(null);
  };

  return (
    <div className="relative">
      <Image
        src={src}
        alt={alt}
        fill
        className={`${className} ${loadState === 'loading' ? 'opacity-50' : 'opacity-100'} transition-opacity`}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        key={`${src}-${retryCount}`} // Force re-render on retry
      />
      
      {/* Debug overlay */}
      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-1 rounded z-30">
        {loadState === 'loading' && (
          <div className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading...
          </div>
        )}
        {loadState === 'loaded' && (
          <div className="flex items-center gap-1 text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            {loadTime}ms
          </div>
        )}
        {loadState === 'error' && (
          <div className="flex items-center gap-1 text-red-400">
            <AlertCircle className="h-3 w-3" />
            Error
            <button 
              onClick={retry}
              className="ml-1 text-blue-400 underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
