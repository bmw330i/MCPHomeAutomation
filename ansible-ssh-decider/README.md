# Ansible-SSH Decider MCP Server

An MCP server that intelligently decides whether to use Ansible or SSH for executing commands on remote hosts.

## Decision Logic

The server analyzes the command description and content to choose the appropriate execution method:

### Uses Ansible for:
- Configuration management (install, configure, remove)
- System changes (modify, update, create, delete)
- Service management (start, stop, restart, enable, disable)
- Package management (apt, yum, pip, npm)
- File system operations (mount, format, backup)

### Uses SSH for:
- Status checks (status, show, list, get)
- Monitoring (monitor, check, ps, top)
- Information retrieval (df, free, uptime, hostname)
- Simple output commands (cat, echo, date)

## Installation

```bash
cd ansible-ssh-decider
npm install
```

## Usage

The server provides one tool: `execute_command`

Parameters:
- `host`: Target host name (macpro, rpi5, mini, linode, etc.)
- `command`: The shell command to execute
- `description`: Description of what the command does

Example:
```json
{
  "host": "macpro",
  "command": "ps aux | grep python",
  "description": "Check running Python processes"
}
```

This would use SSH since it's a status check.

Another example:
```json
{
  "host": "macpro",
  "command": "apt-get update && apt-get install -y vim",
  "description": "Install vim package"
}
```

This would use Ansible since it's package installation.

## Dependencies

- Node.js
- Ansible (for Ansible execution)
- SSH access to target hosts (for SSH execution)
- Inventory file at `../inventory.ini`
- SSH tools script at `../ssh-tools.sh`