#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: join(__dirname, '..', '.env') });

// Configuration with environment variables and defaults
const CONFIG = {
  ANSIBLE_BASE_PATH: process.env.ANSIBLE_BASE_PATH || dirname(__dirname),
  INVENTORY_PATH: process.env.ANSIBLE_INVENTORY_PATH || join(dirname(__dirname), 'inventory.ini'),
  PLAYBOOKS_PATH: process.env.ANSIBLE_PLAYBOOKS_PATH || join(dirname(__dirname), 'playbooks'),
  SSH_KEY_PATH: process.env.ANSIBLE_SSH_KEY_PATH || '~/.ssh/id_rsa',
  HOST_KEY_CHECKING: process.env.ANSIBLE_HOST_KEY_CHECKING || 'False',
  COMMAND_TIMEOUT: parseInt(process.env.COMMAND_TIMEOUT) || 30000,
  MAX_CONCURRENT_COMMANDS: parseInt(process.env.MAX_CONCURRENT_COMMANDS) || 3,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  SERVER_NAME: process.env.MCP_SERVER_NAME || 'ansible-mcp-server',
  SERVER_VERSION: process.env.MCP_SERVER_VERSION || '1.0.0'
};

// Input validation and sanitization
const ALLOWED_PLAYBOOK_PATTERN = /^[a-zA-Z0-9_\-\.]+\.ya?ml$/;
const ALLOWED_HOST_PATTERN = /^[a-zA-Z0-9_\-\.]+$/;
const ALLOWED_TAG_PATTERN = /^[a-zA-Z0-9_\-,]+$/;

class AnsibleMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: CONFIG.SERVER_NAME,
        version: CONFIG.SERVER_VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    // Track concurrent commands for rate limiting
    this.activeCommands = new Set();

    this.setupToolHandlers();
    this.setupErrorHandling();
    this.validateConfiguration();
  }

  validateConfiguration() {
    const requiredPaths = [CONFIG.ANSIBLE_BASE_PATH, CONFIG.PLAYBOOKS_PATH];
    for (const path of requiredPaths) {
      if (!path || typeof path !== 'string') {
        throw new Error(`Invalid configuration: missing or invalid path ${path}`);
      }
    }
    
    if (CONFIG.LOG_LEVEL === 'debug') {
      console.error('[CONFIG] Loaded configuration:', {
        ...CONFIG,
        SSH_KEY_PATH: '[REDACTED]'
      });
    }
  }

  sanitizeInput(input, pattern, fieldName) {
    if (typeof input !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, `${fieldName} must be a string`);
    }
    
    if (!pattern.test(input)) {
      throw new McpError(ErrorCode.InvalidParams, `${fieldName} contains invalid characters`);
    }
    
    return input.trim();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_ansible_hosts',
          description: 'List all hosts in the Ansible inventory with their details',
          inputSchema: {
            type: 'object',
            properties: {
              group: {
                type: 'string',
                description: 'Filter hosts by group (openwrt, macpro, mini, rpi5, linode, lilygo)',
              },
            },
            additionalProperties: false,
          },
        },
        {
          name: 'run_playbook',
          description: 'Execute an Ansible playbook',
          inputSchema: {
            type: 'object',
            properties: {
              playbook: {
                type: 'string',
                description: 'Path to the playbook file (relative to playbooks directory)',
              },
              hosts: {
                type: 'string',
                description: 'Target hosts or groups',
              },
              extra_vars: {
                type: 'object',
                description: 'Extra variables to pass to the playbook',
              },
              tags: {
                type: 'string',
                description: 'Run only tasks tagged with these values',
              },
              check_mode: {
                type: 'boolean',
                description: 'Run in check mode (dry run)',
                default: false,
              },
            },
            required: ['playbook'],
            additionalProperties: false,
          },
        },
        {
          name: 'run_ansible_command',
          description: 'Execute an ad-hoc Ansible command',
          inputSchema: {
            type: 'object',
            properties: {
              hosts: {
                type: 'string',
                description: 'Target hosts or groups',
              },
              module: {
                type: 'string',
                description: 'Ansible module to use (e.g., command, shell, setup)',
                default: 'command',
              },
              args: {
                type: 'string',
                description: 'Arguments for the module',
              },
              become: {
                type: 'boolean',
                description: 'Use privilege escalation',
                default: false,
              },
            },
            required: ['hosts', 'args'],
            additionalProperties: false,
          },
        },
        {
          name: 'configure_openwrt_device',
          description: 'Configure OpenWrt devices using the banana pi playbook',
          inputSchema: {
            type: 'object',
            properties: {
              host: {
                type: 'string',
                description: 'Target OpenWrt host',
                default: 'openwrt',
              },
              ssid: {
                type: 'string',
                description: 'WiFi SSID to configure',
              },
              wifi_password: {
                type: 'string',
                description: 'WiFi password',
              },
              lan_ip: {
                type: 'string',
                description: 'LAN IP address',
                default: '192.168.1.1',
              },
            },
            additionalProperties: false,
          },
        },
        {
          name: 'check_device_status',
          description: 'Check the status of network devices',
          inputSchema: {
            type: 'object',
            properties: {
              hosts: {
                type: 'string',
                description: 'Target hosts or groups to check',
                default: 'all',
              },
            },
            additionalProperties: false,
          },
        },
        {
          name: 'backup_device_config',
          description: 'Backup device configurations',
          inputSchema: {
            type: 'object',
            properties: {
              host: {
                type: 'string',
                description: 'Target host to backup',
              },
              backup_type: {
                type: 'string',
                enum: ['openwrt', 'system'],
                description: 'Type of backup to perform',
                default: 'system',
              },
            },
            required: ['host'],
            additionalProperties: false,
          },
        },
        {
          name: 'deploy_adblock',
          description: 'Deploy adblock configuration to OpenWrt devices',
          inputSchema: {
            type: 'object',
            properties: {
              host: {
                type: 'string',
                description: 'Target OpenWrt host',
                default: 'openwrt',
              },
            },
            additionalProperties: false,
          },
        },
        {
          name: 'list_lilygo_devices',
          description: 'List connected LilyGo T-Display S3 and other ESP32 devices',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: 'flash_lilygo_firmware',
          description: 'Flash firmware to LilyGo T-Display S3 device',
          inputSchema: {
            type: 'object',
            properties: {
              device_path: {
                type: 'string',
                description: 'Serial device path (e.g., /dev/cu.usbmodem21101)',
              },
              firmware_path: {
                type: 'string',
                description: 'Path to firmware file (.bin)',
              },
              baud_rate: {
                type: 'number',
                description: 'Flash baud rate',
                default: 921600,
              },
              erase_flash: {
                type: 'boolean',
                description: 'Erase flash before flashing',
                default: true,
              },
            },
            required: ['firmware_path'],
            additionalProperties: false,
          },
        },
        {
          name: 'monitor_lilygo_serial',
          description: 'Monitor serial output from LilyGo T-Display S3 device',
          inputSchema: {
            type: 'object',
            properties: {
              device_path: {
                type: 'string',
                description: 'Serial device path (e.g., /dev/cu.usbmodem21101)',
              },
              baud_rate: {
                type: 'number',
                description: 'Serial baud rate',
                default: 115200,
              },
              duration: {
                type: 'number',
                description: 'Monitoring duration in seconds',
                default: 10,
              },
            },
            additionalProperties: false,
          },
        },
        {
          name: 'send_lilygo_command',
          description: 'Send command to LilyGo T-Display S3 device via serial',
          inputSchema: {
            type: 'object',
            properties: {
              device_path: {
                type: 'string',
                description: 'Serial device path (e.g., /dev/cu.usbmodem21101)',
              },
              command: {
                type: 'string',
                description: 'Command to send to device',
              },
              baud_rate: {
                type: 'number',
                description: 'Serial baud rate',
                default: 115200,
              },
              wait_response: {
                type: 'number',
                description: 'Wait time for response in seconds',
                default: 2,
              },
            },
            required: ['command'],
            additionalProperties: false,
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_ansible_hosts':
            return await this.listAnsibleHosts(args);
          case 'run_playbook':
            return await this.runPlaybook(args);
          case 'run_ansible_command':
            return await this.runAnsibleCommand(args);
          case 'configure_openwrt_device':
            return await this.configureOpenWrtDevice(args);
          case 'check_device_status':
            return await this.checkDeviceStatus(args);
          case 'backup_device_config':
            return await this.backupDeviceConfig(args);
          case 'deploy_adblock':
            return await this.deployAdblock(args);
          case 'list_lilygo_devices':
            return await this.listLilygoDevices(args);
          case 'flash_lilygo_firmware':
            return await this.flashLilygoFirmware(args);
          case 'monitor_lilygo_serial':
            return await this.monitorLilygoSerial(args);
          case 'send_lilygo_command':
            return await this.sendLilygoCommand(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async runCommand(command, args = [], options = {}) {
    // Rate limiting
    if (this.activeCommands.size >= CONFIG.MAX_CONCURRENT_COMMANDS) {
      throw new McpError(ErrorCode.InternalError, 'Too many concurrent commands');
    }

    const commandId = Math.random().toString(36);
    this.activeCommands.add(commandId);

    try {
      return await new Promise((resolve, reject) => {
        // Command validation
        const allowedCommands = ['ansible', 'ansible-playbook'];
        if (!allowedCommands.includes(command)) {
          reject(new Error(`Command not allowed: ${command}`));
          return;
        }

        // Sanitize arguments
        const sanitizedArgs = args.map(arg => {
          if (typeof arg !== 'string') {
            throw new Error('All arguments must be strings');
          }
          return arg;
        });

        if (CONFIG.LOG_LEVEL === 'debug') {
          console.error(`[CMD] Running: ${command} ${sanitizedArgs.join(' ')}`);
        }

        const child = spawn(command, sanitizedArgs, {
          cwd: CONFIG.ANSIBLE_BASE_PATH,
          env: { 
            ...process.env, 
            ANSIBLE_HOST_KEY_CHECKING: CONFIG.HOST_KEY_CHECKING,
            ANSIBLE_SSH_ARGS: `-o ConnectTimeout=10 -o ServerAliveInterval=60`
          },
          timeout: CONFIG.COMMAND_TIMEOUT,
          ...options,
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          resolve({
            code,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            success: code === 0,
          });
        });

        child.on('error', (error) => {
          reject(new Error(`Command failed to start: ${error.message}`));
        });

        // Timeout handler
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGTERM');
            reject(new Error(`Command timeout after ${CONFIG.COMMAND_TIMEOUT}ms`));
          }
        }, CONFIG.COMMAND_TIMEOUT);
      });
    } finally {
      this.activeCommands.delete(commandId);
    }
  }

  async listAnsibleHosts(args) {
    try {
      const inventoryContent = await fs.readFile(CONFIG.INVENTORY_PATH, 'utf-8');
      const hosts = this.parseInventory(inventoryContent);
      
      if (args.group) {
        const filteredHosts = hosts.filter(host => host.groups.includes(args.group));
        return {
          content: [
            {
              type: 'text',
              text: `Hosts in group '${args.group}':\n\n` + 
                    filteredHosts.map(host => 
                      `• ${host.name} (${host.ansible_host})\n  Groups: ${host.groups.join(', ')}\n  User: ${host.ansible_user || 'default'}`
                    ).join('\n\n'),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: 'Ansible Inventory Hosts:\n\n' + 
                  hosts.map(host => 
                    `• ${host.name} (${host.ansible_host})\n  Groups: ${host.groups.join(', ')}\n  User: ${host.ansible_user || 'default'}`
                  ).join('\n\n'),
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read inventory: ${error.message}`
      );
    }
  }

  parseInventory(content) {
    const hosts = [];
    const lines = content.split('\n');
    let currentGroup = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
        currentGroup = trimmedLine.slice(1, -1);
      } else if (trimmedLine && !trimmedLine.startsWith('#') && currentGroup) {
        const parts = trimmedLine.split(' ');
        const hostEntry = parts[0];
        
        let hostName, ansibleHost;
        if (hostEntry.includes('ansible_host=')) {
          hostName = hostEntry;
          ansibleHost = hostEntry;
        } else {
          hostName = hostEntry;
          ansibleHost = hostEntry;
        }

        // Extract variables
        const vars = {};
        for (let i = 1; i < parts.length; i++) {
          const [key, value] = parts[i].split('=');
          if (key && value) {
            vars[key] = value;
          }
        }

        const existingHost = hosts.find(h => h.name === hostName);
        if (existingHost) {
          existingHost.groups.push(currentGroup);
        } else {
          hosts.push({
            name: hostName,
            ansible_host: vars.ansible_host || ansibleHost,
            ansible_user: vars.ansible_user,
            ansible_port: vars.ansible_ssh_port || '22',
            groups: [currentGroup],
            vars,
          });
        }
      }
    }

    return hosts;
  }

  async runPlaybook(args) {
    // Validate and sanitize playbook name
    const sanitizedPlaybook = this.sanitizeInput(args.playbook, ALLOWED_PLAYBOOK_PATTERN, 'playbook');
    const playbookPath = join(CONFIG.PLAYBOOKS_PATH, sanitizedPlaybook);
    
    // Prevent path traversal
    if (!playbookPath.startsWith(CONFIG.PLAYBOOKS_PATH)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid playbook path');
    }
    
    try {
      await fs.access(playbookPath);
    } catch {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Playbook not found: ${sanitizedPlaybook}`
      );
    }

    const ansibleArgs = ['-i', CONFIG.INVENTORY_PATH, playbookPath];
    
    if (args.hosts) {
      const sanitizedHosts = this.sanitizeInput(args.hosts, ALLOWED_HOST_PATTERN, 'hosts');
      ansibleArgs.push('-l', sanitizedHosts);
    }
    
    if (args.tags) {
      const sanitizedTags = this.sanitizeInput(args.tags, ALLOWED_TAG_PATTERN, 'tags');
      ansibleArgs.push('-t', sanitizedTags);
    }
    
    if (args.check_mode) {
      ansibleArgs.push('--check');
    }
    
    if (args.extra_vars) {
      ansibleArgs.push('--extra-vars', JSON.stringify(args.extra_vars));
    }

    const result = await this.runCommand('ansible-playbook', ansibleArgs);
    
    return {
      content: [
        {
          type: 'text',
          text: `Playbook execution ${result.success ? 'completed' : 'failed'}:\n\n` +
                `Command: ansible-playbook ${ansibleArgs.join(' ')}\n\n` +
                `Exit code: ${result.code}\n\n` +
                `Output:\n${result.stdout}\n\n` +
                (result.stderr ? `Errors:\n${result.stderr}` : ''),
        },
      ],
    };
  }

  async runAnsibleCommand(args) {
    // Validate and sanitize inputs
    const sanitizedHosts = this.sanitizeInput(args.hosts, ALLOWED_HOST_PATTERN, 'hosts');
    const sanitizedModule = this.sanitizeInput(args.module || 'command', /^[a-zA-Z0-9_\-\.]+$/, 'module');
    
    // Restrict dangerous modules
    const blockedModules = ['shell', 'raw', 'script'];
    if (blockedModules.includes(sanitizedModule)) {
      throw new McpError(ErrorCode.InvalidParams, `Module '${sanitizedModule}' is not allowed for security reasons`);
    }

    const ansibleArgs = ['-i', CONFIG.INVENTORY_PATH];
    
    if (args.become) {
      ansibleArgs.push('-b');
    }
    
    ansibleArgs.push(sanitizedHosts, '-m', sanitizedModule, '-a', args.args);

    const result = await this.runCommand('ansible', ansibleArgs);
    
    return {
      content: [
        {
          type: 'text',
          text: `Ansible command ${result.success ? 'completed' : 'failed'}:\n\n` +
                `Command: ansible ${ansibleArgs.join(' ')}\n\n` +
                `Exit code: ${result.code}\n\n` +
                `Output:\n${result.stdout}\n\n` +
                (result.stderr ? `Errors:\n${result.stderr}` : ''),
        },
      ],
    };
  }

  async configureOpenWrtDevice(args) {
    const extraVars = {};
    
    if (args.ssid) extraVars.wifi_ssid = args.ssid;
    if (args.wifi_password) extraVars.wifi_password = args.wifi_password;
    if (args.lan_ip) extraVars.lan_ip = args.lan_ip;

    return await this.runPlaybook({
      playbook: 'configure_banana_pi.yaml',
      hosts: args.host,
      extra_vars: extraVars,
    });
  }

  async checkDeviceStatus(args) {
    return await this.runAnsibleCommand({
      hosts: args.hosts,
      module: 'setup',
      args: 'filter=ansible_distribution*,ansible_uptime*,ansible_memtotal*',
    });
  }

  async backupDeviceConfig(args) {
    const module = args.backup_type === 'openwrt' ? 'command' : 'setup';
    const moduleArgs = args.backup_type === 'openwrt' 
      ? 'sysupgrade -b /tmp/backup-$(date +%Y%m%d-%H%M%S).tar.gz'
      : 'gather_subset=!all';

    return await this.runAnsibleCommand({
      hosts: args.host,
      module,
      args: moduleArgs,
      become: true,
    });
  }

  async deployAdblock(args) {
    return await this.runPlaybook({
      playbook: '../adblock.yaml',
      hosts: args.host,
    });
  }

  async listLilygoDevices(args) {
    try {
      // Check for USB serial devices that might be ESP32/LilyGo devices
      const result = await this.runCommand('ls', ['/dev/cu.usbmodem*', '/dev/tty.usbmodem*'], { ignoreErrors: true });
      
      let devices = [];
      if (result.success && result.stdout.trim()) {
        const devicePaths = result.stdout.trim().split('\n');
        for (const devicePath of devicePaths) {
          if (devicePath.includes('/dev/cu.usbmodem')) {
            devices.push({
              path: devicePath,
              type: 'USB Serial (likely ESP32/LilyGo)',
              status: 'connected'
            });
          }
        }
      }

      // Also check ioreg for USB device details
      const ioregResult = await this.runCommand('ioreg', ['-p', 'IOUSB', '-l'], { ignoreErrors: true });
      let deviceDetails = [];
      if (ioregResult.success) {
        const lines = ioregResult.stdout.split('\n');
        for (const line of lines) {
          if (line.includes('USB JTAG/serial debug unit') || line.includes('ESP32') || line.includes('LilyGo')) {
            deviceDetails.push(line.trim());
          }
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `LilyGo/ESP32 Device Detection Results:\n\n` +
                  `Found ${devices.length} potential devices:\n\n` +
                  devices.map(d => `• ${d.path} - ${d.type} (${d.status})`).join('\n') +
                  (deviceDetails.length > 0 ? '\n\nDevice Details:\n' + deviceDetails.join('\n') : '') +
                  '\n\nNote: /dev/cu.* devices are for outgoing connections, /dev/tty.* for incoming.',
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list devices: ${error.message}`
      );
    }
  }

  async flashLilygoFirmware(args) {
    // Default to the detected device if no path specified
    const devicePath = args.device_path || '/dev/cu.usbmodem21101';
    
    // Validate firmware file exists
    try {
      await fs.access(args.firmware_path);
    } catch {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Firmware file not found: ${args.firmware_path}`
      );
    }

    // Check if esptool.py is available
    const esptoolCheck = await this.runCommand('python', ['-m', 'esptool', 'version'], { ignoreErrors: true });
    if (!esptoolCheck.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: esptool not found. Please install it:\n\n` +
                  `pip install esptool\n\n` +
                  `Or via the Python environment tools.`,
          },
        ],
      };
    }

    // Build esptool command
    const esptoolArgs = [
      '-m', 'esptool',
      '--chip', 'esp32s3',
      '--port', devicePath,
      '--baud', args.baud_rate.toString()
    ];

    if (args.erase_flash) {
      esptoolArgs.push('erase_flash');
      
      // Run erase command first
      const eraseResult = await this.runCommand('/Users/david/Documents/Ansible/.venv/bin/python', esptoolArgs, { timeout: 30000 });
      if (!eraseResult.success) {
        throw new McpError(
          ErrorCode.InternalError,
          `Flash erase failed: ${eraseResult.stderr}`
        );
      }
    }

    // Flash firmware
    const flashArgs = [
      '-m', 'esptool',
      '--chip', 'esp32s3',
      '--port', devicePath,
      '--baud', args.baud_rate.toString(),
      'write_flash',
      '-z',
      '0x0', args.firmware_path
    ];

    const flashResult = await this.runCommand('python', flashArgs, { timeout: 60000 });
    
    return {
      content: [
        {
          type: 'text',
          text: `Firmware flashing ${flashResult.success ? 'completed successfully' : 'failed'}:\n\n` +
                `Device: ${devicePath}\n` +
                `Firmware: ${args.firmware_path}\n` +
                `Baud Rate: ${args.baud_rate}\n` +
                `Erase Flash: ${args.erase_flash}\n\n` +
                `Command: esptool.py ${flashArgs.join(' ')}\n\n` +
                `Exit code: ${flashResult.code}\n\n` +
                `Output:\n${flashResult.stdout}\n\n` +
                (flashResult.stderr ? `Errors:\n${flashResult.stderr}` : ''),
        },
      ],
    };
  }

  async monitorLilygoSerial(args) {
    const devicePath = args.device_path || '/dev/cu.usbmodem21101';
    const baudRate = args.baud_rate || 115200;
    const duration = args.duration || 10;

    // Check if screen command is available (built into macOS)
    const monitorResult = await this.runCommand('timeout', [
      duration.toString(),
      'screen',
      devicePath,
      baudRate.toString()
    ], { ignoreErrors: true, timeout: (duration + 2) * 1000 });

    return {
      content: [
        {
          type: 'text',
          text: `Serial Monitor Results (${duration}s):\n\n` +
                `Device: ${devicePath}\n` +
                `Baud Rate: ${baudRate}\n` +
                `Duration: ${duration} seconds\n\n` +
                `Output:\n${monitorResult.stdout || 'No output received'}\n\n` +
                (monitorResult.stderr && !monitorResult.stderr.includes('timeout') ? 
                 `Errors:\n${monitorResult.stderr}` : 
                 'Note: Use Ctrl+A then K to exit screen manually if needed'),
        },
      ],
    };
  }

  async sendLilygoCommand(args) {
    const devicePath = args.device_path || '/dev/cu.usbmodem21101';
    const baudRate = args.baud_rate || 115200;
    const waitTime = args.wait_response || 2;

    // Use echo to send command to device and capture response with timeout
    const command = `echo "${args.command}" > ${devicePath} && timeout ${waitTime} cat ${devicePath}`;
    
    const result = await this.runCommand('sh', ['-c', command], { 
      ignoreErrors: true, 
      timeout: (waitTime + 2) * 1000 
    });

    return {
      content: [
        {
          type: 'text',
          text: `Command sent to LilyGo device:\n\n` +
                `Device: ${devicePath}\n` +
                `Command: ${args.command}\n` +
                `Baud Rate: ${baudRate}\n` +
                `Wait Time: ${waitTime}s\n\n` +
                `Response:\n${result.stdout || 'No response received'}\n\n` +
                (result.stderr && !result.stderr.includes('timeout') ? 
                 `Errors:\n${result.stderr}` : 
                 'Note: Timeout is normal if device doesn\'t respond'),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Ansible MCP server running on stdio');
  }
}

const server = new AnsibleMCPServer();
server.run().catch(console.error);