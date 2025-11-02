# Infrastructure Management System Architecture

## Overview

This is a comprehensive home network infrastructure management system built around the Model Context Protocol (MCP) for intelligent automation and monitoring. The system manages a distributed network of devices including Mac Pros, Raspberry Pis, OpenWrt routers, and cloud servers, with specialized focus on large-scale data deduplication operations.

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
           │  │SSH MCP Server   ││  ← Direct command execution
           │  └─────────────────┘│
           │                     │
           │  ┌─────────────────┐│
           │  │MongoDB MCP      ││  ← Database operations
           │  │Server           ││
           │  └─────────────────┘│
           │                     │
           │  ┌─────────────────┐│
           │  │LoRa MCP Server  ││  ← Wireless communication for IoT
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
           │  │ • MongoDB 8.0   ││
           │  │ • Docker        ││
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

### 3. SSH MCP Server (`ssh-mcp.mjs`)

**Purpose**: Direct SSH command execution with credential management.

**Capabilities**:
- Real-time command execution
- Non-blocking monitoring operations
- Interactive session management
- Background process handling

**Security Features**:
- SSH key-based authentication
- Connection timeout management
- Credential isolation per host

### 4. MongoDB MCP Server (`mongo-mcp-server/`)

**Purpose**: Database administration and deduplication data management.

**Capabilities**:
- Direct MongoDB query execution
- Index management and optimization
- Data import/export operations
- Aggregation pipeline processing

**Specialized Features**:
- Deduplication hash database management
- Remote gzip import via SSH tunneling
- Performance monitoring and statistics

### 5. LoRa MCP Server (`lora-mcp-server/`)

**Purpose**: Wireless LoRa communication management for IoT devices and remote sensors.

**Capabilities**:
- Board detection and firmware programming
- LoRa message sending/receiving
- Network topology management
- Real-time traffic monitoring

**Hardware Support**:
- TTGO LoRa32 boards (ground station with LCD)
- LilyGo T22_V1.1 boards (remote nodes with GPS)
- 868/915MHz frequency bands

**Key Features**:
- Automatic board detection via USB
- Arduino CLI integration for programming
- Ground station coordination
- Mesh network support

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

### Deduplication Pipeline

```
Source Files (8TB External)
        │
        ▼
┌─────────────────────┐
│ Parallel Hashing    │ ← 6 worker processes
│ (SHA-256 + metadata)│
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ MongoDB Streaming   │ ← Real-time persistence
│ dedup.file_hashes   │
└─────────┬───────────┘
          │
          ▼
Target Storage (11TB APFS2)
```

### Monitoring and Control Flow

```
MCP Client → Ansible-SSH Decider → [Ansible|SSH|MongoDB] Server → Target Host
    │               │                        │
    │               │                        │
    └── Status ←────┼── Feedback Loop ───────┼── Execution Results
                   
- **Command validation**: Input sanitization and timeout controls
- **Privilege escalation**: Controlled sudo access with passwords

## Performance Characteristics

### Deduplication Processing
- **Workers**: 6 parallel processes
- **Throughput**: Variable based on file sizes (large files: 6-8GB batches)
- **Persistence**: MongoDB streaming with batch commits
- **Monitoring**: Real-time progress tracking

### System Resources
- **Memory**: 62GB available, typical usage 2-3GB
- **CPU**: 6-core system, load average 6.0 during processing
- **Storage**: 22TB total capacity across multiple volumes
- **Network**: Gigabit Ethernet with SSH optimization

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

### 4. Database Operations
```
Query Construction → MongoDB Execution → Result Processing → Analytics
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
1. Design collection schemas
2. Implement query optimization
3. Add monitoring and alerting
4. Integrate with existing workflows

## Monitoring and Observability

### Key Metrics
- **Deduplication Progress**: Files processed vs total (41,650/776,898)
- **System Health**: CPU, memory, disk usage
- **Database Performance**: Query latency, connection status
- **Network Status**: Connectivity, bandwidth utilization

### Logging Strategy
- **Application Logs**: Structured logging with levels
- **System Logs**: OS-level monitoring and alerts
- **Audit Logs**: Command execution tracking
- **Performance Logs**: Metrics collection and analysis

## Disaster Recovery

### Backup Strategy
- **Incremental Backups**: Every 5 minutes during processing
- **Multiple Locations**: Local and remote storage
- **Verification**: Automated integrity checks
- **Retention**: Configurable backup lifecycle

### Recovery Procedures
- **Process Restart**: Automatic resumption capabilities
- **Data Recovery**: Backup restoration workflows
- **System Recovery**: Host-level disaster recovery
- **Database Recovery**: MongoDB backup and restore

This architecture provides a robust, scalable foundation for managing complex home network infrastructure with intelligent automation, comprehensive monitoring, and reliable data processing capabilities.</content>
<parameter name="filePath">/Users/david/Documents/Ansible/ARCHITECTURE.md