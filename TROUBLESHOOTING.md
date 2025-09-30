# Troubleshooting Knowledge Base

## 📊 Statistics
- **Total Entries**: 11
- **Success Rate**: 100% (13/13)
- **Most Common**: Frontend/Backend Mismatches
- **Time Saved**: ~200 minutes

## 🗂️ Quick Index
- [Frontend Issues](#frontend-issues) - React/JSX, Components, Store
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