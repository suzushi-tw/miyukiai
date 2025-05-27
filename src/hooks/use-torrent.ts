import { useState, useCallback } from 'react';
import { torrentService, TorrentInfo } from '@/lib/torrent-service';

export function useTorrent() {
  const [isCreatingTorrent, setIsCreatingTorrent] = useState(false);
  const [torrentProgress, setTorrentProgress] = useState(0);

  const createTorrent = useCallback(async (
    file: File, 
    options?: {
      name?: string;
      comment?: string;
      announce?: string[];
    }
  ): Promise<TorrentInfo | null> => {
    try {
      setIsCreatingTorrent(true);
      setTorrentProgress(0);

      // Simulate progress for UI feedback
      const progressInterval = setInterval(() => {
        setTorrentProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const torrentInfo = await torrentService.createTorrent(file, options);
      
      clearInterval(progressInterval);
      setTorrentProgress(100);

      setTimeout(() => {
        setIsCreatingTorrent(false);
        setTorrentProgress(0);
      }, 1000);

      return torrentInfo;
    } catch (error) {
      console.error('Failed to create torrent:', error);
      setIsCreatingTorrent(false);
      setTorrentProgress(0);
      return null;
    }
  }, []);

  const createTorrentFromUrl = useCallback(async (
    fileUrl: string,
    fileName: string,
    options?: {
      name?: string;
      comment?: string;
      announce?: string[];
    }
  ): Promise<TorrentInfo | null> => {
    try {
      setIsCreatingTorrent(true);
      setTorrentProgress(0);

      // Simulate progress for UI feedback
      const progressInterval = setInterval(() => {
        setTorrentProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      const torrentInfo = await torrentService.createTorrentFromUrl(fileUrl, fileName, options);
      
      clearInterval(progressInterval);
      setTorrentProgress(100);

      setTimeout(() => {
        setIsCreatingTorrent(false);
        setTorrentProgress(0);
      }, 1000);

      return torrentInfo;
    } catch (error) {
      console.error('Failed to create torrent from URL:', error);
      setIsCreatingTorrent(false);
      setTorrentProgress(0);
      return null;
    }
  }, []);

  const startSeeding = useCallback(async (magnetURI: string) => {
    try {
      await torrentService.startSeeding(magnetURI);
    } catch (error) {
      console.error('Failed to start seeding:', error);
    }
  }, []);

  const stopSeeding = useCallback((infoHash: string) => {
    torrentService.stopSeeding(infoHash);
  }, []);

  const getSeedingStatus = useCallback(() => {
    return torrentService.getSeedingStatus();
  }, []);

  return {
    createTorrent,
    createTorrentFromUrl,
    startSeeding,
    stopSeeding,
    getSeedingStatus,
    isCreatingTorrent,
    torrentProgress
  };
}