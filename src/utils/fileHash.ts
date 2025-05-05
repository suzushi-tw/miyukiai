/**
 * Calculate file hash using Web Worker to prevent UI blocking
 * Works well with large files (6-15GB) by processing in chunks
 */
export async function calculateFileHash(file: File, 
  progressCallback?: (progress: number) => void): Promise<string> {
  
  return new Promise((resolve, reject) => {
    // Create a web worker for non-blocking hash computation
    const worker = new Worker('/workers/hashWorker.js');
    
    worker.onmessage = (e) => {
      if (e.data.type === 'progress') {
        progressCallback?.(e.data.progress);
      } else if (e.data.type === 'complete') {
        resolve(e.data.hash);
        worker.terminate();
      } else if (e.data.type === 'error') {
        reject(new Error(e.data.message));
        worker.terminate();
      }
    };
    
    worker.onerror = (e) => {
      reject(new Error('Hash computation failed'));
      worker.terminate();
    };
    
    // Start the worker with the file
    worker.postMessage({ file });
  });
}