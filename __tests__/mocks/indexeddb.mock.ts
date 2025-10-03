// Mock IndexedDB for testing
export class MockIndexedDB {
  private stores: Map<string, Map<string, any>> = new Map()
  private version = 1

  open(name: string, version?: number) {
    const request = {
      result: {
        createObjectStore: (name: string, options?: any) => {
          if (!this.stores.has(name)) {
            this.stores.set(name, new Map())
          }
          return {
            createIndex: jest.fn(),
          }
        },
        transaction: (storeNames: string | string[], mode?: string) => ({
          objectStore: (name: string) => ({
            add: (data: any, key?: string) => {
              const store = this.stores.get(name) || new Map()
              const id = key || data.id || Math.random().toString(36)
              store.set(id, data)
              this.stores.set(name, store)
              return Promise.resolve(data)
            },
            get: (key: string) => {
              const store = this.stores.get(name) || new Map()
              return Promise.resolve(store.get(key) || undefined)
            },
            put: (data: any, key?: string) => {
              const store = this.stores.get(name) || new Map()
              const id = key || data.id || Math.random().toString(36)
              store.set(id, data)
              this.stores.set(name, store)
              return Promise.resolve(data)
            },
            delete: (key: string) => {
              const store = this.stores.get(name) || new Map()
              store.delete(key)
              this.stores.set(name, store)
              return Promise.resolve()
            },
            clear: () => {
              this.stores.set(name, new Map())
              return Promise.resolve()
            },
            getAll: () => {
              const store = this.stores.get(name) || new Map()
              return Promise.resolve(Array.from(store.values()))
            },
            index: (name: string) => ({
              getAll: () => Promise.resolve([]),
              get: (key: string) => Promise.resolve(undefined),
            }),
          })
        }),
        close: jest.fn(),
      },
      onsuccess: null as any,
      onerror: null as any,
      onupgradeneeded: null as any,
    }

    // Simulate async behavior
    setTimeout(() => {
      if (request.onupgradeneeded) {
        request.onupgradeneeded({ target: request } as any)
      }
      if (request.onsuccess) {
        request.onsuccess({ target: request } as any)
      }
    }, 0)

    return request
  }

  deleteDatabase(name: string) {
    this.stores.clear()
    return Promise.resolve()
  }

  // Helper methods for testing
  clearAll() {
    this.stores.clear()
  }

  getStoreData(storeName: string) {
    return Array.from(this.stores.get(storeName)?.values() || [])
  }

  addStoreData(storeName: string, data: any) {
    const store = this.stores.get(storeName) || new Map()
    const id = data.id || Math.random().toString(36)
    store.set(id, data)
    this.stores.set(storeName, store)
  }
}

// Create a global mock instance
export const mockIndexedDB = new MockIndexedDB()

// Setup global IndexedDB mock
Object.defineProperty(global, 'indexedDB', {
  value: {
    open: mockIndexedDB.open.bind(mockIndexedDB),
    deleteDatabase: mockIndexedDB.deleteDatabase.bind(mockIndexedDB),
  },
  writable: true,
})

// Mock IDBKeyRange
Object.defineProperty(global, 'IDBKeyRange', {
  value: {
    bound: jest.fn(),
    lowerBound: jest.fn(),
    upperBound: jest.fn(),
    only: jest.fn(),
  },
  writable: true,
})

// Mock DOMException
Object.defineProperty(global, 'DOMException', {
  value: class DOMException extends Error {
    constructor(message: string, name: string) {
      super(message)
      this.name = name
    }
  },
  writable: true,
})