# Home Network Device Configurations

This document contains configuration details and setup procedures for various home network devices managed through MCP servers.

## Device Inventory

### Mac Pro (Primary Server)
- **IP**: [REDACTED]
- **OS**: Debian Linux
- **SSH Port**: 2220
- **User**: [REDACTED]
- **Role**: Media server, deduplication processing, MongoDB host
- **Storage**:
  - 11TB APFS1 (read-only mount)
  - 11TB APFS2 (ext4 target)
  - 8TB external USB drive
- **Services**: Jellyfin, MongoDB 8.0, deduplication workers

### Mac Mini M4 (Development Workstation)
- **IP**: [REDACTED]
- **OS**: macOS
- **Role**: Development workstation, MCP server host
- **Services**: Mosquitto MQTT broker, development environment

### Raspberry Pi 5 (IoT Hub)
- **IP**: [REDACTED]
- **OS**: Raspberry Pi OS
- **Role**: Home automation, monitoring, edge computing

### OpenWrt Router (Network Gateway)
- **IP**: [REDACTED]
- **OS**: OpenWrt
- **Role**: Routing, firewall, ad-blocking, WiFi management
- **WiFi**: Configurable SSID and password
- **LAN**: 192.168.1.1/24 network

### Linode VPS (Cloud Services)
- **IP**: [REDACTED]
- **OS**: Ubuntu Linux
- **Role**: Remote access, web services, backup storage

## Configuration Procedures

### OpenWrt Router Setup
1. Access router at [REDACTED]
2. Configure WiFi with desired SSID and WPA2 password
3. Set LAN IP to [REDACTED]
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
- Ansible Vault for sensitive credentials
- Regular security updates

## MCP Server Configuration

### Environment Variables (scrubbed for security)
```bash
# Ansible MCP Server
ANSIBLE_HOST_KEY_CHECKING=False
ANSIBLE_INVENTORY=/path/to/inventory.ini
ANSIBLE_BASE_PATH=/path/to/ansible/directory

# SSH MCP Server
SSH_USER=[REDACTED]
SSH_PORT=2220
SSH_KEY_PATH=~/.ssh/id_rsa

# MongoDB MCP Server
MONGO_URI=mongodb://user:pass@host:port/?authSource=admin
MONGO_DB=dedup
MONGO_COLLECTION=file_hashes
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

### MongoDB Connection Issues
- Check authentication credentials
- Verify network connectivity
- Confirm database service status

## Recent Configuration Changes

### Mosquitto MQTT Setup
- Installed via Homebrew on Mac Mini M4
- Running on default port 1883
- Replaced Docker-based messaging

### Docker Removal
- Completely removed Docker from Mac Mini M4
- Cleaned up binaries, symlinks, and completion files
- System now uses native services

### Deduplication System
- MongoDB-based file hash storage
- Parallel worker processes for hashing
- Systemd service management
- Real-time progress monitoring

This configuration guide serves as a reference for setting up and maintaining the home network infrastructure managed through MCP servers.</content>
<parameter name="filePath">/Users/david/Documents/MCPHomeAutomation/prompts/device_configurations.md