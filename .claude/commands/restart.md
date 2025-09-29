---
description: Restart the Next.js frontend development server
allowed-tools: [Bash]
argument-hint: "[frontend|backend|all]"
---

# Restart Services

!cd /workspace/knoba/frontend-nextjs && pkill -f 'next dev' 2>/dev/null; sleep 1; npm run dev

## Service Restart

This command will:
1. Navigate to the frontend directory
2. Kill any existing Next.js development processes
3. Wait 1 second for clean shutdown
4. Start the development server again

The frontend will be available at http://localhost:3000 once restarted.

**Note**: Currently only supports frontend restart. Backend restart functionality can be added later.