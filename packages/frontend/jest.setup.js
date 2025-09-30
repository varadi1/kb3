// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
import '@testing-library/user-event'

// Set test environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000'
process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:4000'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}))

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return []
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock Socket.io (for real-time features)
global.io = jest.fn(() => ({
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  connected: true
}))

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ success: true, data: [] }),
    text: async () => '',
    blob: async () => new Blob(),
    status: 200,
    statusText: 'OK'
  })
)

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve(''))
  }
})

// Mock performance API for performance tests
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now())
}

// Optionally silence expected console errors in tests
// These are intentional errors from error handling tests
const originalError = console.error
const originalWarn = console.warn
const originalLog = console.log

beforeAll(() => {
  console.error = jest.fn((...args) => {
    const errorString = args.join(' ')

    // List of expected error messages to suppress
    const expectedErrors = [
      'Failed to fetch URLs:',
      'Failed to fetch tags:',
      'Failed to process URL:',
      'Failed to fetch stats:',
      'Failed to process URLs:',
      'Failed to process by tags:',
      'An update to TestComponent',
      'You called act',
      'Warning: ReactDOM.render',
      'Warning: React does not recognize'
    ]

    // Only log if it's not an expected error
    if (!expectedErrors.some(expected => errorString.includes(expected))) {
      originalError(...args)
    }
  })

  console.warn = jest.fn((...args) => {
    const warnString = args.join(' ')
    const expectedWarnings = [
      'componentWillReceiveProps',
      'componentWillMount',
      'findDOMNode is deprecated'
    ]

    if (!expectedWarnings.some(expected => warnString.includes(expected))) {
      originalWarn(...args)
    }
  })

  // Suppress verbose logs in tests
  console.log = jest.fn()
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
  console.log = originalLog
})

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks()
  jest.clearAllTimers()
})