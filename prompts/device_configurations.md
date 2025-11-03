# Home Network Device Configurations

This document contains configuration details and setup procedures for various home network devices managed through MCP servers.

## Device Inventory

### Mac Pro (Primary Server)
- **IP**: 192.168.1.214
- **OS**: Debian Linux
- **SSH Port**: 2220
- **User**: david
- **Role**: Media server, deduplication processing, MongoDB host
- **Storage**:
  - 11TB APFS1 (read-only mount)
  - 11TB APFS2 (ext4 target)
  - 8TB external USB drive
- **Services**: Jellyfin, MongoDB 8.0, deduplication workers

### Mac Mini M4 (Development Workstation)
- **IP**: 192.168.1.5
- **OS**: macOS
- **Role**: Development workstation, MCP server host
- **Services**: Development environment, MCP servers

### Raspberry Pi 5 (IoT Hub)
- **IP**: 192.168.1.116
- **OS**: Raspberry Pi OS
- **Role**: Home automation, monitoring, edge computing

### OpenWrt Router (Network Gateway)
- **IP**: 192.168.1.1
- **OS**: OpenWrt
- **Role**: Routing, firewall, ad-blocking, WiFi management
- **WiFi**: Configurable SSID and password
- **LAN**: 192.168.1.1/24 network

### Linode VPS (Cloud Services)
- **IP**: 173.255.218.133
- **OS**: Ubuntu Linux
- **Role**: Remote access, web services, backup storage

## MCP Server Ecosystem

### Ansible MCP Server
- **Purpose**: Infrastructure configuration and management
- **Capabilities**: Playbook execution, device configuration, service deployment
- **Security**: Input validation, rate limiting, audit logging

### Ansible-SSH Decider
- **Purpose**: Intelligent command routing between Ansible and SSH
- **Decision Logic**: Keyword analysis for optimal execution path
- **Capabilities**: Automatic tool selection, unified interface

### Documents MCP Server
- **Purpose**: Secure read-only access to Documents folder
- **Capabilities**: File browsing, content reading, search functionality
- **Security**: Path validation, size limits, read-only operations

## Configuration Procedures

### OpenWrt Router Setup
1. Access router at 192.168.1.1
2. Configure WiFi with desired SSID and WPA2 password
3. Set LAN IP to 192.168.1.1
4. Enable ad-blocking services
5. Configure firewall rules

### Mac Pro Server Setup
1. SSH access on port 2220
2. Mount APFS drives using apfs-fuse:
   ```bash
   apfs-fuse -o uid=1000,gid=1000,allow_other /dev/sda2 /mnt/apfs1
   apfs-fuse -o uid=1000,gid=1000,allow_other /dev/sdb1 /mnt/apfs2
   ```
3. Start MongoDB service
4. Configure deduplication workers

### USB Drive Management
- Use USB 3.0 cables for optimal performance
- External drives connected via Sabrent DS-2BCR enclosure
- Some drives may be limited to USB 2.0 speeds due to enclosure design

### Network Security
- SSH key-based authentication
- Firewall rules on OpenWrt router
- Environment variable configuration for credentials
- Regular security updates

## MCP Server Configuration

### Environment Variables (.env file)
```bash
# Ansible MCP Server Configuration
ANSIBLE_INVENTORY=inventory.ini
ANSIBLE_BASE_PATH=/Users/david/Documents/MCPHomeAutomation

# Device Credentials (example - use actual values)
OPENWRT_PASS=your_openwrt_password
MACPRO_SUDO_PASS=your_sudo_password

# Python Environment
PYTHON_EXECUTABLE=/Users/david/Documents/MCPHomeAutomation/.venv/bin/python
PYTHONPATH=/Users/david/Documents/MCPHomeAutomation

# SQLite Database
SQLITE_DB_PATH=data/home_automation.db
```

## Troubleshooting Notes

### USB Speed Issues
- Verify cable type (USB 3.0 vs 2.0)
- Check enclosure interface mapping
- Some Sabrent enclosures have mixed USB 2.0/3.0 interfaces

### SSH Connection Problems
- Verify SSH key permissions (600)
- Check firewall rules
- Confirm correct port numbers

### Ansible Playbook Failures
- Use --become for privileged operations
- Check inventory file syntax
- Verify host connectivity

### MCP Server Issues
- Check Node.js version (18+)
- Verify environment variables
- Review server logs for errors

### Document Access Issues
- Ensure Documents folder exists
- Check file permissions
- Verify path validation settings

## Recent Configuration Changes

### Virtual Environment Setup
- Python 3.13.5 virtual environment configured
- Dependencies installed: requests, python-dotenv, sqlalchemy, pypdf
- Database initialization scripts updated

### SQLite Database Implementation
- Replaced potential MongoDB usage with SQLite for home automation data
- Tables: devices, events, configuration
- JSON support for flexible data storage

### MCP Server Updates
- Documents MCP server added for secure file access
- Environment variable integration improved
- Setup verification script created

This configuration guide serves as a reference for setting up and maintaining the home network infrastructure managed through MCP servers.</content>
<parameter name="filePath">/Users/david/Documents/MCPHomeAutomation/prompts/device_configurations.md