/**
 * Log Search and Filtering System
 * Provides advanced search and filtering capabilities for logs
 * Optimized for DS223J hardware constraints
 */

import { LogEntry, LogLevel } from './structured-logger';

export interface SearchQuery {
  text?: string;
  level?: LogLevel | LogLevel[];
  component?: string | string[];
  action?: string | string[];
  userId?: string | string[];
  sessionId?: string | string[];
  tags?: string | string[];
  startTime?: Date;
  endTime?: Date;
  durationMin?: number;
  durationMax?: number;
  hasError?: boolean;
  customFilters?: CustomFilter[];
}

export interface CustomFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between';
  value: any;
  caseSensitive?: boolean;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'level' | 'component' | 'duration';
  sortOrder?: 'asc' | 'desc';
  includeContext?: boolean;
  highlightMatches?: boolean;
}

export interface SearchResult {
  entries: LogEntry[];
  total: number;
  query: SearchQuery;
  options: SearchOptions;
  executionTime: number;
  facets: SearchFacets;
}

export interface SearchFacets {
  levels: Record<string, number>;
  components: Record<string, number>;
  actions: Record<string, number>;
  users: Record<string, number>;
  sessions: Record<string, number>;
  tags: Record<string, number>;
  timeRanges: Record<string, number>;
}

export interface SearchIndex {
  terms: Map<string, Set<string>>; // term -> log IDs
  metadata: Map<string, LogEntry>; // log ID -> log entry
  fieldIndexes: Map<string, Map<string, Set<string>>>; // field -> value -> log IDs
}

export class LogSearchEngine {
  private index: SearchIndex;
  private indexedLogs: Map<string, LogEntry>;
  private indexingEnabled: boolean;
  private maxIndexSize: number;

  constructor(options: { enableIndexing?: boolean; maxIndexSize?: number } = {}) {
    this.indexingEnabled = options.enableIndexing !== false;
    this.maxIndexSize = options.maxIndexSize || 10000;
    this.indexedLogs = new Map();
    this.index = {
      terms: new Map(),
      metadata: new Map(),
      fieldIndexes: new Map(),
    };
  }

  /**
   * Add log entries to the search index
   */
  addLogs(logs: LogEntry[]): void {
    if (!this.indexingEnabled) {
      return;
    }

    for (const log of logs) {
      this.addLogToIndex(log);
    }

    // Maintain index size
    this.maintainIndexSize();
  }

  /**
   * Add a single log entry to the search index
   */
  private addLogToIndex(log: LogEntry): void {
    const logId = log.id;
    this.indexedLogs.set(logId, log);
    this.index.metadata.set(logId, log);

    // Index text terms
    this.indexTextTerms(logId, log.message);

    // Index context fields
    if (log.context) {
      this.indexContext(logId, log.context);
    }

    // Index structured fields
    this.indexField(logId, 'level', LogLevel[log.level]);
    this.indexField(logId, 'component', log.component);
    this.indexField(logId, 'action', log.action);
    this.indexField(logId, 'userId', log.userId);
    this.indexField(logId, 'sessionId', log.sessionId);
    this.indexField(logId, 'duration', log.duration);

    // Index tags
    if (log.tags) {
      for (const tag of log.tags) {
        this.indexField(logId, 'tag', tag);
      }
    }

    // Index error information
    if (log.error) {
      this.indexField(logId, 'hasError', 'true');
      this.indexTextTerms(logId, log.error.name);
      this.indexTextTerms(logId, log.error.message);
    }
  }

  /**
   * Index text terms for full-text search
   */
  private indexTextTerms(logId: string, text: string): void {
    if (!text) return;

    const terms = this.extractTerms(text);
    for (const term of terms) {
      if (!this.index.terms.has(term)) {
        this.index.terms.set(term, new Set());
      }
      this.index.terms.get(term)!.add(logId);
    }
  }

  /**
   * Extract searchable terms from text
   */
  private extractTerms(text: string): string[] {
    // Convert to lowercase and split on non-alphanumeric characters
    return text
      .toLowerCase()
      .split(/[^\w]+/)
      .filter(term => term.length > 2) // Only keep terms longer than 2 characters
      .filter(term => !this.isStopWord(term)); // Remove stop words
  }

  /**
   * Check if a term is a stop word
   */
  private isStopWord(term: string): boolean {
    const stopWords = [
      'the', 'and', 'or', 'but', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
      'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most',
      'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
      'too', 'very', 'can', 'will', 'just', 'don', 'should', 'now', 'was', 'were', 'been',
      'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'am', 'is', 'are',
      'was', 'were', 'be', 'been', 'being'
    ];
    return stopWords.includes(term);
  }

  /**
   * Index context fields
   */
  private indexContext(logId: string, context: Record<string, any>): void {
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string') {
        this.indexTextTerms(logId, value);
      }
      this.indexField(logId, `context.${key}`, value);
    }
  }

  /**
   * Index a field value
   */
  private indexField(logId: string, field: string, value: any): void {
    if (value === undefined || value === null) return;

    if (!this.index.fieldIndexes.has(field)) {
      this.index.fieldIndexes.set(field, new Map());
    }

    const fieldIndex = this.index.fieldIndexes.get(field)!;
    const valueStr = String(value);

    if (!fieldIndex.has(valueStr)) {
      fieldIndex.set(valueStr, new Set());
    }

    fieldIndex.get(valueStr)!.add(logId);
  }

  /**
   * Maintain index size by removing oldest entries
   */
  private maintainIndexSize(): void {
    if (this.indexedLogs.size <= this.maxIndexSize) {
      return;
    }

    // Get logs sorted by timestamp (oldest first)
    const logs = Array.from(this.indexedLogs.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Remove oldest logs
    const toRemove = logs.slice(0, this.indexedLogs.size - this.maxIndexSize);
    for (const log of toRemove) {
      this.removeLogFromIndex(log.id);
    }
  }

  /**
   * Remove a log entry from the index
   */
  private removeLogFromIndex(logId: string): void {
    this.indexedLogs.delete(logId);
    this.index.metadata.delete(logId);

    // Remove from term index
    for (const [term, logIds] of this.index.terms) {
      logIds.delete(logId);
      if (logIds.size === 0) {
        this.index.terms.delete(term);
      }
    }

    // Remove from field indexes
    for (const [field, valueIndex] of this.index.fieldIndexes) {
      for (const [value, logIds] of valueIndex) {
        logIds.delete(logId);
        if (logIds.size === 0) {
          valueIndex.delete(value);
        }
      }
      if (valueIndex.size === 0) {
        this.index.fieldIndexes.delete(field);
      }
    }
  }

  /**
   * Search logs
   */
  search(logs: LogEntry[], query: SearchQuery, options: SearchOptions = {}): SearchResult {
    const startTime = performance.now();

    // Get candidate logs (either from index or all logs)
    let candidateLogs: LogEntry[];
    if (this.indexingEnabled && this.shouldUseIndex(query)) {
      candidateLogs = this.searchWithIndex(query);
    } else {
      candidateLogs = logs;
    }

    // Apply filters
    let filteredLogs = this.applyFilters(candidateLogs, query);

    // Sort results
    filteredLogs = this.sortResults(filteredLogs, options);

    // Apply pagination
    const total = filteredLogs.length;
    const limit = options.limit || 100;
    const offset = options.offset || 0;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    // Highlight matches if requested
    if (options.highlightMatches && query.text) {
      paginatedLogs.forEach(log => this.highlightMatches(log, query.text!));
    }

    // Generate facets
    const facets = this.generateFacets(filteredLogs);

    const executionTime = performance.now() - startTime;

    return {
      entries: paginatedLogs,
      total,
      query,
      options,
      executionTime,
      facets,
    };
  }

  /**
   * Check if index should be used for the query
   */
  private shouldUseIndex(query: SearchQuery): boolean {
    // Use index if there's a text search or field filters that can use the index
    return !!(query.text || 
             query.level || 
             query.component || 
             query.action || 
             query.userId || 
             query.sessionId || 
             query.tags);
  }

  /**
   * Search using the index
   */
  private searchWithIndex(query: SearchQuery): LogEntry[] {
    let candidateIds: Set<string> | null = null;

    // Text search
    if (query.text) {
      const terms = this.extractTerms(query.text);
      const termResults: Set<string>[] = [];

      for (const term of terms) {
        const termIds = this.index.terms.get(term);
        if (termIds) {
          termResults.push(termIds);
        }
      }

      // Intersect results for all terms (AND operation)
      if (termResults.length > 0) {
        candidateIds = termResults[0];
        for (let i = 1; i < termResults.length; i++) {
          candidateIds = new Set([...candidateIds!].filter(x => termResults[i].has(x)));
        }
      }
    }

    // Field filters
    const fieldFilters = [
      { field: 'level', values: query.level },
      { field: 'component', values: query.component },
      { field: 'action', values: query.action },
      { field: 'userId', values: query.userId },
      { field: 'sessionId', values: query.sessionId },
      { field: 'tag', values: query.tags },
      { field: 'hasError', values: query.hasError ? 'true' : undefined },
    ];

    for (const filter of fieldFilters) {
      if (!filter.values) continue;

      const values = Array.isArray(filter.values) ? filter.values : [filter.values];
      const valueIds: Set<string> = new Set();

      for (const value of values) {
        const fieldIndex = this.index.fieldIndexes.get(filter.field);
        if (fieldIndex) {
          const ids = fieldIndex.get(String(value));
          if (ids) {
            for (const id of ids) {
              valueIds.add(id);
            }
          }
        }
      }

      if (candidateIds === null) {
        candidateIds = valueIds;
      } else {
        candidateIds = new Set([...candidateIds].filter(x => valueIds.has(x)));
      }
    }

    // Convert IDs to log entries
    if (candidateIds === null) {
      return Array.from(this.indexedLogs.values());
    }

    const results: LogEntry[] = [];
    for (const id of candidateIds) {
      const log = this.indexedLogs.get(id);
      if (log) {
        results.push(log);
      }
    }

    return results;
  }

  /**
   * Apply filters to logs
   */
  private applyFilters(logs: LogEntry[], query: SearchQuery): LogEntry[] {
    return logs.filter(log => this.matchesQuery(log, query));
  }

  /**
   * Check if a log matches the query
   */
  private matchesQuery(log: LogEntry, query: SearchQuery): boolean {
    // Text search
    if (query.text) {
      const searchText = query.text.toLowerCase();
      const messageMatch = log.message.toLowerCase().includes(searchText);
      const contextMatch = log.context && 
        JSON.stringify(log.context).toLowerCase().includes(searchText);
      
      if (!messageMatch && !contextMatch) {
        return false;
      }
    }

    // Level filter
    if (query.level !== undefined) {
      const levels = Array.isArray(query.level) ? query.level : [query.level];
      if (!levels.includes(log.level)) {
        return false;
      }
    }

    // Component filter
    if (query.component !== undefined) {
      const components = Array.isArray(query.component) ? query.component : [query.component];
      if (!log.component || !components.includes(log.component)) {
        return false;
      }
    }

    // Action filter
    if (query.action !== undefined) {
      const actions = Array.isArray(query.action) ? query.action : [query.action];
      if (!log.action || !actions.includes(log.action)) {
        return false;
      }
    }

    // User ID filter
    if (query.userId !== undefined) {
      const userIds = Array.isArray(query.userId) ? query.userId : [query.userId];
      if (!log.userId || !userIds.includes(log.userId)) {
        return false;
      }
    }

    // Session ID filter
    if (query.sessionId !== undefined) {
      const sessionIds = Array.isArray(query.sessionId) ? query.sessionId : [query.sessionId];
      if (!log.sessionId || !sessionIds.includes(log.sessionId)) {
        return false;
      }
    }

    // Tags filter
    if (query.tags !== undefined) {
      const tags = Array.isArray(query.tags) ? query.tags : [query.tags];
      if (!log.tags || !tags.some(tag => log.tags!.includes(tag))) {
        return false;
      }
    }

    // Time range filter
    if (query.startTime && log.timestamp < query.startTime) {
      return false;
    }
    if (query.endTime && log.timestamp > query.endTime) {
      return false;
    }

    // Duration filter
    if (query.durationMin !== undefined && (!log.duration || log.duration < query.durationMin)) {
      return false;
    }
    if (query.durationMax !== undefined && (!log.duration || log.duration > query.durationMax)) {
      return false;
    }

    // Error filter
    if (query.hasError !== undefined) {
      const hasError = !!log.error;
      if (query.hasError !== hasError) {
        return false;
      }
    }

    // Custom filters
    if (query.customFilters) {
      for (const filter of query.customFilters) {
        if (!this.matchesCustomFilter(log, filter)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if a log matches a custom filter
   */
  private matchesCustomFilter(log: LogEntry, filter: CustomFilter): boolean {
    const value = this.getFieldValue(log, filter.field);
    if (value === undefined || value === null) {
      return false;
    }

    const filterValue = filter.value;
    const actualValue = String(value);
    const compareValue = String(filterValue);

    if (!filter.caseSensitive) {
      return this.compareValues(
        actualValue.toLowerCase(),
        compareValue.toLowerCase(),
        filter.operator
      );
    }

    return this.compareValues(actualValue, compareValue, filter.operator);
  }

  /**
   * Get field value from log
   */
  private getFieldValue(log: LogEntry, field: string): any {
    // Handle nested fields like "context.userId"
    const parts = field.split('.');
    let value: any = log;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Compare values based on operator
   */
  private compareValues(actual: string, filter: string, operator: string): boolean {
    switch (operator) {
      case 'equals':
        return actual === filter;
      case 'not_equals':
        return actual !== filter;
      case 'contains':
        return actual.includes(filter);
      case 'not_contains':
        return !actual.includes(filter);
      case 'starts_with':
        return actual.startsWith(filter);
      case 'ends_with':
        return actual.endsWith(filter);
      case 'greater_than':
        return Number(actual) > Number(filter);
      case 'less_than':
        return Number(actual) < Number(filter);
      case 'between':
        const [min, max] = filter.split(',').map(v => v.trim());
        return Number(actual) >= Number(min) && Number(actual) <= Number(max);
      default:
        return false;
    }
  }

  /**
   * Sort search results
   */
  private sortResults(logs: LogEntry[], options: SearchOptions): LogEntry[] {
    const sortBy = options.sortBy || 'timestamp';
    const sortOrder = options.sortOrder || 'desc';

    return logs.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'timestamp':
          aValue = a.timestamp.getTime();
          bValue = b.timestamp.getTime();
          break;
        case 'level':
          aValue = a.level;
          bValue = b.level;
          break;
        case 'component':
          aValue = a.component || '';
          bValue = b.component || '';
          break;
        case 'duration':
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        default:
          aValue = a.timestamp.getTime();
          bValue = b.timestamp.getTime();
      }

      let comparison = 0;
      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Highlight matches in log message
   */
  private highlightMatches(log: LogEntry, searchText: string): void {
    if (!log.message) return;

    const regex = new RegExp(`(${searchText})`, 'gi');
    const highlighted = log.message.replace(regex, '<mark>$1</mark>');
    
    // Store highlighted message in metadata
    if (!log.metadata) {
      log.metadata = {};
    }
    log.metadata.highlightedMessage = highlighted;
  }

  /**
   * Generate search facets
   */
  private generateFacets(logs: LogEntry[]): SearchFacets {
    const facets: SearchFacets = {
      levels: {},
      components: {},
      actions: {},
      users: {},
      sessions: {},
      tags: {},
      timeRanges: {},
    };

    for (const log of logs) {
      // Level facets
      const levelName = LogLevel[log.level];
      facets.levels[levelName] = (facets.levels[levelName] || 0) + 1;

      // Component facets
      if (log.component) {
        facets.components[log.component] = (facets.components[log.component] || 0) + 1;
      }

      // Action facets
      if (log.action) {
        facets.actions[log.action] = (facets.actions[log.action] || 0) + 1;
      }

      // User facets
      if (log.userId) {
        facets.users[log.userId] = (facets.users[log.userId] || 0) + 1;
      }

      // Session facets
      if (log.sessionId) {
        facets.sessions[log.sessionId] = (facets.sessions[log.sessionId] || 0) + 1;
      }

      // Tag facets
      if (log.tags) {
        for (const tag of log.tags) {
          facets.tags[tag] = (facets.tags[tag] || 0) + 1;
        }
      }

      // Time range facets
      const hour = log.timestamp.getHours();
      const timeRange = `${hour}:00-${hour + 1}:00`;
      facets.timeRanges[timeRange] = (facets.timeRanges[timeRange] || 0) + 1;
    }

    return facets;
  }

  /**
   * Get search suggestions
   */
  getSuggestions(partial: string, field?: string): string[] {
    const suggestions: Set<string> = new Set();
    const partialLower = partial.toLowerCase();

    if (field) {
      // Get suggestions from specific field index
      const fieldIndex = this.index.fieldIndexes.get(field);
      if (fieldIndex) {
        for (const [value] of fieldIndex) {
          if (value.toLowerCase().includes(partialLower)) {
            suggestions.add(value);
          }
        }
      }
    } else {
      // Get suggestions from term index
      for (const [term] of this.index.terms) {
        if (term.includes(partialLower)) {
          suggestions.add(term);
        }
      }
    }

    return Array.from(suggestions).slice(0, 10); // Limit to 10 suggestions
  }

  /**
   * Get index statistics
   */
  getIndexStats(): {
    totalLogs: number;
    totalTerms: number;
    totalFields: number;
    memoryUsage: number;
  } {
    let totalFieldValues = 0;
    for (const fieldIndex of this.index.fieldIndexes.values()) {
      totalFieldValues += fieldIndex.size;
    }

    return {
      totalLogs: this.indexedLogs.size,
      totalTerms: this.index.terms.size,
      totalFields: this.index.fieldIndexes.size,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Estimate memory usage of the index
   */
  private estimateMemoryUsage(): number {
    // This is a rough estimation
    let size = 0;
    
    // Estimate size of indexed logs
    for (const log of this.indexedLogs.values()) {
      size += JSON.stringify(log).length;
    }
    
    // Estimate size of indexes
    for (const [term, logIds] of this.index.terms) {
      size += term.length * 2; // UTF-16 characters
      size += logIds.size * 8; // Assume 8 bytes per ID
    }
    
    for (const [field, valueIndex] of this.index.fieldIndexes) {
      size += field.length * 2;
      for (const [value, logIds] of valueIndex) {
        size += value.length * 2;
        size += logIds.size * 8;
      }
    }
    
    return size;
  }

  /**
   * Clear the search index
   */
  clearIndex(): void {
    this.indexedLogs.clear();
    this.index = {
      terms: new Map(),
      metadata: new Map(),
      fieldIndexes: new Map(),
    };
  }

  /**
   * Enable or disable indexing
   */
  setIndexingEnabled(enabled: boolean): void {
    this.indexingEnabled = enabled;
    if (!enabled) {
      this.clearIndex();
    }
  }

  /**
   * Set maximum index size
   */
  setMaxIndexSize(size: number): void {
    this.maxIndexSize = size;
    this.maintainIndexSize();
  }
}

// Singleton instance with default options
export const logSearchEngine = new LogSearchEngine({
  enableIndexing: true,
  maxIndexSize: 10000,
});

// Export a factory function for easier usage
export function createLogSearchEngine(options?: { enableIndexing?: boolean; maxIndexSize?: number }): LogSearchEngine {
  return new LogSearchEngine(options);
}

// React hook for log search
export function useLogSearch() {
  return {
    search: logSearchEngine.search.bind(logSearchEngine),
    addLogs: logSearchEngine.addLogs.bind(logSearchEngine),
    getSuggestions: logSearchEngine.getSuggestions.bind(logSearchEngine),
    getIndexStats: logSearchEngine.getIndexStats.bind(logSearchEngine),
    clearIndex: logSearchEngine.clearIndex.bind(logSearchEngine),
    setIndexingEnabled: logSearchEngine.setIndexingEnabled.bind(logSearchEngine),
    setMaxIndexSize: logSearchEngine.setMaxIndexSize.bind(logSearchEngine),
  };
}