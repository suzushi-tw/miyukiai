self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');

self.onmessage = async (e) => {
  const { file } = e.data;
  const chunkSize = 2 * 1024 * 1024; // 2MB chunks
  const chunks = Math.ceil(file.size / chunkSize);
  let sha256 = CryptoJS.algo.SHA256.create();
  
  let currentChunk = 0;
  
  const processChunk = async (chunk) => {
    const fileReader = new FileReader();
    
    return new Promise((resolve, reject) => {
      fileReader.onload = (e) => {
        // Convert ArrayBuffer to WordArray that CryptoJS can use
        const wordArray = CryptoJS.lib.WordArray.create(e.target.result);
        sha256.update(wordArray);
        
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
    const hash = sha256.finalize().toString();
    self.postMessage({ type: 'complete', hash });
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
  }
};