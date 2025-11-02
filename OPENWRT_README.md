# OpenWRT Setup for MCP Home Automation

This guide provides high-level instructions for setting up OpenWRT on compatible hardware to enable MCP (Model Context Protocol) servers to manage your home network's WiFi, WAN, and LAN configurations.

## Overview

OpenWRT is a Linux-based operating system for embedded devices, particularly wireless routers. In this MCP Home Automation setup, OpenWRT devices serve as:

- **Network Gateway**: Routing traffic between WAN and LAN
- **WiFi Management**: Controlling SSID, password, and wireless settings
- **Firewall Control**: Managing network security rules
- **Ad-blocking**: DNS-based content filtering

The MCP Ansible server can remotely configure these devices using Ansible playbooks and ad-hoc commands.

## Hardware Requirements

### Recommended Hardware

#### OpenWRT One Router
- **CPU**: MediaTek MT7981B (Filogic 820)
- **RAM**: 512MB DDR4
- **Storage**: 256MB NAND Flash
- **WiFi**: Dual-band 802.11ax (WiFi 6)
- **Ethernet**: 1x WAN + 3x LAN (Gigabit)
- **USB**: 1x USB 3.0
- **Price**: ~$100-150 USD

**Why OpenWRT One?**
- Excellent WiFi 6 performance
- Official OpenWRT support
- Good community support
- Compact form factor

#### Alternative Options
- **TP-Link Archer C7/AC1750**: Budget-friendly, widely supported
- **Netgear Nighthawk X4S**: Higher performance for larger networks
- **Linksys WRT3200ACM**: OpenWRT flagship support

### Hardware Compatibility Check
Always verify your device is supported before purchasing:
- Check the [OpenWRT Hardware Database](https://openwrt.org/toh/start)
- Look for "Supported Current Rel." status
- Ensure adequate RAM (256MB minimum, 512MB+ recommended)

## Installation Steps

### 1. Download OpenWRT Firmware
```bash
# Visit the OpenWRT firmware selector
# https://firmware-selector.openwrt.org/
# Select your device and download the sysupgrade image
```

### 2. Flash the Firmware
1. **Backup current firmware** (if possible)
2. **Access router web interface** at `192.168.1.1`
3. **Upload OpenWRT firmware** via System → Backup/Flash Firmware
4. **Wait for reboot** (may take 2-3 minutes)

### 3. Initial Configuration
1. **Connect to OpenWRT** at `192.168.1.1` (default)
2. **Set root password** for SSH access
3. **Configure WAN interface** for internet access
4. **Update packages**: `opkg update && opkg upgrade`

### 4. Enable SSH Access for MCP
```bash
# Edit /etc/config/dropbear (SSH server config)
# Ensure SSH is enabled on port 22 (or your preferred port)
# Configure SSH keys for passwordless authentication
```

## MCP Integration

### Ansible Inventory Configuration
Add your OpenWRT device to the Ansible inventory:

```ini
[openwrt]
YOUR_ROUTER_IP ansible_user=root ansible_ssh_private_key_file=~/.ssh/id_rsa
```

### Environment Variables
Set these in your MCP server environment:

```bash
ANSIBLE_HOST_KEY_CHECKING=False
ANSIBLE_INVENTORY=/path/to/your/inventory.ini
```

### Available MCP Tools for OpenWRT

#### WiFi Configuration
- **configure_openwrt_device**: Set SSID, WiFi password, and LAN IP
- **run_playbook**: Execute custom OpenWRT playbooks
- **run_ansible_command**: Ad-hoc commands for WiFi management

#### Network Management
- **check_device_status**: Monitor device connectivity
- **backup_device_config**: Save current configurations
- **deploy_adblock**: Install ad-blocking services

## Security Considerations

### SSH Hardening
- Use SSH key authentication (disable passwords)
- Change default SSH port (22 → 2222)
- Restrict SSH access to specific IP ranges

### Firewall Rules
- Enable OpenWRT firewall
- Configure port forwarding carefully
- Use VPN for remote management

### Firmware Updates
- Regularly check for OpenWRT security updates
- Test updates on a backup device first
- Keep firmware backups

## Troubleshooting

### Common Issues

#### Can't Connect via SSH
- Verify IP address and SSH port
- Check SSH key permissions (`chmod 600 ~/.ssh/id_rsa`)
- Ensure SSH service is running: `service dropbear status`

#### WiFi Not Working
- Check wireless configuration: `uci show wireless`
- Verify radio status: `iwinfo`
- Restart wireless: `/etc/init.d/network restart`

#### No Internet Access
- Check WAN interface: `ifstatus wan`
- Verify DNS settings: `cat /etc/resolv.conf`
- Test connectivity: `ping 8.8.8.8`

### Logs and Debugging
```bash
# System logs
logread

# Network logs
logread | grep network

# SSH logs
logread | grep dropbear
```

## Resources and Links

### Official OpenWRT Documentation
- **Main Site**: https://openwrt.org/
- **Documentation**: https://openwrt.org/docs/start
- **User Guide**: https://openwrt.org/docs/guide-user/start
- **Hardware Database**: https://openwrt.org/toh/start

### OpenWRT One Specific
- **Product Page**: https://openwrt.org/toh/openwrt_one
- **Forum Discussion**: Search OpenWRT forums for "OpenWRT One"
- **Firmware Downloads**: https://downloads.openwrt.org/

### Community Resources
- **OpenWRT Forum**: https://forum.openwrt.org/
- **GitHub Repositories**: https://github.com/openwrt
- **Package Repository**: https://openwrt.org/packages/

### Hardware Purchasing
- **Amazon**: Search for "OpenWRT One Router"
- **Official Distributors**: Check OpenWRT wiki for regional distributors
- **Used Equipment**: eBay/Craigslist (verify compatibility)

## Next Steps

1. **Purchase compatible hardware** from the list above
2. **Install OpenWRT firmware** using the steps above
3. **Configure SSH access** for MCP management
4. **Add to Ansible inventory** with your device details
5. **Test MCP connectivity** using the check_device_status tool

For detailed MCP server setup and Ansible playbook examples, refer to the main project README and the ansible-mcp-server documentation.</content>
<parameter name="filePath">/Users/david/Documents/MCPHomeAutomation/OPENWRT_README.md