# Troubleshooting Knowledge Base

## Index
- [React/JSX Errors](#reactjsx-errors)
- [Build Errors](#build-errors)
- [Component Issues](#component-issues)
- [Configuration Errors](#configuration-errors)
- [API Errors](#api-errors)
- [Processing Errors](#processing-errors)

## Statistics
- Total Entries: 9
- Success Rate: 100% (10/10)
- Most Common: Backend Connection Issues
- Time Saved: ~160 minutes

---

## React/JSX Errors

### [JSX002]: Objects are not valid as a React child - Processing Queue Data Structure
**First Seen**: 2025-09-29
**Occurrences**: 2
**Success Rate**: 2/2 (100%)
**Tags**: #react #frontend #processing #queue #error-handling #data-validation

#### Problem
- **Symptom**: React error "Objects are not valid as a React child" when clicking Start Processing
- **Error**: Full error shows object with keys {id, url, status, startedAt, completedAt, error}
- **Context**: Occurs in ProcessingQueue component when queue data is malformed
- **Impact**: Processing tab becomes completely unusable, shows error screen

#### Root Cause
The `fetchQueue()` function in the store was returning undefined or non-array values when the backend response structure changed or during error states. This caused React to attempt rendering objects directly as children, triggering the error.

#### Solution
1. **Store Validation** (2/2 success):
   ```typescript
   // In store.ts - Ensure fetchQueue always returns array
   fetchQueue: async () => {
     try {
       const response = await fetch('/api/process/queue')
       const data = await response.json()

       if (data.success && data.data?.queue) {
         if (Array.isArray(data.data.queue)) {
           return data.data.queue
         } else {
           console.warn('Queue is not an array:', typeof data.data.queue, data.data.queue)
           return []
         }
       }
       return []
     } catch (error) {
       console.error('Failed to fetch queue:', error)
       return []
     }
   }
   ```

2. **Component Validation** (2/2 success):
   ```typescript
   // In processing-queue.tsx - Validate queue data
   const loadQueue = async () => {
     try {
       const items = await fetchQueue()
       const validItems = Array.isArray(items) ? items : []
       setQueue(validItems)
       setIsProcessing(validItems.some(item => item?.status === 'processing'))
     } catch (error) {
       console.error('Failed to load queue:', error)
       setQueue([]) // Always set to array on error
     }
   }
   ```

3. **Backend Validation** (2/2 success):
   ```typescript
   // In kb3Service.ts - Ensure queue is always array
   async getQueueStatus(): Promise<any> {
     await this.ensureInitialized();
     const queueArray = Array.from(this.processingItems.values());
     const queue = Array.isArray(queueArray) ? queueArray : [];

     return {
       isProcessing: this.isQueueProcessing,
       queue: queue,
       stats: {
         pending: queue.filter(i => i?.status === 'pending').length,
         // ... other stats
       }
     };
   }
   ```

4. **Error Field String Conversion** (2/2 success):
   ```typescript
   // Also ensure error fields are strings
   if (!result.success) {
     if (typeof result.error === 'object' && result.error !== null) {
       item.error = (result.error as any).message || JSON.stringify(result.error);
     } else {
       item.error = String(result.error || 'Processing failed');
     }
   }
   ```

#### Evidence/Diagnosis
- Error stack showed `reconcileChildrenArray` indicating issue with array children
- Error mentioned complete ProcessingItem object structure
- `fetchQueue()` was not validating the data structure from backend
- Missing Array.isArray() checks throughout the data pipeline
- Queue state could become undefined or non-array during error states

#### Prevention
- Always validate data is an array before setting state
- Use Array.isArray() checks at every data transformation point
- Implement defensive programming with fallback values
- Add TypeScript interfaces and strict type checking
- Create integration tests for data flow from backend to frontend
- Never trust external data without validation

#### Related Issues
- [JSX001]: Multiple JSX elements without fragment
- React error boundaries for graceful error handling
- Type safety in frontend/backend data contracts

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

### [BACKEND002]: Backend Server Stuck - TSX Watcher Restart Loop
**First Seen**: 2025-09-29
**Occurrences**: 1
**Success Rate**: 1/1 (100%)
**Tags**: #backend #tsx #restart-loop #stuck-process

#### Problem
- **Symptom**: Frontend shows no URLs, API requests fail with connection refused
- **Error**: Frontend logs show "Failed to proxy" ECONNREFUSED errors
- **Context**: TSX watcher tries to restart but shows "Process hasn't exited. Killing process..."
- **Impact**: Complete backend unavailability, frontend cannot display data

#### Root Cause
TSX watcher gets stuck in a restart loop where:
1. File changes trigger restart
2. Process doesn't exit cleanly in 5 seconds
3. TSX tries to force kill but process remains stuck
4. Backend never actually starts listening on port 4000

#### Solution
1. **Kill stuck processes** (1/1 success):
   ```bash
   # Kill the stuck shell
   pkill -f "tsx watch"

   # Clean up any stuck processes
   sleep 2
   ```

2. **Restart backend cleanly** (1/1 success):
   ```bash
   cd packages/backend
   npm run dev
   ```

3. **Verify backend health** (1/1 success):
   ```bash
   curl http://localhost:4000/health
   # Should return {"status":"healthy",...}
   ```

#### Evidence/Diagnosis
- TSX logs show "Process didn't exit in 5s. Force killing..."
- lsof -i :4000 returns empty (nothing listening)
- Backend shell output stuck with "Process hasn't exited. Killing process..."
- Frontend proxy errors accumulate in console

#### Prevention
- Avoid rapid file saves that trigger multiple restarts
- Consider using nodemon with proper shutdown hooks
- Implement graceful shutdown in backend server
- Add process cleanup in package.json scripts

#### Related Issues
- [BACKEND001]: Port conflicts
- TSX watcher configuration
- Graceful shutdown patterns

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

## URL Management Errors

### [URL001]: URL Deletion Not Working - Frontend/Backend Disconnection
**First Seen**: 2025-09-29
**Occurrences**: 1
**Success Rate**: 1/1 (100%)
**Tags**: #backend #frontend #api #deletion #persistence

#### Problem
- **Symptom**: URLs cannot be deleted from table - system signals success but URLs remain
- **Error**: No visible error - optimistic UI update shows deletion but data persists
- **Context**: Selecting URLs and deleting shows success toast but URLs reappear on refresh
- **Impact**: Cannot remove URLs from system, database grows unbounded

#### Root Cause
Multiple architectural issues:
1. Frontend using wrong method: `batchUpdateUrls` with status 'skipped' instead of actual deletion
2. Backend DELETE endpoint was a stub returning success without implementation
3. Missing `deleteUrl` and `deleteUrls` methods in KB3Service
4. No batch delete endpoint in the API
5. Frontend store missing proper `deleteUrls` implementation

#### Solution
1. **Implement KB3Service deletion methods** (1/1 success):
   ```typescript
   // In kb3Service.ts
   async deleteUrl(id: string): Promise<boolean> {
     const urlRepository = this.orchestrator.getUrlRepository();
     const urls = await this.getUrls();
     const urlObj = urls.find(u => u.id === id || u.url === id);

     if (!urlObj) return false;

     const success = await urlRepository.remove(urlObj.id);
     if (success) {
       this.urlStore.delete(id);
       this.urlStore.delete(urlObj.url);
       this.emit('url:deleted', { id: urlObj.id, url: urlObj.url });
       await this.removeUrlParameters(urlObj.url);
     }
     return success;
   }
   ```

2. **Fix backend DELETE endpoint** (1/1 success):
   ```typescript
   router.delete('/:id', async (req, res) => {
     const { id } = req.params;
     const success = await kb3Service.deleteUrl(id);

     if (success) {
       res.json({ success: true, message: 'URL deleted successfully' });
     } else {
       res.status(404).json({ success: false, message: 'URL not found' });
     }
   });
   ```

3. **Add batch delete endpoint** (1/1 success):
   ```typescript
   router.post('/batch-delete', async (req, res) => {
     const { urlIds } = req.body;
     const result = await kb3Service.deleteUrls(urlIds);
     // Return appropriate status based on success/failure
   });
   ```

4. **Fix frontend deletion** (1/1 success):
   ```typescript
   // In batch-operations.tsx
   const handleDeleteUrls = async () => {
     const urlIds = Array.from(selectedUrls);
     await deleteUrls(urlIds); // Use proper deletion method
   }
   ```

#### Evidence/Diagnosis
- Frontend calling `batchUpdateUrls` with status 'skipped' in batch-operations.tsx
- Backend DELETE endpoint returning success without any implementation
- KB3Service missing deletion methods entirely
- No batch-delete endpoint in routes/urls.ts
- Driver tree analysis showed disconnection at multiple layers

#### Prevention
- Ensure frontend actions map to actual backend implementations
- Never use workarounds (like status updates) for critical operations
- Implement complete CRUD operations for all entities
- Add integration tests for all API endpoints
- Use TypeScript interfaces to enforce API contracts

#### Related Issues
- [API001]: Similar frontend/backend mismatch pattern
- Optimistic UI updates masking backend failures
- SOLID principle violations in incomplete implementations

### [URL002]: URL Settings Not Persisting - Repository Interface Gap
**First Seen**: 2025-09-29
**Occurrences**: 1
**Success Rate**: 1/1 (100%)
**Tags**: #backend #persistence #repository #metadata #solid

#### Problem
- **Symptom**: URL settings (cleaners, scrapers, tags, metadata) not persisted when editing
- **Error**: No error - changes appear saved but lost on restart
- **Context**: Editing URL properties shows success but changes don't survive restart
- **Impact**: Cannot configure URLs properly, settings lost repeatedly

#### Root Cause
Incomplete persistence layer:
1. KB3Service `updateUrl` only persisting tags and authority to database
2. Status and metadata only stored in local cache, not database
3. IUrlRepository interface missing `updateMetadata` method
4. SqlUrlRepository lacking metadata update implementation
5. Violation of SOLID principles - incomplete abstraction

#### Solution
1. **Enhance repository interface** (1/1 success):
   ```typescript
   // In IUrlRepository.ts
   interface IUrlRepository {
     // ... existing methods
     updateMetadata(id: string, metadata: Partial<UrlMetadata>): Promise<boolean>;
   }
   ```

2. **Implement in SqlUrlRepository** (1/1 success):
   ```typescript
   async updateMetadata(id: string, metadata: Partial<UrlMetadata>): Promise<boolean> {
     const existing = await this.get('SELECT metadata FROM urls WHERE id = ?', [id]);
     if (!existing) return false;

     const existingMetadata = JSON.parse(existing.metadata || '{}');
     const mergedMetadata = { ...existingMetadata, ...metadata };

     await this.run(
       'UPDATE urls SET metadata = ?, last_checked = ? WHERE id = ?',
       [JSON.stringify(mergedMetadata), Date.now(), id]
     );
     return true;
   }
   ```

3. **Fix KB3Service persistence** (1/1 success):
   ```typescript
   async updateUrl(id: string, updates: any) {
     const urlRepository = this.orchestrator.getUrlRepository();
     const urlObj = urls.find(u => u.id === id || u.url === id);

     // Persist status to database
     if (updates.status !== undefined) {
       await urlRepository.updateStatus(urlObj.id, statusMapping[updates.status]);
     }

     // Persist metadata to database
     if (updates.metadata !== undefined) {
       await urlRepository.updateMetadata(urlObj.id, updates.metadata);
     }

     // Handle scraper/cleaner configuration
     if (updates.scraperType || updates.cleaners) {
       await this.setUrlParameters(urlObj.url, {...});
     }
   }
   ```

#### Evidence/Diagnosis
- Code review showed updateUrl only calling repository for tags/authority
- Status and metadata updates only using `this.urlStore.set()` (local cache)
- IUrlRepository interface inspection showed no updateMetadata method
- SqlUrlRepository had no implementation for metadata updates
- Changes lost after service restart confirmed cache-only storage

#### Prevention
- Always persist to database, not just local cache
- Ensure repository interfaces are complete (SOLID - ISP)
- Implement all CRUD operations at repository level
- Add persistence tests that include restart scenarios
- Follow Open/Closed principle - extend interfaces properly

#### Related Issues
- SOLID principle compliance
- Repository pattern completeness
- Cache vs persistent storage patterns

---

## Notes
- Always check this KB first before debugging
- Update success metrics after each use
- Add new patterns as they emerge
- Follow SOLID principles to prevent architectural issues