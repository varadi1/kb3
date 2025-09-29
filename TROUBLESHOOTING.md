# Troubleshooting Knowledge Base

## Index
- [React/JSX Errors](#reactjsx-errors)
- [Build Errors](#build-errors)
- [Component Issues](#component-issues)
- [Configuration Errors](#configuration-errors)
- [API Errors](#api-errors)
- [Processing Errors](#processing-errors)

## Statistics
- Total Entries: 5
- Success Rate: 100% (5/5)
- Most Common: API Type Mismatches
- Time Saved: ~85 minutes

---

## React/JSX Errors

### [JSX001]: Expected ',' got '{' - Multiple JSX Elements Without Fragment
**First Seen**: 2025-01-29
**Occurrences**: 2
**Success Rate**: 2/2 (100%)
**Tags**: #jsx #react #frontend #compilation

#### Problem
- **Symptom**: Failed to compile with "Expected ',' got '{'" error
- **Error**: Syntax Error at component return statement
- **Context**: Occurs when returning multiple JSX elements without a parent wrapper
- **Impact**: Frontend won't compile, application is broken

#### Root Cause
React components must return a single parent element. When attempting to return multiple elements at the same level (e.g., a Card component followed by a Dialog component), the JSX parser fails because it expects a single root element.

#### Solution
1. **Quick Fix** (2/2 success):
   ```tsx
   // BEFORE - ERROR
   return (
     <Card>...</Card>
     {condition && <Dialog>...</Dialog>}
   )

   // AFTER - FIXED
   return (
     <>
       <Card>...</Card>
       {condition && <Dialog>...</Dialog>}
     </>
   )
   ```

2. **Alternative Fix** (React.Fragment):
   ```tsx
   return (
     <React.Fragment>
       <Card>...</Card>
       {condition && <Dialog>...</Dialog>}
     </React.Fragment>
   )
   ```

#### Evidence/Diagnosis
- Error location always at the second root element
- Look for patterns:
  - Multiple components after return statement
  - Conditional rendering after main component
  - Dialog/Modal components added after main content

#### Prevention
- Always use fragments (`<>...</>`) when returning multiple elements
- ESLint rule: `react/jsx-fragments`
- Code review checklist: Check for multiple root elements
- Component template should start with fragment by default

#### Related Issues
- [JSX002]: Adjacent JSX elements must be wrapped
- React Fragment documentation
- Component composition patterns

---

## Build Errors

### [BUILD001]: Module Build Failed - Next.js SWC Loader
**Related to**: JSX001
**Solution**: See JSX001 - Usually caused by JSX syntax errors

---

## HTTP Scraper Configuration Success

### Implementation Details
**Added**: 2025-01-29
**Components Modified**:
- `parameterService.ts` - Added HTTP scraper schema and validator
- `edit-url-dialog.tsx` - Integrated parameter editor
- `batch-operations.tsx` - Added batch parameter configuration

#### Features Added
1. **HTTP Scraper Parameters**:
   - Request settings (timeout, encoding, proxy)
   - Headers configuration (User-Agent, Accept, custom headers)
   - Authentication options
   - Behavior settings (redirects, retries, SSL verification)

2. **UI Integration**:
   - Configure button in Edit URL dialog
   - Parameter editor with grouped tabs
   - Batch configuration support
   - Visual indicators for configured parameters

#### Testing Verified
- ✅ Parameter schema loads correctly
- ✅ Validation works for all parameter types
- ✅ UI components render without errors
- ✅ Parameters can be configured and saved
- ✅ Batch operations include parameter configuration

---

## Configuration Errors

### [CONFIG001]: Failed to Save Configuration - Missing PUT Endpoints
**First Seen**: 2025-01-29
**Occurrences**: 1
**Success Rate**: 1/1 (100%)
**Tags**: #backend #api #configuration #endpoint

#### Problem
- **Symptom**: "Failed to save configuration" error when clicking Save in Configuration panel
- **Error**: PUT requests to `/api/config/scrapers` and `/api/config/cleaners` return 404
- **Context**: Frontend calls PUT endpoints that don't exist in backend
- **Impact**: Unable to save global scraper and cleaner configuration

#### Root Cause
The frontend ConfigService was calling PUT endpoints that weren't implemented in the backend. The backend only had GET endpoints for retrieving configuration but no PUT endpoints for updating it.

#### Solution
1. **Added PUT endpoints** (1/1 success):
   ```typescript
   // In /packages/backend/src/routes/config.ts
   router.put('/scrapers', ...)
   router.put('/cleaners', ...)
   ```

2. **Implemented update methods in KB3Service**:
   ```typescript
   // In /packages/backend/src/services/kb3Service.ts
   async updateScraperConfigs(scrapers: Array<...>): Promise<void>
   async updateCleanerConfigs(cleaners: Array<...>): Promise<void>
   async getScraperConfigs(): Promise<Array<...>>
   async getCleanerConfigs(): Promise<Array<...>>
   ```

#### Evidence/Diagnosis
- Frontend was calling PUT `/api/config/scrapers` and PUT `/api/config/cleaners`
- Backend only had GET endpoints defined
- ConfigService in frontend expects both GET and PUT operations
- Error occurs in config-panel.tsx when saving configuration

#### Prevention
- Ensure frontend and backend API contracts are synchronized
- Add API documentation for all endpoints
- Implement integration tests for configuration endpoints
- Consider using TypeScript shared types between frontend and backend

#### Related Issues
- Frontend/Backend API mismatch patterns
- Configuration persistence strategy
- Global vs per-URL configuration hierarchy

---

## API Errors

### [API001]: Tag Deletion Failed - UUID vs Integer Type Mismatch
**First Seen**: 2025-09-29
**Occurrences**: 1
**Success Rate**: 1/1 (100%)
**Tags**: #backend #api #validation #tags #uuid

#### Problem
- **Symptom**: Cannot delete tags from the tag manager UI
- **Error**: 400 Bad Request when attempting to delete a tag
- **Context**: Frontend sends UUID strings but backend expects integer IDs
- **Impact**: Tag management functionality broken, cannot delete tags

#### Root Cause
Type mismatch between frontend and backend: Frontend uses UUID strings for tag IDs (e.g., "c7207f23-3766-4e52-9e62-5208638d105a") but the backend DELETE and PUT endpoints were validating for integer IDs using `param('id').isInt()`.

#### Solution
1. **Fix backend validation** (1/1 success):
   ```typescript
   // In /packages/backend/src/routes/tags.ts

   // BEFORE - INCORRECT
   router.delete('/:id',
     [param('id').isInt()],  // Wrong validation
     handleValidationErrors,
     async (req: Request, res: Response, next: NextFunction) => {
       const id = parseInt(req.params.id);  // Wrong conversion

   // AFTER - FIXED
   router.delete('/:id',
     [param('id').isUUID()],  // Correct validation
     handleValidationErrors,
     async (req: Request, res: Response, next: NextFunction) => {
       const id = req.params.id;  // Direct string usage
   ```

2. **Fix frontend error handling**:
   ```typescript
   // In /packages/frontend/lib/store.ts
   deleteTag: async (id) => {
     const response = await fetch(`/api/tags/${id}`, { method: 'DELETE' })
     if (!response.ok) {
       const errorData = await response.json().catch(() => ({ message: 'Failed to delete tag' }))
       throw new Error(errorData.message || 'Failed to delete tag')  // Proper error throwing
     }
   }
   ```

#### Evidence/Diagnosis
- Test with curl confirmed: `curl -X DELETE http://localhost:4000/api/tags/[UUID]` returned 400
- Frontend console showed tag IDs are UUIDs
- Backend validation middleware rejected UUID format
- Same issue affected both DELETE and PUT endpoints

#### Prevention
- Ensure consistent ID types across frontend and backend
- Use TypeScript shared types between frontend and backend
- Add integration tests for all CRUD operations
- Document expected ID format in API specifications
- Consider using a shared validation library

#### Related Issues
- [CONFIG001]: Similar frontend/backend mismatch pattern
- UUID validation in express-validator
- Type consistency in REST APIs

---

## Backend Errors

### [BACKEND001]: Failed to Load Configuration - Port Already in Use
**First Seen**: 2025-01-29
**Occurrences**: 1
**Success Rate**: 1/1 (100%)
**Tags**: #backend #port-conflict #api #configuration

#### Problem
- **Symptom**: Configuration page shows "Failed to load configuration" error
- **Error**: Backend server crashes with "EADDRINUSE: address already in use :::4000"
- **Context**: Multiple backend processes trying to run simultaneously
- **Impact**: API endpoints unreachable, frontend cannot fetch configuration data

#### Root Cause
Multiple backend server processes attempting to bind to the same port (4000) simultaneously. This typically happens when:
- Development server is restarted multiple times without proper cleanup
- Background processes are not properly terminated
- Multiple terminal sessions accidentally running the same server

#### Solution
1. **Identify and kill conflicting processes** (1/1 success):
   ```bash
   # Check what's running on port 4000
   lsof -i :4000

   # Kill the process using the port
   kill [PID]

   # Or kill all node processes (careful!)
   killall node
   ```

2. **Restart backend server cleanly**:
   ```bash
   cd packages/backend
   npm run dev
   ```

3. **Verify endpoints are working**:
   ```bash
   # Test configuration endpoints
   curl http://localhost:4000/api/config/scrapers
   curl http://localhost:4000/api/config/cleaners
   ```

#### Evidence/Diagnosis
- Check for "EADDRINUSE" errors in backend logs
- Multiple bash processes showing backend server attempts
- Frontend network tab shows failed requests to /api/config/*
- `lsof -i :4000` shows existing process on the port

#### Prevention
- Always properly terminate dev servers (Ctrl+C) before restarting
- Use process managers like PM2 for better process control
- Configure the dev server to kill existing processes on restart
- Add a pre-start script to check and free the port

#### Related Issues
- Port conflicts in development environments
- Process cleanup in Node.js applications
- Frontend/backend communication failures

---

## Processing Errors

### [PROCESSING001]: Processing Queue Not Working - Missing Frontend Store Methods
**First Seen**: 2025-01-29
**Occurrences**: 1
**Success Rate**: 1/1 (100%)
**Tags**: #frontend #backend #processing #queue #store

#### Problem
- **Symptom**: "Failed to start processing" error when clicking Start Processing button
- **Error**: Console shows "fetchQueue is not a function" and similar errors
- **Context**: Processing tab shows errors, cannot start/stop queue or process URLs
- **Impact**: Cannot process any URLs, queue monitoring completely broken

#### Root Cause
The ProcessingQueue React component was calling store methods that didn't exist. The frontend store was missing essential queue management methods (fetchQueue, startProcessing, stopProcessing, retryItem, clearCompleted). Additionally, backend endpoints for queue management weren't implemented.

#### Solution
1. **Add missing store methods to frontend** (1/1 success):
   ```typescript
   // In /packages/frontend/lib/store.ts
   fetchQueue: async () => { ... }
   startProcessing: async () => { ... }
   stopProcessing: async () => { ... }
   retryItem: async (id) => { ... }
   clearCompleted: async () => { ... }
   ```

2. **Create backend queue endpoints** (1/1 success):
   ```typescript
   // In /packages/backend/src/routes/processing.ts
   router.post('/start', ...)  // Start queue processing
   router.post('/stop', ...)   // Stop queue processing
   router.delete('/completed', ...) // Clear completed items
   ```

3. **Implement queue tracking in KB3Service** (1/1 success):
   ```typescript
   // In /packages/backend/src/services/kb3Service.ts
   private isQueueProcessing: boolean = false;
   private queueInterval: NodeJS.Timeout | null = null;
   private processingItems: Map<string, any> = new Map();

   async startQueueProcessing() { ... }
   async stopQueueProcessing() { ... }
   async clearCompletedFromQueue() { ... }
   ```

#### Evidence/Diagnosis
- Console errors: "TypeError: fetchQueue is not a function"
- Frontend component called non-existent store methods
- Backend lacked corresponding API endpoints
- No queue state management in KB3Service

#### Prevention
- Ensure frontend components and store are in sync
- Add TypeScript interfaces for store methods
- Test all UI interactions before deployment
- Create integration tests for queue operations
- Document expected store API in component comments

#### Related Issues
- Frontend/backend API contract mismatches
- Missing method implementations
- Component-store integration patterns

---

## Notes
- Always check this KB first before debugging
- Update success metrics after each use
- Add new patterns as they emerge