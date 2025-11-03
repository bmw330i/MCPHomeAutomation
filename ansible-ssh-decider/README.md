# Ansible-SSH Decider MCP Server

An MCP server that intelligently decides whether to use Ansible or SSH for executing commands on remote hosts.

**Note**: This server uses intelligent decision logic to route commands appropriately. For guidance on when to run terminal commands in foreground vs background, see the [Terminal Command Execution Framework](prompts/terminal_command_execution_framework.md).

## Decision Logic

The server analyzes the command description and content to choose the appropriate execution method using a hierarchical rule system:

### Uses Ansible for (in priority order):
1. **File Write Operations**: Commands that modify files (`>`, `>>`, `| tee`)
2. **Privileged Operations**: Commands containing `sudo`, `su`, or requiring elevated privileges
3. **Network Configuration**: Firewall rules, routing, interface configuration
4. **Idempotent Operations**: Package managers (`apt`, `yum`, `pip`), service control (`systemctl`)
5. **Configuration Changes**: System modifications, installations, service management

### Uses SSH for:
1. **Status Queries**: Information gathering commands (`ps`, `df`, `free`, `uptime`)
2. **Simple Output**: Commands that just return data without side effects
3. **Monitoring**: Real-time status checks and log tailing
4. **Non-idempotent Operations**: Commands that aren't safe to run multiple times

### Decision Priority (in order):
1. **File Operations**: Write/modify operations → Ansible
2. **Privilege Detection**: Explicit sudo/privilege indicators → Ansible
3. **Network Config**: System networking → Ansible
4. **Idempotent Operations**: Package/service management → Ansible
5. **Config Changes**: System modification keywords → Ansible
6. **Status Queries**: Information gathering → SSH
7. **Default**: Simple output commands → SSH

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

### Examples

**SSH Usage (Status Query):**
```json
{
  "host": "macpro",
  "command": "ps aux | grep python",
  "description": "Check running Python processes"
}
```
→ Uses SSH (status monitoring, no side effects)

**Ansible Usage (Package Installation):**
```json
{
  "host": "macpro",
  "command": "apt-get update && apt-get install -y vim",
  "description": "Install vim package"
}
```
→ Uses Ansible (package management, requires sudo, idempotent)

**Ansible Usage (Privileged Operation):**
```json
{
  "host": "macpro",
  "command": "sudo systemctl restart nginx",
  "description": "Restart nginx service"
}
```
→ Uses Ansible (explicit sudo, service management, idempotent)

**Ansible Usage (File Modification):**
```json
{
  "host": "macpro",
  "command": "echo 'nameserver 8.8.8.8' >> /etc/resolv.conf",
  "description": "Add DNS server to resolv.conf"
}
```
→ Uses Ansible (file modification, requires sudo)

**SSH Usage (Information Gathering):**
```json
{
  "host": "macpro",
  "command": "df -h / | tail -1",
  "description": "Check disk usage on root filesystem"
}
```
→ Uses SSH (status query, read-only)

## Dependencies

- Node.js 18+
- Ansible (for Ansible execution)
- SSH access to target hosts (for SSH execution)
- Inventory file at `../inventory.ini`
- Environment variables configured in `../.env`