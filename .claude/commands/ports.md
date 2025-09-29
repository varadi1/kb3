---
description: Show all ports currently in use by listening services
allowed-tools: [Bash]
---

# Active Ports Check

!netstat -tulpn 2>/dev/null | grep LISTEN || lsof -i -P -n | grep LISTEN

## Port Usage Overview

This command displays all ports that are currently being listened on by services. Common ports you might see:

- **3000**: Next.js development server
- **8000**: Uvicorn/FastAPI backend
- **5432**: PostgreSQL database
- **6379**: Redis cache

If `netstat` is not available, it will fall back to using `lsof`.