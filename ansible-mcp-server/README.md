# Ansible MCP Server

A **secure** Model Context Protocol (MCP) server for managing home network devices and services using Ansible. This server provides tools to execute Ansible playbooks, run ad-hoc commands, and manage network infrastructure including OpenWrt routers, Raspberry Pi devices, and other networked systems.

## 🔒 Security Features

- **Environment-based Configuration**: No hardcoded credentials or IP addresses
- **Input Validation & Sanitization**: Prevents command injection and path traversal
- **Rate Limiting**: Protects against command flooding
- **Module Restrictions**: Blocks dangerous Ansible modules
- **Audit Logging**: Comprehensive logging for security monitoring
- **Vault Integration**: Support for Ansible Vault encrypted secrets

## Features

- **Inventory Management**: List and filter hosts from your Ansible inventory
- **Playbook Execution**: Run Ansible playbooks with custom variables and options
- **Ad-hoc Commands**: Execute Ansible modules directly on target hosts (with security restrictions)
- **Device Configuration**: Specialized tools for OpenWrt and Raspberry Pi setup
- **Status Monitoring**: Check device status and system information
- **Configuration Backup**: Backup device configurations
- **Service Deployment**: Deploy services like adblock to network devices

## 🚀 Quick Setup

1. **Prerequisites**:
   - Node.js 18+ 
   - Ansible installed and configured
   - SSH access to your network devices

2. **Environment Setup**:
   ```bash
   cd ansible-mcp-server
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run setup
   ```

3. **Security Setup** (Recommended):
   ```bash
   # Create Ansible vault for sudo passwords
   ansible-vault create group_vars/all/vault.yml
   
   # Set restrictive permissions
   chmod 600 .env
   chmod 600 ~/.ssh/id_rsa
   ```

4. **Configure your MCP client** to use this server by adding the configuration from `mcp.json` to your client's settings.

## Configuration

The server expects your Ansible setup to be in the parent directory with the following structure:
```
../
├── inventory.ini          # Ansible inventory file
├── playbooks/            # Directory containing playbooks
│   ├── configure_banana_pi.yaml
│   ├── configpi.yaml
│   ├── mount_apfs_drives.yml
│   └── ...
├── files/                # Files for deployment
│   ├── mount_apfs_drives.sh
│   └── apfs-mount.service
└── ansible-mcp-server/   # This MCP server
    ├── index.mjs
    ├── package.json
    └── ...
```

### APFS Drive Configuration (MacPro Server)

The MacPro server (192.168.1.214) has two large 10.9TB APFS drives that can be mounted:

**Mount Status:**
- **`/dev/sda2`** → **`/mnt/apfs1`** (11TB capacity)
- **`/dev/sdb1`** → **`/mnt/apfs2`** (11TB capacity)

**Current Drive Usage:**
- **APFS Drive 1**: 5.3TB used / 5.7TB available (49% full)
- **APFS Drive 2**: 1.9TB used / 9.1TB available (18% full)

**Mounting Commands:**
```bash
# Check current mount status
ansible -i inventory.ini macpro -m shell -a "df -h /mnt/apfs1 /mnt/apfs2"

# Mount APFS drives (requires apfs-fuse)
ansible -i inventory.ini macpro -m shell -a "apfs-fuse -o uid=1000,gid=1000,allow_other /dev/sda2 /mnt/apfs1" --become
ansible -i inventory.ini macpro -m shell -a "apfs-fuse -o uid=1000,gid=1000,allow_other /dev/sdb1 /mnt/apfs2" --become

# Verify mounts
ansible -i inventory.ini macpro -m shell -a "ls -la /mnt/apfs1/ /mnt/apfs2/"
```

**Dependencies:**
- `apfs-fuse` package must be installed on MacPro server
- Requires `ansible_become_pass` for sudo access
- Uses `--become` flag instead of `sudo` in shell commands

## Available Tools

### `list_ansible_hosts`
List all hosts in the Ansible inventory with their connection details and group memberships.

**Parameters:**
- `group` (optional): Filter hosts by group name (openwrt, macpro, rpi5, linode)

### `run_playbook`
Execute an Ansible playbook against specified hosts.

**Parameters:**
- `playbook` (required): Path to playbook file relative to playbooks directory
- `hosts` (optional): Target hosts or groups 
- `extra_vars` (optional): Object containing extra variables
- `tags` (optional): Run only tasks with specified tags
- `check_mode` (optional): Run in dry-run mode

**Example:**
```json
{
  "playbook": "configure_banana_pi.yaml",
  "hosts": "openwrt",
  "extra_vars": {
    "wifi_ssid": "MyNetwork",
    "wifi_password": "MyPassword"
  },
  "check_mode": true
}
```

### `run_ansible_command`
Execute ad-hoc Ansible commands using any module.

**Parameters:**
- `hosts` (required): Target hosts or groups
- `module` (optional): Ansible module name (default: command)
- `args` (required): Arguments for the module
- `become` (optional): Use privilege escalation

**Example:**
```json
{
  "hosts": "all",
  "module": "setup",
  "args": "filter=ansible_distribution*"
}
```

### `configure_openwrt_device`
Specialized tool for configuring OpenWrt devices using the banana pi playbook.

**Parameters:**
- `host` (optional): Target OpenWrt host (default: openwrt)
- `ssid` (optional): WiFi SSID to configure
- `wifi_password` (optional): WiFi password
- `lan_ip` (optional): LAN IP address (default: 192.168.1.1)

### `check_device_status`
Check system status and information for network devices.

**Parameters:**
- `hosts` (optional): Target hosts or groups (default: all)

### `backup_device_config`
Backup device configurations.

**Parameters:**
- `host` (required): Target host to backup
- `backup_type` (optional): Type of backup - 'openwrt' or 'system' (default: system)

### `deploy_adblock`
Deploy adblock configuration to OpenWrt devices.

**Parameters:**
- `host` (optional): Target OpenWrt host (default: openwrt)

## Usage Examples

### List all network devices
```
Use the list_ansible_hosts tool to see all devices in your network.
```

### Configure a new OpenWrt router
```
Use configure_openwrt_device with:
- ssid: "YourNetworkName"
- wifi_password: "YourWiFiPassword"
- lan_ip: "192.168.1.1"
```

### Check if all devices are online
```
Use check_device_status with hosts: "all"
```

### Check APFS drive status on MacPro
```
Use run_ansible_command with:
- hosts: "macpro"
- module: "shell"
- args: "df -h /mnt/apfs1 /mnt/apfs2"
```

### Mount APFS drives on MacPro
```
Use run_ansible_command with:
- hosts: "macpro"
- module: "shell"
- args: "apfs-fuse -o uid=1000,gid=1000,allow_other /dev/sda2 /mnt/apfs1"
- become: true
```

### Run a specific playbook
```
Use run_playbook with:
- playbook: "configpi.yaml"
- hosts: "rpi5"
- tags: "install,configure"
```

### Execute a command on all OpenWrt devices
```
Use run_ansible_command with:
- hosts: "openwrt"
- module: "command"
- args: "uci show system"
```

## Development

To run the server in development mode:
```bash
npm run dev
```

To start the server:
```bash
npm start
```

## Troubleshooting

### SSH Connection Issues
- Ensure SSH keys are properly configured in `~/.ssh/`
- Verify the `ansible_ssh_private_key_file` paths in your inventory
- Check that `ansible_ssh_port` matches your SSH configuration

### Playbook Not Found
- Verify the playbook path is relative to the `playbooks/` directory
- Check that the playbook file exists and is readable

### Permission Denied
- Ensure the `ansible_user` has appropriate permissions
- Use `become: true` for operations requiring root access
- Verify `ansible_become_pass` is set if required

### APFS Drive Mounting Issues

**Problem**: Ansible commands hang when trying to mount APFS drives
**Solution**: Use `--become` flag instead of `sudo` in shell commands
```bash
# ✅ Correct approach
ansible -i inventory.ini macpro -m shell -a "apfs-fuse -o uid=1000,gid=1000,allow_other /dev/sda2 /mnt/apfs1" --become

# ❌ Incorrect approach (will hang)
ansible -i inventory.ini macpro -m shell -a "sudo apfs-fuse -o uid=1000,gid=1000,allow_other /dev/sda2 /mnt/apfs1"
```

**Problem**: APFS drives not showing as mounted after reboot
**Solution**: Check systemd services or run mounting playbook
```bash
# Check existing services
ansible -i inventory.ini macpro -m shell -a "systemctl status apfs1-mount.service apfs2-mount.service" --become

# Or run the mounting playbook
ansible-playbook -i inventory.ini playbooks/mount_apfs_drives.yml
```

**Problem**: `ansible_become_pass` not working
**Solution**: Ensure inventory.ini has the correct format without vault reference
```ini
[macpro]
192.168.1.214 ansible_user=david ansible_ssh_private_key_file=~/.ssh/id_rsa ansible_ssh_port=2220 ansible_become_pass=SomethingHarder
```

## 🔐 Security Best Practices

### **Environment Security**
```bash
# Set proper file permissions
chmod 600 .env                    # Environment variables
chmod 600 ~/.ssh/id_rsa          # SSH private key
chmod 644 .env.example           # Template (safe to commit)
```

### **Ansible Vault for Secrets**
```bash
# Create encrypted vault for sensitive data
ansible-vault create group_vars/all/vault.yml

# Add encrypted sudo password
vault_macpro_sudo_password: your_actual_password

# Reference in inventory template
ansible_become_pass: "{{ vault_macpro_sudo_password }}"
```

### **Network Security**
- **SSH Keys**: Use Ed25519 keys (`ssh-keygen -t ed25519`)
- **SSH Config**: Disable password auth, use key-only authentication
- **Network Access**: Limit SSH access to management VLAN/network
- **Firewall Rules**: Block unnecessary ports and services

### **Monitoring**
```bash
# Enable debug logging (includes command audit trail)
echo "LOG_LEVEL=debug" >> .env

# Monitor logs for security events
tail -f ansible.log | grep -E "(FAIL|ERROR|security)"
```

## 🚨 Security Warnings

- **Never commit `.env` files** - Contains sensitive configuration
- **Use Ansible Vault** for passwords and secrets
- **Review command logs** regularly for unauthorized access
- **Update dependencies** regularly for security patches
- **Limit MCP client access** to trusted applications only

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ANSIBLE_BASE_PATH` | Path to Ansible directory | `/Users/you/ansible` |
| `OPENWRT_HOST` | OpenWrt router IP | `192.168.1.1` |
| `MACPRO_BECOME_PASS_VAULT_ID` | Vault ID for sudo password | `macpro_sudo` |
| `LOG_LEVEL` | Logging level | `info` or `debug` |
| `COMMAND_TIMEOUT` | Command timeout (ms) | `30000` |

## License

MIT