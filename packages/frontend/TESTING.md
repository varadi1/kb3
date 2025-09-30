# KB3 Frontend Testing Documentation

## Overview

The KB3 frontend implements a comprehensive testing strategy following the test pyramid approach and ensuring SOLID principles compliance at all levels.

## Test Structure

```
tests/
├── unit/                 # Component-level unit tests
│   ├── components/
│   │   ├── urls/        # URL management component tests
│   │   ├── tags/        # Tag management component tests
│   │   ├── content/     # Content viewer component tests
│   │   └── config/      # Configuration component tests
│   └── services/        # Service layer unit tests
├── integration/         # Service and store integration tests
│   └── service-integration.test.ts
├── smoke/              # Critical path smoke tests
│   └── critical-paths.test.tsx
├── e2e/                # End-to-end user workflow tests
│   └── user-workflows.spec.ts
└── solid-compliance/   # SOLID principles compliance tests
    └── frontend-solid-comprehensive.test.ts
```

## Test Types

### 1. Unit Tests
- **Purpose**: Test individual components and services in isolation
- **Coverage**: All components, services, and utilities
- **Run**: `npm run test:unit`
- **Examples**:
  - `urls-table.test.tsx` - Tests URL table display logic
  - `tag-manager.test.tsx` - Tests tag management UI
  - `content-viewer.test.tsx` - Tests content display

### 2. Integration Tests
- **Purpose**: Test interaction between services, store, and API
- **Coverage**: Service layer, store operations, API communication
- **Run**: `npm run test:integration`
- **Examples**:
  - Service coordination tests
  - Store and service integration
  - WebSocket communication tests

### 3. Smoke Tests
- **Purpose**: Quick validation of critical user paths
- **Coverage**: Essential functionality
- **Run**: `npm run test:smoke`
- **Critical Paths Tested**:
  - View and manage URLs
  - Add new URLs (single and batch)
  - Tag management
  - Batch operations
  - Import/export
  - Content processing
  - Configuration

### 4. E2E Tests (Playwright)
- **Purpose**: Test complete user workflows in real browser
- **Coverage**: Full user journeys
- **Run**: `npm run test:e2e`
- **Workflows Tested**:
  - Complete URL processing pipeline
  - Batch URL management
  - Tag hierarchy management
  - Content reprocessing
  - Import and migration
  - Advanced configuration

### 5. SOLID Compliance Tests
- **Purpose**: Ensure architecture follows SOLID principles
- **Coverage**: All components and services
- **Run**: `npm run test:solid`
- **Principles Validated**:
  - Single Responsibility Principle
  - Open/Closed Principle
  - Liskov Substitution Principle
  - Interface Segregation Principle
  - Dependency Inversion Principle

## Running Tests

### Basic Commands
```bash
# Run all tests
npm test

# Run specific test type
npm run test:unit
npm run test:integration
npm run test:smoke
npm run test:solid
npm run test:e2e

# Run with coverage
npm run test:coverage
npm run test:coverage:unit
npm run test:coverage:integration

# Watch mode for development
npm run test:watch

# Run all non-E2E tests
npm run test:all

# CI pipeline (all tests including E2E)
npm run test:ci

# Generate coverage report
npm run test:report
```

### E2E Test Commands
```bash
# Run E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Debug E2E tests
npm run test:e2e:debug

# Run on specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

## Coverage Requirements

### Minimum Coverage Thresholds
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Coverage Reports
Coverage reports are generated in:
- `coverage/` - HTML report
- `coverage/lcov-report/index.html` - Detailed HTML view
- Console output with `npm run test:report`

## SOLID Principles Testing

### What We Test

1. **Single Responsibility**
   - Each component has one clear purpose
   - Services handle single domain
   - No business logic in UI components

2. **Open/Closed**
   - Components handle new data types without modification
   - Services extensible through composition
   - New features don't break existing tests

3. **Liskov Substitution**
   - Store implementations are interchangeable
   - Service contracts are maintained
   - Component props accept derived types

4. **Interface Segregation**
   - Components only depend on required methods
   - Services expose minimal interfaces
   - Props interfaces are focused

5. **Dependency Inversion**
   - Components depend on store abstraction
   - Services depend on fetch abstraction
   - No direct API calls in components

## Writing Tests

### Unit Test Template
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComponentName } from '@/components/path'

describe('ComponentName', () => {
  describe('Feature Group', () => {
    it('should do something specific', async () => {
      // Arrange
      render(<ComponentName prop="value" />)

      // Act
      await userEvent.click(screen.getByRole('button'))

      // Assert
      expect(screen.getByText('Result')).toBeInTheDocument()
    })
  })
})
```

### Integration Test Template
```typescript
import { renderHook, act } from '@testing-library/react'
import { useKb3Store } from '@/lib/store'

describe('Service Integration', () => {
  it('should coordinate between services', async () => {
    const { result } = renderHook(() => useKb3Store())

    await act(async () => {
      await result.current.fetchUrls()
    })

    expect(result.current.urls).toHaveLength(expect.any(Number))
  })
})
```

### E2E Test Template
```typescript
import { test, expect } from '@playwright/test'

test.describe('User Workflow', () => {
  test('should complete workflow', async ({ page }) => {
    await page.goto('/')
    await page.click('[data-testid="add-url-button"]')
    await page.fill('[placeholder="Enter URL"]', 'https://example.com')
    await page.click('button:has-text("Add URL")')

    await expect(page.locator('text=https://example.com')).toBeVisible()
  })
})
```

## Mocking

### Common Mocks
- **Store**: `jest.mock('@/lib/store')`
- **Fetch**: `global.fetch = jest.fn()`
- **WebSocket**: Mocked in `jest.setup.js`
- **Next.js Router**: Mocked in `jest.setup.js`

### Mock Data
Test data fixtures are available in:
- Mock URLs: See unit test files
- Mock tags: See tag manager tests
- Mock configurations: See config tests

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run Frontend Tests
  run: |
    cd packages/frontend
    npm ci
    npm run test:ci
    npm run test:report
```

### Pre-commit Hooks
```bash
# .husky/pre-commit
cd packages/frontend
npm run test:unit
npm run lint
npm run typecheck
```

## Debugging Tests

### Jest Debugging
```bash
# Debug specific test
node --inspect-brk node_modules/.bin/jest --runInBand path/to/test

# VS Code launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${file}"]
}
```

### Playwright Debugging
```bash
# Debug mode with inspector
npm run test:e2e:debug

# Headed mode (see browser)
npx playwright test --headed

# Slow motion
npx playwright test --slow-mo=1000
```

## Best Practices

### Do's
- ✅ Test behavior, not implementation
- ✅ Use data-testid for E2E selectors
- ✅ Mock at architectural boundaries
- ✅ Write descriptive test names
- ✅ Follow AAA pattern (Arrange, Act, Assert)
- ✅ Test error cases and edge cases
- ✅ Keep tests independent and isolated

### Don'ts
- ❌ Test internal component state
- ❌ Mock everything
- ❌ Write brittle selectors
- ❌ Share state between tests
- ❌ Test framework code
- ❌ Ignore failing tests

## Troubleshooting

### Common Issues

1. **Tests fail with "act" warnings**
   - Wrap state updates in `act()`
   - Use `waitFor` for async operations

2. **E2E tests timeout**
   - Increase timeout in playwright.config.ts
   - Check if services are running

3. **Coverage not meeting threshold**
   - Add tests for uncovered branches
   - Check coverage report for gaps

4. **Mock not working**
   - Clear mocks in beforeEach/afterEach
   - Check mock path matches import

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)