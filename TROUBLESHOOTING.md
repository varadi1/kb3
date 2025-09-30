# Troubleshooting Knowledge Base

## 📊 Statistics
- **Total Entries**: 16
- **Success Rate**: 100% (18/18)
- **Most Common**: Frontend/Backend Mismatches & ID/URL Confusion
- **Time Saved**: ~285 minutes

## 🗂️ Quick Index
- [Frontend Issues](#frontend-issues) - React/JSX, Components, Store, UX
- [Backend Issues](#backend-issues) - Server, Ports, TSX Watcher
- [API Mismatches](#api-mismatches) - Endpoints, Validation, Type Conflicts
- [Data Persistence](#data-persistence) - URL Settings, Repository Gaps
- [Processing Queue](#processing-queue) - Queue Management, Missing Methods

---

## Frontend Issues

### [JSX001]: Multiple JSX Elements Without Fragment
**Tags**: `#react` `#jsx` `#compilation`
**Success**: 2/2 (100%)

**Problem**: Failed to compile with "Expected ',' got '{'" error when returning multiple JSX elements

**Quick Fix**:
```tsx
// ❌ WRONG
return (
  <Card>...</Card>
  {condition && <Dialog>...</Dialog>}
)

// ✅ CORRECT
return (
  <>
    <Card>...</Card>
    {condition && <Dialog>...</Dialog>}
  </>
)
```

**Prevention**: Always use fragments when returning multiple elements

---

### [JSX002]: Objects Not Valid as React Child
**Tags**: `#react` `#queue` `#data-validation` `#websocket`
**Success**: 4/4 (100%)

**Problem**: React error when ProcessingQueue receives non-array data or WebSocket events pass objects as React children

**Solution 1**: Validate data is array before setting state:
```typescript
// In store.ts
fetchQueue: async () => {
  try {
    const response = await fetch('/api/process/queue')
    const data = await response.json()

    if (data.success && Array.isArray(data.data?.queue)) {
      return data.data.queue
    }
    return []  // Always return array
  } catch (error) {
    return []  // Fallback to empty array
  }
}
```

**Solution 2**: Validate WebSocket event data types:
```typescript
// In socket-provider.tsx for processing events
const url = typeof data.url === 'string' ? data.url :
            (data.result && typeof data.result.url === 'string' ? data.result.url : 'Unknown URL')
```

**Solution 3**: Ensure all error handlers validate object types:
```typescript
// In socket-provider.tsx for error events
const errorMessage = typeof error?.message === 'string' ? error.message :
                    typeof error === 'string' ? error :
                    'An error occurred'
```

**Solution 4**: ProcessingQueue error display validation:
```typescript
// In processing-queue.tsx
{typeof item.error === 'string'
  ? item.error
  : typeof item.error === 'object' && item.error !== null
  ? JSON.stringify(item.error)
  : 'Processing failed'}
```

**Prevention**: Always validate external data, use Array.isArray() checks, ensure WebSocket payloads are strings, validate all error objects before rendering

---

### [SELECT001]: Select.Item Empty Value Error in Tags Tab
**Tags**: `#react` `#radix-ui` `#select` `#tags`
**Success**: 1/1 (100%)

**Problem**: Clicking on Tags tab causes React error "A <Select.Item /> must have a value prop that is not an empty string"

**Root Cause**: The TagManager component used empty strings ("") as values for "No parent" SelectItem components. Radix UI Select reserves empty strings for clearing selections and doesn't allow them as actual option values.

**Quick Fix**:
```typescript
// ❌ WRONG - Using empty string
<SelectItem value="">No parent</SelectItem>

// ✅ CORRECT - Using sentinel value
const NO_PARENT = 'no-parent'
<SelectItem value={NO_PARENT}>No parent</SelectItem>

// Update state initialization
const [newTagParent, setNewTagParent] = useState<string>(NO_PARENT)

// Update conditional logic
await createTag(newTagName, newTagParent === NO_PARENT ? undefined : newTagParent)
```

**Detection**: Reproduced with Playwright automation to capture console errors

**Prevention**:
- Never use empty strings as Select.Item values
- Use semantic constants for special values like "none" or "no-selection"
- Test all Select components with dropdown interactions

**File**: `packages/frontend/components/tags/tag-manager.tsx:186,280`

---

### [UX001]: Batch Tag Assignment Button Inactive
**Tags**: `#ux` `#batch-operations` `#tag-assignment` `#dropdown`
**Success**: 1/1 (100%)

**Problem**: In batch operations panel, users cannot assign tags to selected URLs because the "Assign Tags" button remains inactive/disabled even after selecting URLs.

**Root Cause**: The UI only provided a text input for manually typing tag names without a dropdown to select from existing tags. Users were expected to:
1. Type tag name manually
2. Click "Add Tag" to add to selectedTags array
3. Then click "Assign Tags"

This was unintuitive because:
- No visual indication of available tags
- Prone to typos and inconsistency
- Required remembering exact tag names
- The button was disabled until tags were added to the selectedTags array

**Quick Fix**:
```tsx
// ✅ Add dropdown for existing tags + text input for new tags
<Select value="" onValueChange={(value) => {
  if (value && !selectedTags.includes(value)) {
    setSelectedTags([...selectedTags, value])
  }
}}>
  <SelectTrigger className="flex-1">
    <SelectValue placeholder="Select existing tag..." />
  </SelectTrigger>
  <SelectContent>
    {availableTags.filter(tag => !selectedTags.includes(tag.name)).map((tag) => (
      <SelectItem key={tag.id} value={tag.name}>
        {tag.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
<Input
  value={newTag}
  onChange={(e) => setNewTag(e.target.value)}
  placeholder="Or type new tag name"
  className="flex-1"
/>

// Show assign button only when tags are selected
{selectedTags.length > 0 && (
  <Button
    onClick={handleAssignTags}
    disabled={isProcessing}
    className="w-full"
  >
    Assign {selectedTags.length} Tag{selectedTags.length !== 1 ? 's' : ''} to {selectedCount} URL{selectedCount !== 1 ? 's' : ''}
  </Button>
)}
```

**Detection**: User reported button inactive when trying to assign tags in batch operations

**Prevention**:
- Always provide dropdowns for selecting from existing entities
- Show clear visual feedback of selected items
- Only show action buttons when prerequisites are met
- Use descriptive button text that shows what will happen

**File**: `packages/frontend/components/urls/batch-operations.tsx:300-365`

---

### [API003]: Batch Tag Assignment Not Persisting
**Tags**: `#api` `#tags` `#batch-operations` `#url-id-mismatch`
**Success**: 1/1 (100%)

**Problem**: Batch tag assignment shows success message but tags don't appear in the URL table. Backend throws "URL not found: [uuid]" error.

**Root Cause**: The `addTagsToUrl` method in the repository expects the **actual URL string** (e.g., "https://example.com") as the first parameter, but the backend endpoint was passing the **URL ID** (UUID).

**Architecture Insight**: KB3 uses URL strings (not IDs) as the primary identifier in tag operations:
```typescript
// ❌ WRONG - Passing UUID as URL
await kb3Service.addTagsToUrl(urlId, tags);  // urlId = "8076efa3-..."

// ✅ CORRECT - Use ById variant
await kb3Service.addTagsToUrlById(urlId, tags);
```

**Quick Fix**:
1. Created helper methods in `kb3Service.ts`:
```typescript
async addTagsToUrlById(id: string, tagNames: string[]): Promise<boolean> {
  const url = await this.getUrlById(id);
  if (!url) {
    throw new Error(`URL not found with id: ${id}`);
  }
  return this.addTagsToUrl(url, tagNames);
}

async removeTagsFromUrlById(id: string, tagNames: string[]): Promise<boolean> {
  const url = await this.getUrlById(id);
  if (!url) {
    throw new Error(`URL not found with id: ${id}`);
  }
  return this.removeTagsFromUrl(url, tagNames);
}

async setUrlTagsById(id: string, tagNames: string[]): Promise<boolean> {
  const url = await this.getUrlById(id);
  if (!url) {
    throw new Error(`URL not found with id: ${id}`);
  }
  return this.setUrlTags(url, tagNames);
}
```

2. Updated batch-tags endpoint in `routes/urls.ts`:
```typescript
// Changed from:
await kb3Service.addTagsToUrl(urlId, tags);
await kb3Service.removeTagsFromUrl(urlId, tags);
await kb3Service.setUrlTags(urlId, tags);

// To:
await kb3Service.addTagsToUrlById(urlId, tags);
await kb3Service.removeTagsFromUrlById(urlId, tags);
await kb3Service.setUrlTagsById(urlId, tags);
```

**Detection**: Backend error logs showed "URL not found: [uuid]" when trying to add tags

**Prevention**:
- Always check method signatures for URL vs ID expectations
- Create *ById variants for all URL-based operations
- Add TypeScript types to distinguish URL strings from IDs
- Document which methods expect URL strings vs IDs

**Files**:
- `packages/backend/src/services/kb3Service.ts:793-832`
- `packages/backend/src/routes/urls.ts:446-456`

**Related Issues**: Similar pattern may exist in other batch operations (authority, status)

---

### [PROCESSING001]: UUID Treated as URL Causing Processing Failure
**Tags**: `#processing` `#batch-operations` `#uuid-url-confusion` `#critical`
**Success**: 1/1 (100%)

**Problem**: Processing queue tries to process UUID strings as URLs, causing React errors "Objects are not valid as React child (found: object with keys {id, url, status, startedAt, completedAt, error})". System attempts to scrape UUIDs instead of actual URLs.

**Symptoms**:
- Processing tab shows strange ID strings instead of URLs
- React crashes with object rendering errors (4x repeated)
- Backend logs show "Enriching URL: eaa5ef44-2712-4e97-a4a3-cad182b714d7"
- Toast notifications break with object rendering errors

**Root Cause - Driver Tree Analysis**:

**Primary Cause**: Batch parameters endpoint receives URL IDs instead of URL strings
- Location: `packages/frontend/components/urls/batch-operations.tsx:246`
- Issue: `urls: urlIds` sends array of UUIDs
- Backend expects: Array of URL strings (e.g., ["https://example.com"])
- Backend receives: Array of UUIDs (e.g., ["8076efa3-cc15-428a-8e71-b5eafc7a6255"])

**Cascade Effect**:
1. UUIDs saved to `url_parameters` table as if they were URLs
2. System tries to "process" UUID strings as URLs
3. Scraper attempts to fetch "8076efa3-..." as a URL
4. Processing fails with malformed URL errors
5. Error objects propagate to WebSocket events
6. Frontend tries to render error objects directly in React
7. React crashes: "Objects are not valid as React child"

**Quick Fix**:

1. **Frontend - Convert IDs to URLs** (`batch-operations.tsx:242-245`):
```typescript
const urlIds = Array.from(selectedUrls)
// Convert URL IDs to actual URL strings
const urlStrings = urlIds.map(id => {
  const urlObj = urls.find(u => u.id === id)
  return urlObj ? urlObj.url : id
}).filter(url => url) // Remove any undefined values

const response = await fetch('/api/config/batch/parameters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    urls: urlStrings,  // ✅ Send URL strings, not IDs
    scraperType: selectedScraperType,
    parameters: parameters,
    priority: 15,
    enabled: true
  })
})
```

2. **Frontend - Add WebSocket Data Safety** (`socket-provider.tsx:114-126`):
```typescript
socketInstance.on('batch:completed', (data) => {
  // Safely handle batch completion data
  const count = typeof data?.count === 'number' ? data.count : 0
  const results = Array.isArray(data?.results) ? data.results : []
  const successCount = results.filter((r: any) => r?.success === true).length
  const failedCount = results.length - successCount

  toast({
    title: 'Batch Processing Completed',
    description: `Processed ${count} URLs. Success: ${successCount}, Failed: ${failedCount}`,
  })

  fetchUrls()
})
```

3. **Database Cleanup**:
```sql
-- Remove orphaned UUID entries from url_parameters table
DELETE FROM url_parameters WHERE url GLOB '*-*-*-*-*' AND url NOT GLOB 'http*';
```

**Detection**:
- Backend logs: `[DEBUG] Enriching URL: [uuid]`
- React error: "Objects are not valid as React child"
- Processing queue shows UUIDs instead of URLs

**Prevention**:
- Always convert IDs to URLs before sending to backend URL-based endpoints
- Add TypeScript types to distinguish URLId from URLString
- Validate data shapes in WebSocket handlers before rendering
- Add database constraints to prevent non-URL strings in URL columns
- Use Zod schemas for API request/response validation

**Files Modified**:
- `packages/frontend/components/urls/batch-operations.tsx:242-245`
- `packages/frontend/components/socket-provider.tsx:114-126`

**Impact**: Critical - Prevents all processing operations, crashes React app

**Related Issues**: [API003] (similar ID/URL confusion in tag assignment)

---

### [RATE001]: Rate Limit Exhausted - Failed to Start Processing
**Tags**: `#rate-limit` `#api` `#processing-queue`
**Success**: 1/1 (100%)

**Problem**: "Failed to start processing" error when clicking Start Processing button. API returns 429 Too Many Requests.

**Symptoms**:
- Error toast: "Failed to start processing"
- API response: "Too many requests from this IP, please try again later"
- Headers show: `X-RateLimit-Remaining: 0`

**Root Cause**: Express rate limiter configured at 100 requests per 15 minutes per IP. Development/testing can quickly exhaust this limit.

**Quick Fix for Development**:
```typescript
// In packages/backend/src/index.ts
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // increased from 100 for development
  message: 'Too many requests from this IP, please try again later.'
});
```

**Alternative Solutions**:
1. Wait for rate limit reset (check `Retry-After` header for seconds)
2. Exclude certain routes from rate limiting:
```typescript
app.use('/api/', (req, res, next) => {
  // Skip rate limiting for processing endpoints in development
  if (process.env.NODE_ENV === 'development' && req.path.includes('/process')) {
    return next();
  }
  limiter(req, res, next);
});
```
3. Use different rate limits for different endpoints

**Detection**:
```bash
curl -X POST http://localhost:4000/api/process/start -v
# Look for: X-RateLimit-Remaining: 0
```

**Prevention**:
- Set higher limits for development environment
- Implement different rate limits for different API groups
- Add rate limit bypass for authenticated admin users
- Monitor rate limit headers in frontend

**File**: `packages/backend/src/index.ts:47-51`

---

### [UI001]: Playwright Test Navigation Mismatch
**Tags**: `#playwright` `#testing` `#navigation` `#ui`
**Success**: 1/1 (100%)

**Problem**: Playwright tests fail because they expect tabs (button elements) but the app uses navigation links

**Root Cause**: The app layout uses navigation links instead of tab buttons, and the Processing Queue is in a different location

**Solution**: Update test selectors to match actual UI structure:
```typescript
// ❌ WRONG - Looking for tabs
const processingTab = page.locator('button:has-text("Processing")');

// ✅ CORRECT - Use link selectors for navigation
const processingLink = page.locator('a:has-text("Processing")');
await processingLink.click();

// Or navigate directly to the route
await page.goto('/processing');
```

**Prevention**:
- Always inspect actual UI structure before writing tests
- Use data-testid attributes for stable test selectors
- Keep tests in sync with UI changes

---

## Backend Issues

### [BACKEND001]: Port Already in Use (EADDRINUSE)
**Tags**: `#backend` `#port-conflict`
**Success**: 1/1 (100%)

**Problem**: Backend crashes with "EADDRINUSE: address already in use :::4000"

**Quick Fix**:
```bash
# Kill process on port 4000
lsof -i :4000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Restart backend
cd packages/backend && npm run dev
```

**Prevention**: Always terminate servers properly with Ctrl+C

---

### [BACKEND002]: TSX Watcher Restart Loop
**Tags**: `#backend` `#tsx` `#restart-loop`
**Success**: 1/1 (100%)

**Problem**: TSX stuck with "Process hasn't exited. Killing process..."

**Solution**:
```bash
# Kill stuck TSX process
pkill -f "tsx watch"
sleep 2

# Restart cleanly
cd packages/backend && npm run dev
```

**Prevention**: Avoid rapid file saves, implement graceful shutdown

---

## API Mismatches

### [CONFIG001]: Missing PUT Endpoints
**Tags**: `#api` `#configuration` `#endpoints`
**Success**: 1/1 (100%)

**Problem**: Frontend calls PUT endpoints that don't exist in backend

**Solution**: Add missing endpoints in `/packages/backend/src/routes/config.ts`:
```typescript
router.put('/scrapers', ...)
router.put('/cleaners', ...)
```

**Prevention**: Ensure frontend/backend API contracts are synchronized

---

### [API001]: UUID vs Integer Type Mismatch
**Tags**: `#api` `#validation` `#uuid`
**Success**: 1/1 (100%)

**Problem**: Backend expects integers but frontend sends UUIDs for tag IDs

**Fix**: Change validation from `isInt()` to `isUUID()`:
```typescript
// ❌ WRONG
router.delete('/:id', [param('id').isInt()], ...)

// ✅ CORRECT
router.delete('/:id', [param('id').isUUID()], ...)
```

**Prevention**: Use TypeScript shared types between frontend and backend

---

### [API002]: Cleaner Config Without Scraper Type
**Tags**: `#api` `#validation` `#parameters`
**Success**: 1/1 (100%)

**Problem**: 500 error when updating cleaners without scraperType

**Solution**: Only validate when scraperType exists:
```typescript
if (updates.scraperType || updates.priority) {
  await kb3Service.setUrlParameters(id, {...})
} else if (updates.cleaners) {
  console.log('Cleaners update without scraperType - skipping validation')
}
```

**Prevention**: Add null checks before parameter-dependent functions

---

## Data Persistence

### [URL001]: URL Deletion Not Working
**Tags**: `#persistence` `#deletion` `#api`
**Success**: 1/1 (100%)

**Problem**: URLs appear deleted but persist on refresh

**Root Cause**:
1. Frontend using wrong method (status update instead of delete)
2. Backend DELETE endpoint not implemented
3. Missing deleteUrl methods in KB3Service

**Solution**: Implement proper deletion chain from frontend → API → service → repository

**Prevention**: Implement complete CRUD operations for all entities

---

### [URL002]: URL Settings Not Persisting
**Tags**: `#persistence` `#repository` `#metadata`
**Success**: 1/1 (100%)

**Problem**: URL settings lost on restart (only stored in cache)

**Solution**: Add updateMetadata method to repository:
```typescript
interface IUrlRepository {
  updateMetadata(id: string, metadata: Partial<UrlMetadata>): Promise<boolean>
}
```

**Prevention**: Always persist to database, not just local cache

---

## Processing Queue

### [PROCESSING001]: Missing Frontend Store Methods
**Tags**: `#queue` `#store` `#frontend-backend`
**Success**: 1/1 (100%)

**Problem**: "fetchQueue is not a function" errors

**Root Cause**: ProcessingQueue component calling non-existent store methods

**Solution**: Add missing methods to store:
- `fetchQueue()`
- `startProcessing()`
- `stopProcessing()`
- `retryItem()`
- `clearCompleted()`

**Prevention**: Use TypeScript interfaces for store methods

---

## 📝 Best Practices

### Quick Diagnostics
1. **Frontend Errors**: Check browser console → Network tab → Component props
2. **Backend Errors**: Check logs → Port conflicts → TSX watcher status
3. **API Errors**: Verify endpoints exist → Check request/response types → Validate IDs
4. **Persistence**: Check cache vs DB → Verify repository methods → Test after restart

### Common Patterns
- **Frontend/Backend Mismatch**: Most issues stem from API contract violations
- **Type Mismatches**: UUID vs Integer, Array vs Object, undefined values
- **Missing Implementations**: Stub methods returning success without logic
- **Cache-only Storage**: Data not persisted to database

### Prevention Checklist
- [ ] Use TypeScript shared types
- [ ] Implement complete CRUD operations
- [ ] Validate all external data
- [ ] Add integration tests
- [ ] Document API contracts
- [ ] Handle graceful shutdowns
- [ ] Always persist to database

---

## 💡 Notes
- Always check this KB first before debugging
- Update success metrics after each resolution
- Add new patterns as they emerge
- Follow SOLID principles to prevent architectural issues