# Troubleshooting Knowledge Base

## Index
- [React/JSX Errors](#reactjsx-errors)
- [Build Errors](#build-errors)
- [Component Issues](#component-issues)

## Statistics
- Total Entries: 1
- Success Rate: 100% (1/1)
- Most Common: JSX Fragment Errors
- Time Saved: ~30 minutes

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

## Notes
- Always check this KB first before debugging
- Update success metrics after each use
- Add new patterns as they emerge