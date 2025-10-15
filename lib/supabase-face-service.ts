/**
 * Supabase Face Service
 * Handles face embeddings storage and retrieval using Supabase
 */

import { supabaseService, supabase } from './supabase';
import { validateEmbedding, normalizeEmbedding } from './face-matching';
import { logger } from './logger';

export interface FaceEmbeddingRecord {
  id: string;
  user_id: string;
  embedding: number[];
  quality: number;
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class SupabaseFaceService {
  private tableName = 'face_embeddings';

  /**
   * Save a face embedding for a user
   */
  async saveFaceEmbedding(
    userId: string,
    embedding: number[] | Float32Array,
    quality: number = 0.8,
    metadata: Record<string, any> = {}
  ): Promise<FaceEmbeddingRecord> {
    try {
      // Convert Float32Array to regular array if needed
      const embeddingArray = Array.from(embedding);

      // Validate embedding
      if (!validateEmbedding(embeddingArray)) {
        throw new Error('Invalid face embedding');
      }

      // Normalize the embedding for better matching consistency
      const normalizedEmbedding = Array.from(normalizeEmbedding(embeddingArray));

      // Check existing embeddings count for this user
      const { count, error: countError } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (countError) {
        logger.error('Error counting face embeddings', countError);
        throw countError;
      }

      if (count && count >= 3) {
        throw new Error('Maximum number of face enrollments (3) reached. Please delete an old enrollment first.');
      }

      // Insert the new embedding
      const { data, error } = await supabase
        .from(this.tableName)
        .insert({
          user_id: userId,
          embedding: normalizedEmbedding,
          quality,
          metadata: {
            ...metadata,
            original_length: embeddingArray.length,
            enrolled_at: new Date().toISOString(),
            enrollment_number: (count || 0) + 1,
          },
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error saving face embedding', error);
        throw error;
      }

      logger.info('Face embedding saved successfully', {
        userId,
        embeddingId: data.id,
        quality,
      });

      return data as FaceEmbeddingRecord;
    } catch (error) {
      logger.error('Failed to save face embedding', error as Error);
      throw error;
    }
  }

  /**
   * Get all active face embeddings for a user
   */
  async getUserFaceEmbeddings(userId: string): Promise<FaceEmbeddingRecord[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching user face embeddings', error);
        throw error;
      }

      return (data || []) as FaceEmbeddingRecord[];
    } catch (error) {
      logger.error('Failed to fetch user face embeddings', error as Error);
      throw error;
    }
  }

  /**
   * Get all active face embeddings (for matching)
   */
  async getAllActiveFaceEmbeddings(): Promise<FaceEmbeddingRecord[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching all face embeddings', error);
        throw error;
      }

      return (data || []) as FaceEmbeddingRecord[];
    } catch (error) {
      logger.error('Failed to fetch all face embeddings', error as Error);
      throw error;
    }
  }

  /**
   * Update a face embedding
   */
  async updateFaceEmbedding(
    embeddingId: string,
    updates: Partial<{
      quality: number;
      metadata: Record<string, any>;
      is_active: boolean;
    }>
  ): Promise<FaceEmbeddingRecord> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(updates)
        .eq('id', embeddingId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating face embedding', error);
        throw error;
      }

      logger.info('Face embedding updated successfully', {
        embeddingId,
        updates,
      });

      return data as FaceEmbeddingRecord;
    } catch (error) {
      logger.error('Failed to update face embedding', error as Error);
      throw error;
    }
  }

  /**
   * Delete a face embedding
   */
  async deleteFaceEmbedding(embeddingId: string, userId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from(this.tableName)
        .delete()
        .eq('id', embeddingId);

      // If userId is provided, ensure the embedding belongs to that user
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;

      if (error) {
        logger.error('Error deleting face embedding', error);
        throw error;
      }

      logger.info('Face embedding deleted successfully', {
        embeddingId,
        userId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete face embedding', error as Error);
      throw error;
    }
  }

  /**
   * Deactivate a face embedding (soft delete)
   */
  async deactivateFaceEmbedding(embeddingId: string, userId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from(this.tableName)
        .update({ is_active: false })
        .eq('id', embeddingId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;

      if (error) {
        logger.error('Error deactivating face embedding', error);
        throw error;
      }

      logger.info('Face embedding deactivated successfully', {
        embeddingId,
        userId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to deactivate face embedding', error as Error);
      throw error;
    }
  }

  /**
   * Get face embeddings by user IDs
   */
  async getFaceEmbeddingsByUserIds(userIds: string[]): Promise<FaceEmbeddingRecord[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .in('user_id', userIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching face embeddings by user IDs', error);
        throw error;
      }

      return (data || []) as FaceEmbeddingRecord[];
    } catch (error) {
      logger.error('Failed to fetch face embeddings by user IDs', error as Error);
      throw error;
    }
  }

  /**
   * Clean up old/inactive embeddings
   */
  async cleanupOldEmbeddings(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('is_active', false)
        .lt('updated_at', cutoffDate.toISOString())
        .select();

      if (error) {
        logger.error('Error cleaning up old embeddings', error);
        throw error;
      }

      const deletedCount = data?.length || 0;
      logger.info(`Cleaned up ${deletedCount} old face embeddings`);

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old embeddings', error as Error);
      throw error;
    }
  }

  /**
   * Get statistics about face embeddings
   */
  async getStatistics(): Promise<{
    totalEmbeddings: number;
    activeEmbeddings: number;
    usersWithEmbeddings: number;
    averageQuality: number;
  }> {
    try {
      // Get total and active counts
      const { count: totalCount } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      const { count: activeCount } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get unique users count
      const { data: users } = await supabase
        .from(this.tableName)
        .select('user_id')
        .eq('is_active', true);

      const uniqueUsers = new Set(users?.map(u => u.user_id) || []);

      // Get average quality
      const { data: qualityData } = await supabase
        .from(this.tableName)
        .select('quality')
        .eq('is_active', true);

      const avgQuality = qualityData && qualityData.length > 0
        ? qualityData.reduce((sum, item) => sum + item.quality, 0) / qualityData.length
        : 0;

      return {
        totalEmbeddings: totalCount || 0,
        activeEmbeddings: activeCount || 0,
        usersWithEmbeddings: uniqueUsers.size,
        averageQuality: avgQuality,
      };
    } catch (error) {
      logger.error('Failed to get face embeddings statistics', error as Error);
      throw error;
    }
  }

  /**
   * Batch save multiple face embeddings (for migration)
   */
  async batchSaveFaceEmbeddings(
    embeddings: Array<{
      userId: string;
      embedding: number[];
      quality?: number;
      metadata?: Record<string, any>;
    }>
  ): Promise<FaceEmbeddingRecord[]> {
    try {
      const normalizedData = embeddings.map(item => ({
        user_id: item.userId,
        embedding: Array.from(normalizeEmbedding(item.embedding)),
        quality: item.quality || 0.8,
        metadata: item.metadata || {},
        is_active: true,
      }));

      const { data, error } = await supabase
        .from(this.tableName)
        .insert(normalizedData)
        .select();

      if (error) {
        logger.error('Error batch saving face embeddings', error);
        throw error;
      }

      logger.info(`Batch saved ${data?.length || 0} face embeddings`);
      return (data || []) as FaceEmbeddingRecord[];
    } catch (error) {
      logger.error('Failed to batch save face embeddings', error as Error);
      throw error;
    }
  }
}

// Create singleton instance
export const supabaseFaceService = new SupabaseFaceService();

// Export helper functions for backward compatibility
export const saveFaceEmbedding = (
  userId: string,
  embedding: number[] | Float32Array,
  quality?: number,
  metadata?: Record<string, any>
) => supabaseFaceService.saveFaceEmbedding(userId, embedding, quality, metadata);

export const getUserFaceEmbeddings = (userId: string) =>
  supabaseFaceService.getUserFaceEmbeddings(userId);

export const getAllActiveFaceEmbeddings = () =>
  supabaseFaceService.getAllActiveFaceEmbeddings();

export const deleteFaceEmbedding = (embeddingId: string, userId?: string) =>
  supabaseFaceService.deleteFaceEmbedding(embeddingId, userId);
