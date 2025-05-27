// Global WebTorrent interface for CDN version
declare global {
  interface Window {
    WebTorrent?: any;
  }
}

interface TorrentInfo {
  magnetURI: string;
  infoHash: string;
  torrentFile: Buffer;
  name?: string;
  size?: number;
}

interface TorrentSeedingStatus {
  infoHash: string;
  name: string;
  uploaded: number;
  downloaded: number;
  peers: number;
  seeds: number;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
}

class TorrentService {
  private client: any = null;
  private seeders: Map<string, any> = new Map();
  private isWebTorrentReady = false;
  private readyCallbacks: (() => void)[] = [];

  constructor() {
    // Initialize WebTorrent client only in browser environment using CDN
    if (typeof window !== 'undefined') {
      this.initializeWebTorrent();
    }
  }

  private async initializeWebTorrent(): Promise<void> {
    // Check if WebTorrent is already loaded
    if (window.WebTorrent) {
      this.client = new window.WebTorrent();
      this.isWebTorrentReady = true;
      this.readyCallbacks.forEach(callback => callback());
      this.readyCallbacks = [];
      return;
    }

    // Load WebTorrent from CDN
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js';
      script.async = true;
      
      script.onload = () => {
        if (window.WebTorrent) {
          this.client = new window.WebTorrent({
            tracker: {
              wrtc: true,
              maxWebConns: 10,
            },
            dht: false, // Disable DHT for browser-only usage
          });
          this.isWebTorrentReady = true;
          this.readyCallbacks.forEach(callback => callback());
          this.readyCallbacks = [];
          resolve();
        } else {
          reject(new Error('WebTorrent failed to load'));
        }
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load WebTorrent script'));
      };
      
      document.head.appendChild(script);
    });
  }

  private waitForReady(): Promise<void> {
    if (this.isWebTorrentReady && this.client) {
      return Promise.resolve();
    }
    
    return new Promise((resolve) => {
      this.readyCallbacks.push(resolve);
    });
  }
  async createTorrentFromUrl(
    fileUrl: string, 
    fileName: string,
    options?: {
      name?: string;
      comment?: string;
      announce?: string[];
    }
  ): Promise<TorrentInfo | null> {
    await this.waitForReady();
    
    if (!this.client) {
      console.error('WebTorrent client not initialized');
      return null;
    }

    try {
      // Fetch the file from the URL
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch file from URL');
      }
      
      const fileBuffer = await response.arrayBuffer();
      const file = new File([fileBuffer], fileName);

      return this.createTorrent(file, options);
    } catch (error) {
      console.error('Error creating torrent from URL:', error);
      return null;
    }
  }

  async createTorrent(file: File, options?: {
    announce?: string[];
    name?: string;
    comment?: string;
  }): Promise<TorrentInfo | null> {
    await this.waitForReady();
    
    if (!this.client) {
      console.error('WebTorrent client not initialized');
      return null;
    }

    return new Promise((resolve, reject) => {
      const torrentOpts = {
        name: options?.name || file.name,
        comment: options?.comment || `AI Model: ${file.name}`,
        announce: options?.announce || [
          'wss://tracker.openwebtorrent.com',
          'wss://tracker.btorrent.xyz',
          'wss://tracker.webtorrent.dev',
          'udp://tracker.openbittorrent.com:80',
          'udp://tracker.opentrackr.org:1337/announce'
        ],
        createdBy: 'MiyukiAI',
        private: false
      };

      this.client.seed(file, torrentOpts, (torrent: any) => {
        const torrentInfo: TorrentInfo = {
          magnetURI: torrent.magnetURI,
          infoHash: torrent.infoHash,
          torrentFile: torrent.torrentFile
        };

        // Store the seeder reference
        this.seeders.set(torrent.infoHash, torrent);

        resolve(torrentInfo);
      });
    });
  }
  async startSeeding(magnetURI: string): Promise<void> {
    await this.waitForReady();
    
    if (!this.client) {
      throw new Error('WebTorrent client not initialized');
    }

    return new Promise((resolve, reject) => {
      const torrent = this.client.add(magnetURI);
      
      torrent.on('ready', () => {
        this.seeders.set(torrent.infoHash, torrent);
        console.log(`Started seeding: ${torrent.name}`);
        resolve();
      });

      torrent.on('error', reject);
    });
  }

  stopSeeding(infoHash: string): void {
    const torrent = this.seeders.get(infoHash);
    if (torrent) {
      torrent.destroy();
      this.seeders.delete(infoHash);
      console.log(`Stopped seeding: ${infoHash}`);
    }
  }
  getSeedingStatus(): TorrentSeedingStatus[] {
    return Array.from(this.seeders.values()).map((torrent: any) => ({
      infoHash: torrent.infoHash,
      name: torrent.name || 'Unknown',
      uploaded: torrent.uploaded,
      downloaded: torrent.downloaded,
      peers: torrent.numPeers,
      seeds: torrent.numPeers, // WebTorrent doesn't distinguish seeds from peers
      progress: torrent.progress,
      downloadSpeed: torrent.downloadSpeed,
      uploadSpeed: torrent.uploadSpeed
    }));
  }

  isReady(): boolean {
    return this.isWebTorrentReady && !!this.client;
  }

  destroy(): void {
    if (this.client) {
      this.client.destroy();
      this.seeders.clear();
      this.isWebTorrentReady = false;
    }
  }

  async downloadWithTimeout(
    magnetURI: string, 
    fallbackUrl: string, 
    fileName: string,
    timeoutMs: number = 30000
  ): Promise<boolean> {
    await this.waitForReady();
    
    if (!this.client) {
      console.error('WebTorrent client not initialized');
      // Fallback to direct download
      window.location.href = fallbackUrl;
      return false;
    }

    try {
      return await Promise.race([
        // Try to start torrent download
        new Promise<boolean>((resolve) => {
          const torrent = this.client.add(magnetURI);
          
          torrent.on('ready', () => {
            console.log(`Torrent ready: ${torrent.name}, downloading via P2P`);
            
            // Create download link for the first file
            if (torrent.files && torrent.files.length > 0) {
              const file = torrent.files[0];
              file.getBlobURL((err: any, url: string) => {
                if (err) {
                  console.error('Error getting blob URL:', err);
                  resolve(false);
                  return;
                }
                
                // Create download link
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                // Clean up
                setTimeout(() => {
                  URL.revokeObjectURL(url);
                  torrent.destroy();
                }, 1000);
                
                resolve(true);
              });
            } else {
              resolve(false);
            }
          });

          torrent.on('error', (error: any) => {
            console.error('Torrent error:', error);
            resolve(false);
          });
        }),
        
        // Timeout fallback
        new Promise<boolean>((resolve) => {
          setTimeout(() => {
            console.log('Torrent download timeout, falling back to direct download');
            resolve(false);
          }, timeoutMs);
        })
      ]);
    } catch (error) {
      console.error('Error in downloadWithTimeout:', error);
      return false;
    }
  }
}

export const torrentService = new TorrentService();
export type { TorrentInfo };