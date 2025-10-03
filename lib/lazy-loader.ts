/**
 * Lazy Loader
 * Provides lazy loading utilities for heavy components and resources
 * Optimized for DS223J hardware constraints
 */

import React from 'react';

export interface LazyLoaderOptions {
  // Loading options
  enableLazyLoading?: boolean;
  loadingStrategy?: 'on-demand' | 'preload' | 'prefetch';
  loadingThreshold?: number; // px from viewport
  
  // Performance options
  enablePerformanceOptimization?: boolean;
  maxLoadingTime?: number; // ms
  
  // Memory options
  enableMemoryOptimization?: boolean;
  maxLoadedItems?: number;
  
  // Fallback options
  enableFallback?: boolean;
  fallbackComponent?: React.ComponentType<any>;
}

export interface LazyLoadItem {
  id: string;
  load: () => Promise<any>;
  loaded: boolean;
  loading: boolean;
  error: Error | null;
  component: any;
  timestamp: number;
}

export interface LazyLoadResult {
  item: LazyLoadItem;
  success: boolean;
  loadingTime: number;
  error?: Error;
}

export class LazyLoader {
  private options: LazyLoaderOptions;
  private items: Map<string, LazyLoadItem> = new Map();
  private loadedItems: string[] = [];
  private loadingItems: Set<string> = new Set();
  private observers: Map<string, IntersectionObserver> = new Map();
  private loadCallbacks: Map<string, Array<(result: LazyLoadResult) => void>> = new Map();

  constructor(options: LazyLoaderOptions = {}) {
    this.options = {
      enableLazyLoading: true,
      loadingStrategy: 'on-demand',
      loadingThreshold: 200, // 200px from viewport
      enablePerformanceOptimization: true,
      maxLoadingTime: 5000, // 5 seconds
      enableMemoryOptimization: true,
      maxLoadedItems: 10,
      enableFallback: true,
      ...options,
    };
  }

  /**
   * Initialize the lazy loader
   */
  initialize(): void {
    if (!this.options.enableLazyLoading) {
      return;
    }

    console.log('Lazy loader initialized');
  }

  /**
   * Cleanup the lazy loader
   */
  cleanup(): void {
    // Disconnect all observers
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
    
    // Clear all items
    this.items.clear();
    this.loadedItems = [];
    this.loadingItems.clear();
    this.loadCallbacks.clear();
    
    console.log('Lazy loader cleaned up');
  }

  /**
   * Register a lazy load item
   */
  register(
    id: string, 
    load: () => Promise<any>,
    element?: HTMLElement | null
  ): LazyLoadItem {
    // Check if item already exists
    if (this.items.has(id)) {
      return this.items.get(id)!;
    }
    
    // Create lazy load item
    const item: LazyLoadItem = {
      id,
      load,
      loaded: false,
      loading: false,
      error: null,
      component: null,
      timestamp: Date.now(),
    };
    
    // Add to items
    this.items.set(id, item);
    
    // Set up observer if element is provided and strategy is on-demand
    if (element && this.options.loadingStrategy === 'on-demand') {
      this.setupObserver(id, element);
    }
    
    // Preload if strategy is preload
    if (this.options.loadingStrategy === 'preload') {
      this.load(id);
    }
    
    return item;
  }

  /**
   * Set up intersection observer for an element
   */
  private setupObserver(id: string, element: HTMLElement): void {
    // Create observer
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // Element is in viewport, load the item
            this.load(id);
            
            // Disconnect observer after loading
            observer.disconnect();
            this.observers.delete(id);
          }
        }
      },
      {
        rootMargin: `${this.options.loadingThreshold}px`,
      }
    );
    
    // Observe element
    observer.observe(element);
    
    // Store observer
    this.observers.set(id, observer);
  }

  /**
   * Load a lazy load item
   */
  async load(id: string): Promise<LazyLoadResult> {
    const item = this.items.get(id);
    
    if (!item) {
      return {
        item: null as any,
        success: false,
        loadingTime: 0,
        error: new Error(`Item with id ${id} not found`),
      };
    }
    
    // Return early if already loaded or loading
    if (item.loaded || item.loading) {
      return {
        item,
        success: item.loaded,
        loadingTime: 0,
        error: item.error || undefined,
      };
    }
    
    // Check if we've reached the max loaded items
    if (this.options.enableMemoryOptimization && 
        this.loadedItems.length >= this.options.maxLoadedItems!) {
      // Unload the oldest item
      const oldestId = this.loadedItems.shift();
      if (oldestId) {
        this.unload(oldestId);
      }
    }
    
    // Set loading state
    item.loading = true;
    this.loadingItems.add(id);
    
    const startTime = performance.now();
    
    try {
      // Load the component
      const component = await item.load();
      
      const endTime = performance.now();
      const loadingTime = endTime - startTime;
      
      // Check if loading took too long
      if (this.options.enablePerformanceOptimization && 
          loadingTime > this.options.maxLoadingTime!) {
        console.warn(`Lazy loading took too long: ${loadingTime}ms for item ${id}`);
      }
      
      // Update item
      item.loaded = true;
      item.loading = false;
      item.component = component;
      item.error = null;
      
      // Add to loaded items
      this.loadedItems.push(id);
      this.loadingItems.delete(id);
      
      const result: LazyLoadResult = {
        item,
        success: true,
        loadingTime,
      };
      
      // Notify callbacks
      this.notifyCallbacks(id, result);
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const loadingTime = endTime - startTime;
      
      // Update item
      item.loaded = false;
      item.loading = false;
      item.component = null;
      item.error = error as Error;
      
      // Remove from loading items
      this.loadingItems.delete(id);
      
      const result: LazyLoadResult = {
        item,
        success: false,
        loadingTime,
        error: error as Error,
      };
      
      // Notify callbacks
      this.notifyCallbacks(id, result);
      
      return result;
    }
  }

  /**
   * Unload a lazy load item
   */
  unload(id: string): boolean {
    const item = this.items.get(id);
    
    if (!item || !item.loaded) {
      return false;
    }
    
    // Reset item
    item.loaded = false;
    item.loading = false;
    item.component = null;
    item.error = null;
    
    // Remove from loaded items
    const index = this.loadedItems.indexOf(id);
    if (index !== -1) {
      this.loadedItems.splice(index, 1);
    }
    
    return true;
  }

  /**
   * Prefetch a lazy load item
   */
  async prefetch(id: string): Promise<LazyLoadResult> {
    // Load the item but don't add it to loaded items
    const result = await this.load(id);
    
    // If loaded, remove from loaded items to keep it in memory but not count towards limit
    if (result.success) {
      const index = this.loadedItems.indexOf(id);
      if (index !== -1) {
        this.loadedItems.splice(index, 1);
      }
    }
    
    return result;
  }

  /**
   * Get a lazy load item
   */
  getItem(id: string): LazyLoadItem | null {
    return this.items.get(id) || null;
  }

  /**
   * Check if an item is loaded
   */
  isLoaded(id: string): boolean {
    const item = this.items.get(id);
    return item ? item.loaded : false;
  }

  /**
   * Check if an item is loading
   */
  isLoading(id: string): boolean {
    const item = this.items.get(id);
    return item ? item.loading : false;
  }

  /**
   * Get all loaded items
   */
  getLoadedItems(): LazyLoadItem[] {
    return this.loadedItems.map(id => this.items.get(id)!).filter(Boolean);
  }

  /**
   * Get all loading items
   */
  getLoadingItems(): LazyLoadItem[] {
    return Array.from(this.loadingItems).map(id => this.items.get(id)!).filter(Boolean);
  }

  /**
   * Register a load callback
   */
  onLoad(id: string, callback: (result: LazyLoadResult) => void): void {
    if (!this.loadCallbacks.has(id)) {
      this.loadCallbacks.set(id, []);
    }
    
    this.loadCallbacks.get(id)!.push(callback);
  }

  /**
   * Unregister a load callback
   */
  offLoad(id: string, callback: (result: LazyLoadResult) => void): void {
    const callbacks = this.loadCallbacks.get(id);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Notify callbacks
   */
  private notifyCallbacks(id: string, result: LazyLoadResult): void {
    const callbacks = this.loadCallbacks.get(id);
    if (callbacks) {
      callbacks.forEach(callback => callback(result));
    }
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<LazyLoaderOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current options
   */
  getOptions(): LazyLoaderOptions {
    return { ...this.options };
  }
}

// Singleton instance with default options
export const lazyLoader = new LazyLoader({
  enableLazyLoading: true,
  loadingStrategy: 'on-demand',
  loadingThreshold: 200,
  enablePerformanceOptimization: true,
  maxLoadingTime: 5000,
  enableMemoryOptimization: true,
  maxLoadedItems: 10,
  enableFallback: true,
});

// Export a factory function for easier usage
export function createLazyLoader(options?: LazyLoaderOptions): LazyLoader {
  return new LazyLoader(options);
}

// React hook for lazy loading
export function useLazyLoader() {
  return {
    register: lazyLoader.register.bind(lazyLoader),
    load: lazyLoader.load.bind(lazyLoader),
    unload: lazyLoader.unload.bind(lazyLoader),
    prefetch: lazyLoader.prefetch.bind(lazyLoader),
    getItem: lazyLoader.getItem.bind(lazyLoader),
    isLoaded: lazyLoader.isLoaded.bind(lazyLoader),
    isLoading: lazyLoader.isLoading.bind(lazyLoader),
    onLoad: lazyLoader.onLoad.bind(lazyLoader),
    offLoad: lazyLoader.offLoad.bind(lazyLoader),
  };
}

// React component for lazy loading
export function LazyLoad({
  id,
  load,
  fallback,
  children,
  ...props
}: {
  id: string;
  load: () => Promise<any>;
  fallback?: React.ReactNode;
  children: (component: any) => React.ReactNode;
  [key: string]: any;
}) {
  const [item, setItem] = React.useState<LazyLoadItem | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const elementRef = React.useRef<HTMLDivElement>(null);
  
  // Register item on mount
  React.useEffect(() => {
    const registeredItem = lazyLoader.register(id, load, elementRef.current);
    setItem(registeredItem);
    
    // Set up load callback
    const handleLoad = (result: LazyLoadResult) => {
      setLoading(false);
      if (result.error) {
        setError(result.error);
      }
    };
    
    lazyLoader.onLoad(id, handleLoad);
    
    return () => {
      lazyLoader.offLoad(id, handleLoad);
    };
  }, [id, load]);
  
  // Load item when element is in viewport
  React.useEffect(() => {
    if (item && !item.loaded && !item.loading && elementRef.current) {
      setLoading(true);
      lazyLoader.load(id);
    }
  }, [item, id]);
  
  return React.createElement(
    'div',
    { ref: elementRef, ...props },
    loading && (fallback || React.createElement('div', null, 'Loading...')),
    error && React.createElement('div', null, `Error: ${error.message}`),
    item && item.loaded && children(item.component)
  );
}