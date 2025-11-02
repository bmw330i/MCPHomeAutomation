# Ansible MCP Server Architecture

## Overview

The Ansible MCP Server is designed as a bridge between Model Context Protocol (MCP) clients and Ansible infrastructure management. It provides a standardized interface for managing home network devices, executing playbooks, and monitoring system status through MCP tools.

## Architecture Components

### 1. Core Server (`index.mjs`)

The main server class `AnsibleMCPServer` handles:
- MCP protocol communication via stdio transport
- Tool registration and request routing
- Command execution and process management
- Error handling and response formatting

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Client    │◄──►│ AnsibleMCPServer│◄──►│  Ansible CLI    │
│   (Claude/etc)  │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ Target Devices  │
                       │ • OpenWrt       │
                       │ • Raspberry Pi  │
                       │ • MacPro        │
                       │ • Mac Mini M4   │
                       │ • Linode        │
                       └─────────────────┘
```

### 2. Tool Categories

#### Inventory Management Tools
- **`list_ansible_hosts`**: Parses `inventory.ini` and provides host information
- Groups hosts by categories (openwrt, macpro, mini, rpi5, linode)
- Extracts connection parameters and variables

#### Execution Tools
- **`run_playbook`**: Executes ansible-playbook commands
- **`run_ansible_command`**: Runs ad-hoc ansible module commands
- Supports parameter passing, privilege escalation, and filtering

#### Device-Specific Tools
- **`configure_openwrt_device`**: Specialized OpenWrt configuration
- **`check_device_status`**: System information gathering
- **`backup_device_config`**: Configuration backup operations
- **`deploy_adblock`**: Service deployment automation

### 3. File System Structure

```
ansible-mcp-server/
├── index.mjs           # Main server implementation
├── package.json        # Node.js dependencies and metadata
├── mcp.json           # MCP client configuration
├── README.md          # User documentation
└── ARCHITECTURE.md    # This file

../                    # Parent Ansible directory
├── inventory.ini      # Ansible inventory
├── playbooks/         # Ansible playbooks
│   ├── configure_banana_pi.yaml
│   ├── configpi.yaml
│   └── ...
└── templates/         # Jinja2 templates
```

## Target Infrastructure

### Network Topology
The Ansible MCP Server manages a distributed home network infrastructure across multiple device types:

### 1. Mac Mini M4 (mini - 192.168.1.5)
- **Role**: Primary management workstation and development environment
- **OS**: macOS (Apple Silicon M4)
- **Function**: Ansible control node, development system, MCP server host
- **Storage**: Internal SSD with external USB drive support
- **Connectivity**: SSH on port 2220, standard network access

### 2. MacPro 6,1 (macpro - 192.168.1.214)
- **Role**: Media server and high-capacity storage system
- **OS**: Linux (Ubuntu-based)
- **Function**: Jellyfin media server, bulk storage, migration operations
- **Storage**: Multiple APFS and ext4 volumes (APFS1: 11TB, APFS2: 11TB, External8TB: 7.3TB)
- **Services**: Jellyfin media server, deduplication processes
- **Connectivity**: SSH on port 2220

### 3. OpenWrt Router (192.168.1.1)
- **Role**: Network gateway and traffic management
- **OS**: OpenWrt Linux
- **Function**: Routing, firewall, ad-blocking, network services
- **Connectivity**: SSH on port 2220, web interface on port 80/443

### 4. Raspberry Pi 5 (rpi5 - 192.168.1.116)
- **Role**: IoT hub and lightweight services
- **OS**: Raspberry Pi OS (Debian-based)
- **Function**: Home automation, monitoring, edge computing
- **Connectivity**: SSH on port 2220

### 5. Linode VPS (linode - 173.255.218.133)
- **Role**: Public-facing services and remote access
- **OS**: Linux (cloud instance)
- **Function**: Web hosting, remote access gateway, backup services
- **Connectivity**: SSH on port 2220, public internet access

## Data Flow

### 1. Tool Invocation Flow
```
MCP Client Request → Tool Router → Parameter Validation → Command Builder → Ansible Execution → Response Formatter → MCP Client
```

### 2. Command Execution Flow
```
1. Build ansible/ansible-playbook command with arguments
2. Set environment variables (ANSIBLE_HOST_KEY_CHECKING=False)
3. Execute command with spawn() in ansible base directory
4. Capture stdout/stderr streams
5. Format results with execution status and output
```

### 3. Inventory Parsing Flow
```
1. Read inventory.ini file
2. Parse groups [groupname] and host entries
3. Extract host-specific variables (ansible_host, ansible_user, etc.)
4. Build structured host objects with group memberships
5. Return filtered or complete host list
```

## Security Model

### 1. Authentication
- Uses SSH key-based authentication configured in inventory
- Supports per-host SSH keys via `ansible_ssh_private_key_file`
- No password storage in MCP server code

### 2. Authorization
- Privilege escalation controlled via `become` parameter
- SSH access limited by inventory configuration
- MCP server runs with user permissions, not root

### 3. Input Validation
- JSON schema validation for all tool parameters
- Path traversal protection for playbook selection
- Command injection prevention via spawn() with argument arrays

## Extension Points

### 1. Adding New Tools
```javascript
// In setupToolHandlers():
{
  name: 'new_tool_name',
  description: 'Tool description',
  inputSchema: { /* JSON schema */ }
}

// Add handler in CallToolRequestSchema:
case 'new_tool_name':
  return await this.newToolMethod(args);
```

### 2. Custom Playbook Integration
- Place playbooks in `../playbooks/` directory
- Use `run_playbook` tool with relative paths
- Support for extra variables and tags

### 3. Device Type Extensions
- Follow pattern of `configure_openwrt_device` 
- Create device-specific configuration tools
- Leverage existing `run_playbook` infrastructure

## Error Handling Strategy

### 1. MCP Error Types
- `ErrorCode.MethodNotFound`: Unknown tool names
- `ErrorCode.InvalidParams`: Schema validation failures  
- `ErrorCode.InternalError`: Execution failures

### 2. Command Execution Errors
- Capture both stdout and stderr
- Include exit codes in responses
- Provide full command line for debugging

### 3. File System Errors
- Graceful handling of missing playbooks
- Inventory parsing error recovery
- Permission denied scenarios

## Performance Considerations

### 1. Command Execution
- Uses Node.js spawn() for non-blocking execution
- Streams output for large command responses
- Timeout handling for long-running operations

### 2. Inventory Caching
- Re-parses inventory.ini on each request (ensures fresh data)
- Lightweight parsing suitable for small to medium inventories
- Could be optimized with file watching for large deployments

### 3. Concurrent Operations
- Each tool invocation spawns separate process
- No shared state between requests
- Stateless design enables concurrent execution

### 4. Storage Operations
- **APFS Migration**: Completed 2TB APFS2 migration with ext4 formatting
- **Intelligent Deduplication**: SHA256-based content analysis for 7.3TB External8TB → APFS2
- **Media Server**: Jellyfin service management with automatic restart capabilities
- **Drive Management**: USB drive formatting, mounting, and fstab configuration

## Current Operations Status

### Active Deduplication Migration
- **Status**: Actively processing with MongoDB persistence
- **Progress**: 41,650/776,898 files processed (5.36%)
- **Workers**: 6 parallel processes with real-time MongoDB streaming
- **Database**: MongoDB 8.0 container with optimized deduplication indexes
- **Source**: 8TB external drive (`/mnt/external8tb`)
- **Target**: 11TB APFS2 volume (`/mnt/apfs2`)
- **Estimated Completion**: 2-3 weeks of continuous processing

### Service Status
- **Jellyfin Media Server**: Running on MacPro (192.168.1.214:8096)
- **MongoDB Database**: Active in Docker container with deduplication data
- **APFS Drives**: Mounted and accessible (APFS1: read-write, APFS2: ext4)
- **SSH Infrastructure**: All hosts accessible via port 2220
- **MCP Servers**: Four active servers with intelligent routing

## Monitoring and Debugging

### 1. Logging
- Error events logged to stderr
- Command execution details in responses
- Process output captured and returned

### 2. Development Mode
- `npm run dev` enables file watching
- Enhanced error reporting
- Debug output available

### 3. Health Checks
- `check_device_status` provides system monitoring
- SSH connectivity verification
- Service status reporting

This architecture provides a robust, extensible foundation for managing home network infrastructure through the Model Context Protocol while maintaining security and operational simplicity.