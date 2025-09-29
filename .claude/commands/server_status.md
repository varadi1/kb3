---
description: Check the status of running services (Next.js, Uvicorn, Node)
allowed-tools: [Bash]
---

# System Status Check

!ps aux | grep -E '(next|uvicorn|node)' | grep -v grep

## Service Status Summary

This command shows all running processes related to:
- **Next.js** frontend development server
- **Uvicorn** Python backend server
- **Node.js** processes

Use this to quickly verify which services are currently active.