---
allowed-tools: [Read, Grep, Glob, Bash, TodoWrite]
description: "Diagnose and resolve issues in code, builds, or system behaviour"
---

# /sc:troubleshoot - Issue Diagnosis and Resolution

## Purpose
Systematically diagnose and resolve issues in code, builds, deployments, or system behaviour.

## Usage
```
/sc:troubleshoot [issue] [--type bug|build|performance|deployment] [--trace] [--fix]
```

## Arguments
- `issue` - Description of the problem or error message
- `--type` - Issue category (bug, build, performance, deployment)
- `--trace` - Enable detailed tracing and logging
- `--fix` - Automatically apply fixes when safe

## Execution
1. Analyze issue description and gather initial context
2. Check the codebase to make sure there will be no duplicate efforts. Check docs/functions.md to see what functions/endpoints/types/classes/variables/enums/tests have been registered for the codebase.
2. Identify potential root causes and investigation paths
3. Execute systematic debugging and diagnosis
4. Propose and validate solution approaches
5. Apply fixes and verify resolution

## Claude Code Integration
- Uses Read for error log analysis
- Leverages Bash for runtime diagnostics
- Applies Grep for pattern-based issue detection
- Maintains structured troubleshooting documentation