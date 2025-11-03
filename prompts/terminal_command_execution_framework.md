# Terminal Command Execution Decision Framework

## Overview

This framework helps AI assistants make intelligent decisions about how to execute terminal commands, specifically whether to run them in the foreground (for immediate feedback) or background (for long-running processes).

## Decision Criteria

### 🔄 FOREGROUND EXECUTION (Default)
Run commands in the foreground when you need immediate output for decision-making or the command completes quickly.

**Use Foreground For:**
- **Data Retrieval**: Commands that return information you need immediately
  - `ls`, `ps`, `df`, `free`, `uptime`, `whoami`
  - `cat`, `head`, `tail`, `grep`, `find`
  - `git status`, `git log`, `git diff`

- **Quick Operations**: Commands that complete in <5 seconds
  - `mkdir`, `touch`, `cp`, `mv`, `rm` (small files)
  - `echo`, `printf`, `date`, `pwd`
  - Simple package queries: `which`, `type`, `command -v`

- **Validation/Testing**: Commands that verify system state
  - `ping`, `curl --head`, `nc -z`
  - `npm list`, `pip list`, `gem list`
  - Syntax checks: `node -c`, `python -m py_compile`

- **Interactive Commands**: Commands requiring user input
  - `ssh` (without automated scripts)
  - `sudo` (when password might be needed)
  - Configuration wizards

- **Build/Test Commands**: When you need immediate results
  - `make test`, `npm test`, `pytest` (if <30 seconds)
  - `gcc -o program program.c` (compilation)
  - Linting: `eslint`, `pylint`

### 🎯 BACKGROUND EXECUTION
Run commands in the background when they start long-running processes or servers that don't need immediate output.

**Use Background For:**
- **Server Processes**: Any command starting a server
  - `node index.mjs`, `python app.py`, `java -jar app.jar`
  - `npm start`, `yarn start`, `python -m flask run`
  - Database servers: `mongod`, `postgres`, `redis-server`

- **MCP Servers**: All Model Context Protocol servers
  - `node ansible-mcp-server/index.mjs`
  - `node ansible-ssh-decider/index.mjs`
  - `node documents-mcp-server/index.mjs`

- **Web Servers**: HTTP servers and proxies
  - `nginx`, `apache2`, `httpd`
  - `python -m http.server`, `php -S`
  - Reverse proxies and load balancers

- **System Services**: Service management
  - `systemctl start service`
  - `service start service`
  - Init scripts and daemon management

- **Build Processes**: Long-running compilations
  - `make`, `cmake --build` (if >30 seconds)
  - `npm run build`, `webpack`, `babel`
  - Large test suites: `npm test` (if >30 seconds)

- **Monitoring/Watch Commands**: Continuous processes
  - `tail -f /var/log/file.log`
  - `watch` commands, `inotifywait`
  - File system monitors

- **Background Jobs**: Processes meant to run indefinitely
  - Cron jobs, scheduled tasks
  - Queue processors, job workers
  - Network services (DHCP, DNS servers)

## Implementation Guidelines

### Background Command Syntax
```bash
# For Node.js servers
node server.js &

# For Python servers
python app.py &

# For system services
sudo systemctl start nginx &

# For build processes
npm run build &
```

### Checking Background Processes
```bash
# Check if process is running
ps aux | grep "process_name"

# Check specific port
netstat -tlnp | grep :port

# Check logs (if available)
tail -f /path/to/logfile.log

# Kill background process
pkill -f "process_name"
```

### Log File Considerations
When running background processes, consider:
- Does the application write to log files?
- Can logs be tailed for monitoring?
- Are there standard log locations?
- Should logs be checked after process start?

## Common Patterns & Anti-Patterns

### ✅ GOOD: Foreground for Quick Checks
```bash
# Check if Node.js is installed
which node

# Get current directory contents
ls -la

# Check git status
git status

# Validate JSON syntax
node -e "JSON.parse(require('fs').readFileSync('file.json'))"
```

### ❌ BAD: Foreground for Servers (Causes Freezing)
```bash
# DON'T DO THIS - will freeze the terminal
node server.js

# DON'T DO THIS - server starts but terminal hangs
python -m flask run
```

### ✅ GOOD: Background for Servers
```bash
# Start server in background
node server.js &

# Start with logging
node server.js > server.log 2>&1 &

# Start and check logs
node server.js &
sleep 2
tail -f server.log
```

### ✅ GOOD: Foreground for Immediate Results
```bash
# Get system information
df -h

# Check process status
ps aux | grep python

# Test connectivity
ping -c 3 google.com

# Validate configuration
nginx -t
```

## Decision Flowchart

```
Start with command to execute
           │
           ▼
    Is output needed immediately?
    (Do I need the result to continue?)
           │
           ├─ YES ──▶ FOREGROUND
           │         (ls, ps, grep, status checks)
           ▼
    Will command run >30 seconds?
           │
           ├─ YES ──▶ BACKGROUND
           │         (servers, builds, monitors)
           ▼
    Is it a server/daemon process?
           │
           ├─ YES ──▶ BACKGROUND
           │         (nginx, mongod, node servers)
           ▼
    Does it produce continuous output?
           │
           ├─ YES ──▶ BACKGROUND
           │         (tail -f, watch commands)
           ▼
    Default: FOREGROUND
    (quick commands, tests, validations)
```

## MCP Server Specific Guidelines

### Always Background:
- `node ansible-mcp-server/index.mjs`
- `node ansible-ssh-decider/index.mjs`
- `node documents-mcp-server/index.mjs`
- Any MCP server startup

### Check After Background Start:
```bash
# Verify MCP server is running
ps aux | grep "mcp-server"

# Check if port is listening
netstat -tlnp | grep :port

# Test server functionality
curl http://localhost:port/health
```

## Error Handling

### Background Process Failures:
```bash
# Check process status
ps aux | grep "process_name"

# Check logs immediately
tail -n 20 logfile.log

# Kill failed process
pkill -f "process_name"

# Restart with debugging
process_command > debug.log 2>&1 &
```

### Foreground Command Timeouts:
```bash
# Use timeout for potentially slow commands
timeout 30s slow_command

# Or run with time limit
timeout 10s npm test
```

## Best Practices

1. **Default to Foreground**: When in doubt, run in foreground
2. **Check Logs**: For background processes, always check logs after start
3. **Use Process Management**: Track PIDs and process names for cleanup
4. **Test Commands First**: Run similar commands in foreground to understand behavior
5. **Document Assumptions**: Note why you chose foreground/background
6. **Monitor Resources**: Be aware of system resource usage for background processes

## Examples by Command Type

### Development Servers
```bash
# Background - runs indefinitely
npm run dev &

# Background - Flask development server
python -m flask run &

# Background - Django development server
python manage.py runserver &
```

### Database Operations
```bash
# Foreground - quick query
sqlite3 db.sqlite "SELECT * FROM users LIMIT 5;"

# Background - start database server
mongod --dbpath /data/db &

# Foreground - check database status
systemctl status mongodb
```

### File Operations
```bash
# Foreground - quick listing
ls -la

# Foreground - small file operations
cp file1.txt file2.txt

# Background - large file copy
cp large_file.iso /mnt/backup &

# Foreground - check copy progress
ps aux | grep "cp large_file"
```

### Network Operations
```bash
# Foreground - quick connectivity test
ping -c 3 google.com

# Foreground - check listening ports
netstat -tlnp

# Background - start web server
python -m http.server 8000 &

# Foreground - test web server
curl http://localhost:8000
```

This framework ensures AI assistants make intelligent decisions about command execution, preventing terminal freezing and improving workflow efficiency.</content>
<parameter name="filePath">/Users/david/Documents/MCPHomeAutomation/prompts/terminal_command_execution_framework.md