// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

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
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

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
  disconnect: jest.fn()
}))

// Optionally silence expected console errors in tests
// These are intentional errors from error handling tests
const originalError = console.error
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
      'You called act'
    ]

    // Only log if it's not an expected error
    if (!expectedErrors.some(expected => errorString.includes(expected))) {
      originalError(...args)
    }
  })
})

afterAll(() => {
  console.error = originalError
})