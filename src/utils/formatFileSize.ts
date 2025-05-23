/**
 * Format file size from bytes (as string or number) to human-readable format
 * @param size - File size in bytes (can be string or number)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted file size string
 */
export function formatFileSize(size: string | number, decimals: number = 2): string {
  const bytes = typeof size === 'string' ? Number(size) : size;
  
  // Handle invalid/zero cases
  if (isNaN(bytes) || bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [
    "Bytes",
    "KB", 
    "MB",
    "GB",
    "TB",
    "PB",
    "EB",
    "ZB", 
    "YB",
  ];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return (
    parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) +
    " " +
    sizes[i]
  );
}
