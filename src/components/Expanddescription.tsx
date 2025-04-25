"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ExpandableDescriptionProps {
  description: string | null | undefined;
  maxLength?: number; // Optional: Character limit before truncating
  maxLines?: number; // Optional: Line limit before truncating (uses line-clamp)
}

export default function ExpandableDescription({
  description,
  maxLength = 300, // Default character limit
  maxLines = 5, // Default line limit
}: ExpandableDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const fullDescription = description || "No description provided.";
  const useLineClamp = true; // Set to false to use character limit instead

  // Determine if truncation is needed
  const needsTruncation = useLineClamp
    ? fullDescription.split('\n').length > maxLines
    : fullDescription.length > maxLength;

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  // If no description or doesn't need truncation, just display it
  if (!description || !needsTruncation) {
    return (
      <div className="prose prose-slate max-w-none dark:prose-invert text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
        {fullDescription}
      </div>
    );
  }

  return (
    <div>
      <div
        className={`prose prose-slate max-w-none dark:prose-invert text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[1000px]' : // Use max-height for smooth transition
          useLineClamp ? `line-clamp-${maxLines}` : `max-h-[${maxLines * 1.75}em]` // Approximate max-height based on lines or use line-clamp
        } ${useLineClamp && !isExpanded ? `line-clamp-${maxLines}` : ''}`} // Apply line-clamp class if needed
        style={!useLineClamp && !isExpanded ? { maxHeight: `${maxLines * 1.75}em` } : {}} // Fallback max-height if not using line-clamp
      >
        {fullDescription}
      </div>
      <Button
        variant="link"
        onClick={toggleExpansion}
        className="px-0 h-auto mt-2 text-sm text-primary hover:text-primary/80"
      >
        {isExpanded ? (
          <>
            Show Less <ChevronUp className="ml-1 h-4 w-4" />
          </>
        ) : (
          <>
            Show More <ChevronDown className="ml-1 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}