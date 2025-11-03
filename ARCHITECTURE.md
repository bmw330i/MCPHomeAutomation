# Infrastructure Management System Architecture

## Overview

This is a comprehensive home network infrastructure management system built around the Model Context Protocol (MCP) for intelligent automation and monitoring. The system manages a distributed network of devices including Mac Pros, Raspberry Pis, OpenWrt routers, and cloud servers, with specialized focus on secure infrastructure management and document access.

## Core Architecture Components

### 🏗️ System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Client Layer                          │
│  (Claude, VS Code, or other MCP-compatible applications)     │
└─────────────────────┬───────────────────────────────────────┘
                      │
           ┌──────────▼──────────┐
           │  MCP Server Layer   │
           │                     │
           │  ┌─────────────────┐│
           │  │Ansible-SSH      ││  ← Intelligent routing
           │  │Decider          ││
           │  └─────────────────┘│
           │                     │
           │  ┌─────────────────┐│
           │  │Ansible MCP      ││  ← Configuration management
           │  │Server           ││
           │  └─────────────────┘│
           │                     │
           │  ┌─────────────────┐│
           │  │Documents MCP    ││  ← Secure file access
           │  │Server           ││
           │  └─────────────────┘│
           └──────────┬──────────┘
                      │
           ┌──────────▼──────────┐
           │Infrastructure Layer │
           │                     │
           │  ┌─────────────────┐│
           │  │   Target Hosts   ││
           │  │                 ││
           │  │ • Mac Pro       ││
           │  │ • Raspberry Pi  ││
           │  │ • OpenWrt       ││
           │  │ • Mac Mini      ││
           │  │ • Linode VPS    ││
           │  └─────────────────┘│
           │                     │
           │  ┌─────────────────┐│
           │  │   Databases     ││
           │  │                 ││
           │  │ • SQLite        ││
           │  │ • MongoDB       ││
           │  └─────────────────┘│
           └─────────────────────┘
```

## MCP Server Ecosystem

### 1. Ansible-SSH Decider (`ansible-ssh-decider/`)

**Purpose**: Intelligent command routing based on operation type and context.

**Decision Logic**:
- **Ansible Path**: Configuration changes, package management, service operations
- **SSH Path**: Status checks, monitoring, information retrieval

**Key Features**:
- Keyword-based analysis of command descriptions
- Automatic tool selection for optimal execution
- Unified interface for both Ansible and SSH operations

### 2. Ansible MCP Server (`ansible-mcp-server/`)

**Purpose**: Traditional Ansible-based configuration management and orchestration.

**Capabilities**:
- Playbook execution across multiple hosts
- Inventory management and host discovery
- Configuration deployment and validation
- Service lifecycle management

**Integration Points**:
- Ansible inventory parsing
- Playbook repository management
- Multi-host parallel execution
- Error handling and rollback

### 3. Documents MCP Server (`documents-mcp-server/`)

**Purpose**: Secure, read-only access to user's Documents folder.

**Capabilities**:
- File listing and browsing within Documents directory
- Document content reading with size limits
- Content search across documents
- File metadata retrieval
- Cross-platform support (macOS, Windows, Linux)

**Security Features**:
- Path validation preventing directory traversal
- File size limits and extension filtering
- Read-only operations only
- Platform-specific Documents folder detection

## Infrastructure Topology

### Network Architecture

```
Internet
    │
    ▼
┌─────────────┐     ┌─────────────┐
│  Linode VPS │     │  OpenWrt    │
│ 173.255.    │     │ 192.168.1.1 │
│ 218.133     │     │   Router    │
└─────┬───────┘     └─────┬───────┘
      │                   │
      └─────────┬─────────┘
                │
        ┌───────▼───────┐
        │   Local LAN   │
        │ 192.168.1.0/24│
        └───────┬───────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼───┐   ┌───▼───┐   ┌───▼───┐
│Mac Pro│   │Mac Mini│  │RPi 5  │
│.214   │   │ .5    │   │ .116  │
│Deduplication│ │Dev     │   │IoT Hub │
│MongoDB     │ │Workstation│ │         │
└───────┘   └───────┘   └───────┘
```

### Device Specifications

#### Mac Pro (Primary Server)
- **IP**: 192.168.1.214
- **OS**: Debian Linux
- **Role**: Media server, deduplication processing, MongoDB host
- **Storage**: 11TB APFS1 (read-only), 11TB APFS2 (ext4 target), 8TB external
- **Services**: Jellyfin, MongoDB 8.0, deduplication workers

#### Mac Mini M4 (Development)
- **IP**: 192.168.1.5
- **OS**: macOS
- **Role**: Development workstation, MCP server host
- **Storage**: Internal SSD with external USB support

#### Raspberry Pi 5 (IoT Hub)
- **IP**: 192.168.1.116
- **OS**: Raspberry Pi OS
- **Role**: Home automation, monitoring, edge computing

#### OpenWrt Router (Network Gateway)
- **IP**: 192.168.1.1
- **OS**: OpenWrt
- **Role**: Routing, firewall, ad-blocking, WiFi management

#### Linode VPS (Cloud Services)
- **IP**: 173.255.218.133
- **OS**: Ubuntu Linux
- **Role**: Remote access, web services, backup storage

## Data Flow Architecture

### Infrastructure Management Flow

```
MCP Client → Ansible-SSH Decider → [Ansible|SSH] Server → Target Host
    │               │                        │
    │               │                        │
    └── Status ←────┼── Feedback Loop ───────┼── Execution Results
                   
- **Command validation**: Input sanitization and timeout controls
- **Privilege escalation**: Controlled sudo access with passwords
- **Document access**: Secure read-only file operations
```

### SQLite Database for Home Automation

```
Device Data → SQLite Database → MCP Servers
    │               │
    │               │
    └── Configuration ←── Environment Variables
                   
- **Device tracking**: IP addresses, hostnames, device types
- **Event logging**: Command execution history and status
- **Configuration storage**: System settings and preferences
```

## Performance Characteristics

### System Resources
- **Memory**: 62GB available, typical usage 2-3GB
- **CPU**: 6-core system, load average varies by operation
- **Storage**: 22TB total capacity across multiple volumes
- **Network**: Gigabit Ethernet with SSH optimization

### MCP Server Performance
- **Response Time**: Sub-second for most operations
- **Concurrent Operations**: Multiple simultaneous requests supported
- **Resource Usage**: Lightweight Node.js processes
- **Scalability**: Horizontal scaling through additional MCP servers

## Operational Modes

### 1. Intelligent Automation (Primary)
```
User Request → Keyword Analysis → Tool Selection → Execution → Results
```

### 2. Direct Ansible Operations
```
Playbook Selection → Inventory Parsing → Parallel Execution → Validation
```

### 3. Direct SSH Commands
```
Host Selection → Command Execution → Real-time Output → Completion
```

### 4. Document Access Operations
```
Path Validation → File Reading → Content Processing → Results
```

## Extension Points

### Adding New MCP Servers
1. Implement MCP protocol interface
2. Define tool schemas and handlers
3. Add to `mcp.json` configuration
4. Update documentation and tool selection logic

### Infrastructure Expansion
1. Add host to Ansible inventory
2. Configure SSH access and keys
3. Update environment variables
4. Test connectivity and operations

### Database Integration
1. Design SQLite schema for new data types
2. Implement data access patterns
3. Add monitoring and alerting
4. Integrate with existing workflows

## Monitoring and Observability

### Key Metrics
- **System Health**: CPU, memory, disk usage
- **Database Performance**: Query latency, connection status
- **Network Status**: Connectivity, bandwidth utilization
- **MCP Server Health**: Response times, error rates

### Logging Strategy
- **Application Logs**: Structured logging with levels
- **System Logs**: OS-level monitoring and alerts
- **Audit Logs**: Command execution tracking
- **Performance Logs**: Metrics collection and analysis

## Disaster Recovery

### Backup Strategy
- **Configuration Backups**: Regular environment and inventory backups
- **Database Backups**: SQLite database snapshots
- **Document Backups**: User data protection procedures
- **System Recovery**: Host-level disaster recovery

### Recovery Procedures
- **Process Restart**: Automatic MCP server recovery
- **Data Recovery**: Database restoration workflows
- **System Recovery**: Host-level disaster recovery
- **Configuration Recovery**: Environment variable restoration

This architecture provides a robust, scalable foundation for managing complex home network infrastructure with intelligent automation, comprehensive monitoring, and secure document access capabilities.

## Infrastructure Topology

### Network Architecture

```
Internet
    │
    ▼
┌─────────────┐     ┌─────────────┐
│  Linode VPS │     │  OpenWrt    │
│ 173.255.    │     │ 192.168.1.1 │
│ 218.133     │     │   Router    │
└─────┬───────┘     └─────┬───────┘
      │                   │
      └─────────┬─────────┘
                │
        ┌───────▼───────┐
        │   Local LAN   │
        │ 192.168.1.0/24│
        └───────┬───────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼───┐   ┌───▼───┐   ┌───▼───┐
│Mac Pro│   │Mac Mini│  │RPi 5  │
│.214   │   │ .5    │   │ .116  │
│Deduplication│ │Dev     │   │IoT Hub │
│MongoDB     │ │Workstation│ │         │
└───────┘   └───────┘   └───────┘
```

### Device Specifications

#### Mac Pro (Primary Server)
- **IP**: 192.168.1.214
- **OS**: Debian Linux
- **Role**: Media server, deduplication processing, MongoDB host
- **Storage**: 11TB APFS1 (read-only), 11TB APFS2 (ext4 target), 8TB external
- **Services**: Jellyfin, MongoDB 8.0, deduplication workers

#### Mac Mini M4 (Development)
- **IP**: 192.168.1.5
- **OS**: macOS
- **Role**: Development workstation, MCP server host
- **Storage**: Internal SSD with external USB support

#### Raspberry Pi 5 (IoT Hub)
- **IP**: 192.168.1.116
- **OS**: Raspberry Pi OS
- **Role**: Home automation, monitoring, edge computing

#### OpenWrt Router (Network Gateway)
- **IP**: 192.168.1.1
- **OS**: OpenWrt
- **Role**: Routing, firewall, ad-blocking, WiFi management

#### Linode VPS (Cloud Services)
- **IP**: 173.255.218.133
- **OS**: Ubuntu Linux
- **Role**: Remote access, web services, backup storage

## Data Flow Architecture

### Infrastructure Management Flow

```
MCP Client → Ansible-SSH Decider → [Ansible|SSH] Server → Target Host
    │               │                        │
    │               │                        │
    └── Status ←────┼── Feedback Loop ───────┼── Execution Results
                   
- **Command validation**: Input sanitization and timeout controls
- **Privilege escalation**: Controlled sudo access with passwords
- **Document access**: Secure read-only file operations
```

### SQLite Database for Home Automation

```
Device Data → SQLite Database → MCP Servers
    │               │
    │               │
    └── Configuration ←── Environment Variables
                   
- **Device tracking**: IP addresses, hostnames, device types
- **Event logging**: Command execution history and status
- **Configuration storage**: System settings and preferences
```

## Performance Characteristics

### System Resources
- **Memory**: 62GB available, typical usage 2-3GB
- **CPU**: 6-core system, load average varies by operation
- **Storage**: 22TB total capacity across multiple volumes
- **Network**: Gigabit Ethernet with SSH optimization

### MCP Server Performance
- **Response Time**: Sub-second for most operations
- **Concurrent Operations**: Multiple simultaneous requests supported
- **Resource Usage**: Lightweight Node.js processes
- **Scalability**: Horizontal scaling through additional MCP servers

## Operational Modes

### 1. Intelligent Automation (Primary)
```
User Request → Keyword Analysis → Tool Selection → Execution → Results
```

### 2. Direct Ansible Operations
```
Playbook Selection → Inventory Parsing → Parallel Execution → Validation
```

### 3. Direct SSH Commands
```
Host Selection → Command Execution → Real-time Output → Completion
```

### 4. Document Access Operations
```
Path Validation → File Reading → Content Processing → Results
```

## Extension Points

### Adding New MCP Servers
1. Implement MCP protocol interface
2. Define tool schemas and handlers
3. Add to `mcp.json` configuration
4. Update documentation and tool selection logic

### Infrastructure Expansion
1. Add host to Ansible inventory
2. Configure SSH access and keys
3. Update environment variables
4. Test connectivity and operations

### Database Integration
1. Design SQLite schema for new data types
2. Implement data access patterns
3. Add monitoring and alerting
4. Integrate with existing workflows

## Monitoring and Observability

### Key Metrics
- **System Health**: CPU, memory, disk usage
- **Database Performance**: Query latency, connection status
- **Network Status**: Connectivity, bandwidth utilization
- **MCP Server Health**: Response times, error rates

### Logging Strategy
- **Application Logs**: Structured logging with levels
- **System Logs**: OS-level monitoring and alerts
- **Audit Logs**: Command execution tracking
- **Performance Logs**: Metrics collection and analysis

## Disaster Recovery

### Backup Strategy
- **Configuration Backups**: Regular environment and inventory backups
- **Database Backups**: SQLite database snapshots
- **Document Backups**: User data protection procedures
- **System Recovery**: Host-level disaster recovery

### Recovery Procedures
- **Process Restart**: Automatic MCP server recovery
- **Data Recovery**: Database restoration workflows
- **System Recovery**: Host-level disaster recovery
- **Configuration Recovery**: Environment variable restoration

This architecture provides a robust, scalable foundation for managing complex home network infrastructure with intelligent automation, comprehensive monitoring, and secure document access capabilities.</content>
<parameter name="filePath">/Users/david/Documents/Ansible/ARCHITECTURE.md