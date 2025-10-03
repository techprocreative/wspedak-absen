// Polyfill for TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util')

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Polyfill for fetch
global.fetch = require('jest-fetch-mock')

// Polyfill for Request and Response
global.Request = fetch.Request
global.Response = fetch.Response

// Polyfill for WebSocket
class WebSocket {
  constructor(url) {
    this.url = url
    this.readyState = WebSocket.CONNECTING
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      this.onopen && this.onopen()
    }, 0)
  }

  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  send(data) {
    // Mock send
  }

  close() {
    this.readyState = WebSocket.CLOSED
    this.onclose && this.onclose()
  }

  addEventListener(type, listener) {
    this[`on${type}`] = listener
  }

  removeEventListener(type, listener) {
    this[`on${type}`] = null
  }
}

global.WebSocket = WebSocket

// Polyfill for BroadcastChannel
class BroadcastChannel {
  constructor(name) {
    this.name = name
  }

  postMessage(message) {
    // Mock postMessage
  }

  close() {
    // Mock close
  }

  addEventListener(type, listener) {
    this[`on${type}`] = listener
  }

  removeEventListener(type, listener) {
    this[`on${type}`] = null
  }
}

global.BroadcastChannel = BroadcastChannel

// Polyfill for URLSearchParams
global.URLSearchParams = class URLSearchParams {
  constructor(init) {
    this.params = new Map()
    if (typeof init === 'string') {
      init.split('&').forEach(pair => {
        const [key, value] = pair.split('=')
        if (key) {
          this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''))
        }
      })
    }
  }

  append(name, value) {
    this.params.set(name, value)
  }

  delete(name) {
    this.params.delete(name)
  }

  get(name) {
    return this.params.get(name)
  }

  getAll(name) {
    return Array.from(this.params.entries())
      .filter(([key]) => key === name)
      .map(([, value]) => value)
  }

  has(name) {
    return this.params.has(name)
  }

  set(name, value) {
    this.params.set(name, value)
  }

  toString() {
    return Array.from(this.params.entries())
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
  }
}

// Polyfill for performance.now
Object.defineProperty(global, 'performance', {
  value: {
    now: () => Date.now(),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
  },
})

// Polyfill for requestAnimationFrame/cancelAnimationFrame
global.requestAnimationFrame = callback => setTimeout(callback, 16)
global.cancelAnimationFrame = id => clearTimeout(id)

// Polyfill for custom event
global.CustomEvent = class CustomEvent {
  constructor(type, options = {}) {
    this.type = type
    this.detail = options.detail
    this.bubbles = options.bubbles || false
    this.cancelable = options.cancelable || false
  }

  preventDefault() {}
  stopPropagation() {}
}

// Polyfill for AbortController
global.AbortController = class AbortController {
  constructor() {
    this.signal = {
      aborted: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }
  }

  abort() {
    this.signal.aborted = true
  }
}

// Polyfill for AbortSignal
global.AbortSignal = class AbortSignal {
  static abort() {
    return {
      aborted: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }
  }

  static timeout() {
    return {
      aborted: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }
  }
}