---
description: Initialize a new Claude Code session with system status and project context
allowed-tools: [Bash, Read]
---

# Session Initialization


## getting up to date
With the help of 3 subagents: 
1. READ @~/CLAUDE.md to understand project structure, functions, folder and file structures and to be aware of the purpose and state of the codebase. Always update this file when a relevant information has to be changed or added. Keep your updates structured short and concise.
2. READ @~/Troubleshooting.md so you understand what kinds of problems have occured and how they were fixed. When debugging, problem solving: always look in this file to see if there is a solution already. Always update this file when a relevant information has to be changed or added, each time record the date as well. Keep your updates structured short and concise.
3. READ @~/Tasks.md to see what has been done recently and what is ahead to do. Always keep track of tasks in this file: add new tasks with context and mark tasks complete when they are completed, each time record the date as well! Always update this file when a relevant information has to be changed or added. Keep your updates structured short and concise.


## Additional Context

This command runs a session initialization that:

- Shows recent tasks from the project
- Provides a quick overview to get you oriented in the project

