**Purpose**: Professional debugging and issue resolution with persistent knowledge base

---

## Command Execution
Execute: immediate. **Check in knowledge base (KB): TROUBLESHOOTING.md and docs/functions.md first**, then debug
Legend: Generated based on symbols used in command
Purpose: "[Action][Subject] in $ARGUMENTS"

Systematically debug and resolve issues in $ARGUMENTS using root cause analysis, evidence-based solutions, and **persistent knowledge base in `TROUBLESHOOTING.md` file and the description of all functions/endpoints/types/classes/variables/enums/tests in 'docs/functions.md'**.   


## Persistent Knowledge Base

**File Location**: `@~/troubleshooting.md` 

**Automatic Behavior**:
1. **ALWAYS check KB first** before debugging
2. **Auto-update KB** after solving any issue
3. **Track solution effectiveness**
4. **Learn from patterns** over time

Examples:
- `/fix "app crashes on startup"` - Check KB then debug crash
- `/fix --performance "slow API"` - KB + Performance analysis
- `/fix --interactive "login fails"` - KB + Guided debugging
- `/fix --kb-stats` - Show KB effectiveness metrics

## Command-Specific Flags
--performance: "Focus on performance bottlenecks"
--memory: "Memory leak detection and analysis"
--network: "Network-related debugging"
--interactive: "Step-by-step guided troubleshooting"
--trace: "Enable detailed execution tracing"
--bisect: "Git bisect to find breaking commit"
--kb-only: "Only check KB, don't debug if not found"
--kb-stats: "Show knowledge base statistics"
--skip-kb: "Skip KB check (emergency debugging)"

## Enhanced Troubleshooting Approach

**0. Check Knowledge Base:** 🆕
- Search `TROUBLESHOOTING.md` for error/symptoms
- Try existing solutions ranked by success rate
- If solved, update success metrics
- If not found/failed, proceed to step 1

**1. Reproduce:** Isolate minimal reproduction | Document steps | Verify consistency | Capture full context

**2. Gather Evidence:** Error messages & stack traces | Logs & metrics | System state | Recent changes | Environment differences | Analyse involved functions, APIs within the codebase | Analyse file and folder structure | Validate syntaxes, libraries with context7

**3. Form Hypotheses:** Driver tree analysis to determine the most likely causes | First principles approach to alternative explanations | Test predictions | Rule out possibilities
With problems not in the knowledge base yet use first principles thinking method and think ultrahard. Define clearly what the problem is. Using driver tree analysis determine the possible root causes of the problem. Identify hidden assumptions and address those as well. Determine all possible root causes, don't stop until you identify all possibly causes. Think hard them trough and come up with potential solutions. 

**4. Test & Verify:** Targeted experiments | Change one variable | Document results | Confirm root cause

**5. Fix & Prevent:** Implement solution | Add tests | Update error handling processes | Document fix | Prevent recurrence

**6. Update Knowledge Base:** 🆕
- Add problem/solution to `TROUBLESHOOTING.md`
- Include all context and evidence
- Tag with categories and keywords
- Link related issues

## Knowledge Base Structure

```markdown
# Troubleshooting Knowledge Base

## Index
- [Performance Issues](#performance-issues)
- [Crashes & Errors](#crashes-errors)
- [Integration Problems](#integration-problems)
- [Data Issues](#data-issues)

## Statistics
- Total Entries: XX
- Success Rate: XX%
- Most Common: [Issue Type]
- Time Saved: ~XX hours

---

## [Category]: [Subcategory]

### [ID]: [Error Message/Symptom]
**First Seen**: YYYY-MM-DD
**Occurrences**: X
**Success Rate**: X/Y (XX%)
**Tags**: #performance #api #timeout

#### Problem
- **Symptom**: What user sees
- **Error**: Exact error message
- **Context**: When it happens
- **Impact**: What breaks

#### Root Cause
[Detailed explanation of why this happens]

#### Solution
1. **Quick Fix** (X/Y success):
   ```bash
   # Commands or code
   ```

2. **Permanent Fix** (X/Y success):
   ```bash
   # Commands or code
   ```

#### Evidence/Diagnosis
- Log patterns to look for
- Metrics that indicate issue
- Debug commands used

#### Prevention
- Configuration changes
- Code patterns to avoid
- Monitoring to add

#### Related Issues
- [Link to similar problems]
- [Patterns to watch for]

---
```

## KB Integration Examples

```bash
# Automatic KB check on error
/troubleshoot "TypeError: Cannot read property 'map' of undefined"
> 🔍 Checking knowledge base...
> ✅ Found 3 matches in KB
> 
> Best match: [RE001] Array mapping on undefined (90% success)
> Solution: Add null check before mapping
> 
> Try this solution? (Y/n/debug): Y
> Applied solution...
> ✅ Issue resolved! Updating KB success metrics.

# KB didn't have solution
/troubleshoot "New weird API timeout"
> 🔍 Checking knowledge base...
> ❌ No matches found in KB
> 
> Starting systematic debugging...
> [... debugging process ...]
> ✅ Issue resolved!
> 
> Add to knowledge base? (Y/n): Y
> Creating KB entry...
> Entry [API003] added to troubleshooting.md

# View KB statistics
/troubleshoot --kb-stats
> 📊 Knowledge Base Statistics:
> - Total Entries: 47
> - Categories: Performance (12), Errors (23), Integration (8), Data (4)
> - Success Rate: 87%
> - Most Effective: [RE001] 95% success
> - Time Saved: ~12.5 hours
> - Recent Additions: 3 this week
```

## Common Issue Categories

**Performance:** Slow queries | Memory leaks | CPU bottlenecks | Network latency | Inefficient algorithms

**Crashes/Errors:** Null references | Type mismatches | Race conditions | Memory corruption | Stack overflow

**Integration:** API failures | Authentication issues | Version conflicts | Configuration problems | Network timeouts

**Data Issues:** Corruption | Inconsistency | Migration failures | Encoding problems | Concurrency conflicts

@include shared/quality-patterns.yml#Root_Cause_Analysis

## Automated KB Maintenance

**Weekly Tasks:**
- Analyze solution effectiveness
- Merge duplicate entries
- Update deprecated solutions
- Archive outdated issues

**Smart Features:**
- Pattern detection across issues
- Solution effectiveness tracking
- Automatic categorization
- Related issue linking
- Prevention pattern extraction

## Integration with Other Commands

**With `/task`:**
- Auto-create tasks for unresolved issues
- Link fixes to task completion
- Track debugging time per task

**With `/analyze`:**
- Proactive issue detection
- Suggest preventive measures
- Code pattern warnings

**With `/git`:**
- Link issues to commits
- Track when issues introduced
- Bisect integration

## Deliverables

**Immediate:**
- KB lookup results
- Solution application
- Success/failure tracking

**Root Cause Report:** Issue description | Evidence collected | Analysis process | Driver tree analysis | Root cause identified | Fix implemented

**Fix Documentation:** What was broken | Why it broke | How it was fixed | Prevention measures | Test cases added

**Knowledge Base Entry:** 🆕 Problem→Solution mapping | Success metrics | Prevention checklist | Related patterns

**KB Analytics:** 🆕 Most common issues | Success rates | Time saved | Pattern analysis | Team insights
