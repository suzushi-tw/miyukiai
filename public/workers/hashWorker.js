// File hash worker using SparkMD5
self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/spark-md5/3.0.2/spark-md5.min.js');

self.onmessage = async (e) => {
  const { file } = e.data;
  const chunkSize = 2 * 1024 * 1024; // 2MB chunks
  const chunks = Math.ceil(file.size / chunkSize);
  const spark = new SparkMD5.ArrayBuffer();
  
  let currentChunk = 0;
  
  const processChunk = async (chunk) => {
    const fileReader = new FileReader();
    
    return new Promise((resolve, reject) => {
      fileReader.onload = (e) => {
        spark.append(e.target.result);
        currentChunk++;
        
        const progress = Math.round((currentChunk / chunks) * 100);
        self.postMessage({ type: 'progress', progress });
        
        resolve();
      };
      
      fileReader.onerror = reject;
      
      const start = chunk * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      fileReader.readAsArrayBuffer(file.slice(start, end));
    });
  };
  
  try {
    // Process chunks sequentially
    for (let i = 0; i < chunks; i++) {
      await processChunk(i);
    }
    
    // Get the final hash
    const hash = spark.end();
    self.postMessage({ type: 'complete', hash });
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
  }
};