/**
 * Face Storage Library
 * Provides face embedding storage, retrieval, compression, and database management
 * Optimized for offline operation on DS223J hardware
 */

import { FaceEmbedding } from './face-recognition';

import { logger, logApiError, logApiRequest } from '@/lib/logger'
export interface FaceStorageOptions {
  compressionEnabled?: boolean;
  compressionLevel?: number; // 0-9, where 9 is highest compression
  maxStorageSize?: number; // in MB
  cleanupInterval?: number; // in minutes
  backupEnabled?: boolean;
  backupInterval?: number; // in minutes
}

export interface FaceDatabaseStats {
  totalFaces: number;
  totalUsers: number;
  storageSize: number;
  lastBackup?: Date;
  lastCleanup?: Date;
}

export class FaceStorage {
  private db: IDBDatabase | null = null;
  private dbName = 'FaceRecognitionDB';
  private storeName = 'faceEmbeddings';
  private options: FaceStorageOptions;
  private cleanupTimer?: NodeJS.Timeout;
  private backupTimer?: NodeJS.Timeout;

  constructor(options: FaceStorageOptions = {}) {
    this.options = {
      compressionEnabled: true,
      compressionLevel: 6,
      maxStorageSize: 50, // 50MB default
      cleanupInterval: 60, // 1 hour
      backupEnabled: true,
      backupInterval: 1440, // 24 hours
      ...options,
    };
  }

  /**
   * Initialize the face storage database
   */
  async initialize(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await this.openDatabase();
      this.startMaintenanceTasks();
      logger.info('Face storage database initialized');
    } catch (error) {
      logger.error('Failed to initialize face storage database', error as Error);
      throw new Error('Face storage database initialization failed');
    }
  }

  /**
   * Open the IndexedDB database
   */
  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        reject(new Error(`Database error: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store for face embeddings
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  /**
   * Store a face embedding
   */
  async storeFaceEmbedding(embedding: FaceEmbedding): Promise<string> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      // Compress embedding if enabled
      const dataToStore = this.options.compressionEnabled
        ? this.compressEmbedding(embedding)
        : embedding;

      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.put(dataToStore);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve(embedding.id);
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to store face embedding: ${request.error?.message}`));
        };
      });
    } catch (error) {
      logger.error('Failed to store face embedding', error as Error);
      throw new Error('Failed to store face embedding');
    }
  }

  /**
   * Retrieve a face embedding by ID
   */
  async getFaceEmbedding(id: string): Promise<FaceEmbedding | null> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.get(id);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result;
          if (!result) {
            resolve(null);
            return;
          }
          
          // Decompress embedding if it was compressed
          const embedding = this.options.compressionEnabled
            ? this.decompressEmbedding(result)
            : result;
          
          resolve(embedding);
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to retrieve face embedding: ${request.error?.message}`));
        };
      });
    } catch (error) {
      logger.error('Failed to retrieve face embedding', error as Error);
      throw new Error('Failed to retrieve face embedding');
    }
  }

  /**
   * Get all face embeddings for a user
   */
  async getFaceEmbeddingsByUser(userId: string): Promise<FaceEmbedding[]> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('userId');
      
      const request = index.getAll(userId);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const results = request.result;
          
          // Decompress embeddings if they were compressed
          const embeddings = this.options.compressionEnabled
            ? results.map(result => this.decompressEmbedding(result))
            : results;
          
          resolve(embeddings);
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to retrieve face embeddings: ${request.error?.message}`));
        };
      });
    } catch (error) {
      logger.error('Failed to retrieve face embeddings', error as Error);
      throw new Error('Failed to retrieve face embeddings');
    }
  }

  /**
   * Get all face embeddings
   */
  async getAllFaceEmbeddings(): Promise<FaceEmbedding[]> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.getAll();
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const results = request.result;
          
          // Decompress embeddings if they were compressed
          const embeddings = this.options.compressionEnabled
            ? results.map(result => this.decompressEmbedding(result))
            : results;
          
          resolve(embeddings);
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to retrieve all face embeddings: ${request.error?.message}`));
        };
      });
    } catch (error) {
      logger.error('Failed to retrieve all face embeddings', error as Error);
      throw new Error('Failed to retrieve all face embeddings');
    }
  }

  /**
   * Delete a face embedding
   */
  async deleteFaceEmbedding(id: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.delete(id);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to delete face embedding: ${request.error?.message}`));
        };
      });
    } catch (error) {
      logger.error('Failed to delete face embedding', error as Error);
      throw new Error('Failed to delete face embedding');
    }
  }

  /**
   * Delete all face embeddings for a user
   */
  async deleteFaceEmbeddingsByUser(userId: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const embeddings = await this.getFaceEmbeddingsByUser(userId);
      
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      for (const embedding of embeddings) {
        store.delete(embedding.id);
      }
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          resolve();
        };
        
        transaction.onerror = () => {
          reject(new Error(`Failed to delete face embeddings: ${transaction.error?.message}`));
        };
      });
    } catch (error) {
      logger.error('Failed to delete face embeddings', error as Error);
      throw new Error('Failed to delete face embeddings');
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<FaceDatabaseStats> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const embeddings = await this.getAllFaceEmbeddings();
      const uniqueUsers = new Set(embeddings.map(e => e.userId)).size;
      
      // Calculate storage size (approximate)
      const storageSize = this.calculateStorageSize(embeddings);
      
      // Get last backup and cleanup times from metadata
      const lastBackup = await this.getMetadata('lastBackup');
      const lastCleanup = await this.getMetadata('lastCleanup');
      
      return {
        totalFaces: embeddings.length,
        totalUsers: uniqueUsers,
        storageSize,
        lastBackup: lastBackup ? new Date(lastBackup) : undefined,
        lastCleanup: lastCleanup ? new Date(lastCleanup) : undefined,
      };
    } catch (error) {
      logger.error('Failed to get database stats', error as Error);
      throw new Error('Failed to get database stats');
    }
  }

  /**
   * Backup face data
   */
  async backupFaceData(): Promise<string> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const embeddings = await this.getAllFaceEmbeddings();
      const backupData = {
        timestamp: new Date().toISOString(),
        embeddings,
      };
      
      const backupJson = JSON.stringify(backupData);
      const compressedData = this.options.compressionEnabled
        ? this.compressString(backupJson)
        : backupJson;
      
      // Store backup in localStorage or download as file
      const backupId = `face_backup_${Date.now()}`;
      localStorage.setItem(backupId, compressedData);
      
      // Update metadata
      await this.setMetadata('lastBackup', new Date().toISOString());
      
      return backupId;
    } catch (error) {
      logger.error('Failed to backup face data', error as Error);
      throw new Error('Failed to backup face data');
    }
  }

  /**
   * Restore face data from backup
   */
  async restoreFaceData(backupId: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const compressedData = localStorage.getItem(backupId);
      if (!compressedData) {
        throw new Error('Backup not found');
      }
      
      const backupJson = this.options.compressionEnabled
        ? this.decompressString(compressedData)
        : compressedData;
      
      const backupData = JSON.parse(backupJson);
      
      // Clear existing data
      await this.clearAllFaceEmbeddings();
      
      // Restore embeddings
      for (const embedding of backupData.embeddings) {
        await this.storeFaceEmbedding(embedding);
      }
      
      logger.info('Face data restored successfully');
    } catch (error) {
      logger.error('Failed to restore face data', error as Error);
      throw new Error('Failed to restore face data');
    }
  }

  /**
   * Clean up old or low-quality face data
   */
  async cleanupFaceData(): Promise<number> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const embeddings = await this.getAllFaceEmbeddings();
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      let deletedCount = 0;
      
      // Group embeddings by user
      const userEmbeddings: Record<string, FaceEmbedding[]> = {};
      embeddings.forEach(embedding => {
        if (!userEmbeddings[embedding.userId]) {
          userEmbeddings[embedding.userId] = [];
        }
        userEmbeddings[embedding.userId].push(embedding);
      });
      
      // For each user, keep only the best embeddings
      for (const userId in userEmbeddings) {
        const userFaces = userEmbeddings[userId];
        
        // Sort by quality (metadata.quality) and date
        userFaces.sort((a, b) => {
          const aQuality = a.metadata?.quality || 0.5;
          const bQuality = b.metadata?.quality || 0.5;
          const aDate = new Date(a.createdAt).getTime();
          const bDate = new Date(b.createdAt).getTime();
          
          // Prefer higher quality and more recent embeddings
          if (Math.abs(aQuality - bQuality) > 0.1) {
            return bQuality - aQuality;
          }
          return bDate - aDate;
        });
        
        // Keep at most 5 embeddings per user
        const embeddingsToKeep = userFaces.slice(0, 5);
        const embeddingsToDelete = userFaces.slice(5);
        
        // Also delete embeddings older than 30 days
        const oldEmbeddings = embeddingsToKeep.filter(
          e => new Date(e.createdAt) < thirtyDaysAgo
        );
        
        // Delete old and excess embeddings
        for (const embedding of [...embeddingsToDelete, ...oldEmbeddings]) {
          await this.deleteFaceEmbedding(embedding.id);
          deletedCount++;
        }
      }
      
      // Update metadata
      await this.setMetadata('lastCleanup', new Date().toISOString());
      
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup face data', error as Error);
      throw new Error('Failed to cleanup face data');
    }
  }

  /**
   * Clear all face embeddings
   */
  async clearAllFaceEmbeddings(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.clear();
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = () => {
          reject(new Error(`Failed to clear face embeddings: ${request.error?.message}`));
        };
      });
    } catch (error) {
      logger.error('Failed to clear face embeddings', error as Error);
      throw new Error('Failed to clear face embeddings');
    }
  }

  /**
   * Compress face embedding for storage
   */
  private compressEmbedding(embedding: FaceEmbedding): any {
    // In a real implementation, this would use a compression algorithm
    // For now, we'll just convert the Float32Array to a regular array
    return {
      ...embedding,
      embedding: Array.from(embedding.embedding),
      compressed: true,
    };
  }

  /**
   * Decompress face embedding after retrieval
   */
  private decompressEmbedding(compressed: any): FaceEmbedding {
    // In a real implementation, this would decompress the data
    // For now, we'll just convert the array back to Float32Array
    return {
      ...compressed,
      embedding: new Float32Array(compressed.embedding),
      compressed: false,
    };
  }

  /**
   * Compress a string
   */
  private compressString(str: string): string {
    // In a real implementation, this would use a compression algorithm
    // For now, we'll just return the original string
    return str;
  }

  /**
   * Decompress a string
   */
  private decompressString(compressed: string): string {
    // In a real implementation, this would decompress the string
    // For now, we'll just return the original string
    return compressed;
  }

  /**
   * Calculate storage size of embeddings
   */
  private calculateStorageSize(embeddings: FaceEmbedding[]): number {
    // Approximate calculation
    let size = 0;
    
    for (const embedding of embeddings) {
      // ID: ~36 bytes
      size += 36;
      
      // User ID: ~36 bytes
      size += 36;
      
      // Embedding: 128 floats * 4 bytes each = 512 bytes
      size += 512;
      
      // Metadata: ~100 bytes
      size += 100;
      
      // Dates: ~50 bytes
      size += 50;
    }
    
    return size / (1024 * 1024); // Convert to MB
  }

  /**
   * Get metadata value
   */
  private async getMetadata(key: string): Promise<string | null> {
    return localStorage.getItem(`face_${key}`);
  }

  /**
   * Set metadata value
   */
  private async setMetadata(key: string, value: string): Promise<void> {
    localStorage.setItem(`face_${key}`, value);
  }

  /**
   * Start maintenance tasks (cleanup and backup)
   */
  private startMaintenanceTasks(): void {
    // Start cleanup timer
    if (this.options.cleanupInterval && this.options.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(async () => {
        try {
          await this.cleanupFaceData();
          logger.info('Face data cleanup completed');
        } catch (error) {
          logger.error('Face data cleanup failed', error as Error);
        }
      }, this.options.cleanupInterval * 60 * 1000);
    }
    
    // Start backup timer
    if (this.options.backupEnabled && this.options.backupInterval && this.options.backupInterval > 0) {
      this.backupTimer = setInterval(async () => {
        try {
          await this.backupFaceData();
          logger.info('Face data backup completed');
        } catch (error) {
          logger.error('Face data backup failed', error as Error);
        }
      }, this.options.backupInterval * 60 * 1000);
    }
  }

  /**
   * Stop maintenance tasks
   */
  private stopMaintenanceTasks(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = undefined;
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    this.stopMaintenanceTasks();
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
export const faceStorage = new FaceStorage();