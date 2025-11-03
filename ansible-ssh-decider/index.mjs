#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Decision logic: what Ansible is best for vs SSH
const SUDO_INDICATORS = [
  "sudo", "su ", "su -", "become", "--become", "-b", "privileges", "root",
  "chmod 777", "chmod +x", "chown", "usermod", "groupmod", "passwd",
  "systemctl", "service ", "init.d", "/etc/", "mount", "umount", "fdisk",
  "mkfs", "format", "partition"
];

const CONFIG_CHANGE_KEYWORDS = [
  "install", "remove", "purge", "upgrade", "update", "configure", "setup",
  "create", "delete", "modify", "change", "set", "enable", "disable",
  "start", "stop", "restart", "reload", "kill", "add", "append", "replace",
  "backup", "restore", "mount", "unmount", "format", "mkfs", "fdisk",
  "apt", "yum", "dnf", "pacman", "brew", "pip", "npm", "gem", "cargo",
  "wget", "curl.*-O", "git clone", "mkdir", "touch", "echo.*>", "cp ", "mv ",
  "ln ", "tar ", "unzip", "gunzip", "gzip"
];

const STATUS_QUERY_KEYWORDS = [
  "status", "show", "list", "get", "check", "monitor", "ps", "top", "df",
  "free", "uptime", "who", "w", "tail", "head", "grep", "find", "ls",
  "cat", "echo", "date", "hostname", "ifconfig", "ip", "netstat", "ss",
  "du", "pwd", "id", "whoami", "env", "printenv", "history"
];

const IDEMPOTENT_OPERATIONS = [
  "apt", "yum", "dnf", "pacman", "brew", "pip", "npm", "gem",
  "systemctl", "service", "chkconfig", "update-rc.d",
  "useradd", "usermod", "groupadd", "groupmod",
  "mkdir", "touch", "chown", "chmod", "ln -s"
];

function shouldUseAnsible(description, command) {
  const text = (description + " " + command).toLowerCase();
  const cmd = command.toLowerCase();

  // RULE 1: Commands that write to files or modify system state → Ansible (check first!)
  if (cmd.includes(">") || cmd.includes(">>") || cmd.includes("| tee") ||
      (cmd.includes("echo") && (cmd.includes(">") || cmd.includes(">>")))) {
    console.error("Using Ansible: detected file write operation");
    return true;
  }

  // RULE 2: If command explicitly uses sudo or requires elevated privileges → Ansible
  for (const indicator of SUDO_INDICATORS) {
    if (cmd.includes(indicator)) {
      console.error(`Using Ansible: detected sudo/privilege indicator "${indicator}"`);
      return true;
    }
  }

  // RULE 3: Network operations that might need sudo → Ansible
  if (cmd.includes("iptables") || cmd.includes("ufw") || cmd.includes("firewall") ||
      cmd.includes("route") || cmd.includes("ifconfig") || cmd.includes("ip addr")) {
    console.error("Using Ansible: detected network configuration");
    return true;
  }

  // RULE 4: If it's an idempotent package/service management operation → Ansible
  for (const operation of IDEMPOTENT_OPERATIONS) {
    if (cmd.includes(operation)) {
      console.error(`Using Ansible: detected idempotent operation "${operation}"`);
      return true;
    }
  }

  // RULE 5: If it's a configuration change or system modification → Ansible
  for (const keyword of CONFIG_CHANGE_KEYWORDS) {
    if (text.includes(keyword)) {
      console.error(`Using Ansible: detected config change keyword "${keyword}"`);
      return true;
    }
  }

  // RULE 6: If it's clearly a status query or information gathering → SSH
  for (const keyword of STATUS_QUERY_KEYWORDS) {
    if (text.includes(keyword)) {
      console.error(`Using SSH: detected status query keyword "${keyword}"`);
      return false;
    }
  }

  // RULE 7: Default to SSH for simple commands that just return output
  console.error("Using SSH: default for simple output commands");
  return false;
}

function executeWithAnsible(host, command) {
  try {
    const inventoryPath = path.join(__dirname, "..", "inventory.ini");
    const ansibleCmd = `ansible -i ${inventoryPath} -m command -a "${command.replace(/"/g, '\\"')}" ${host}`;
    console.error(`Executing with Ansible: ${ansibleCmd}`);
    const result = execSync(ansibleCmd, { encoding: "utf8", stdio: "pipe" });
    return result;
  } catch (error) {
    throw new Error(`Ansible execution failed: ${error.message}`);
  }
}

function executeWithSSH(host, command) {
  try {
    const sshToolsPath = path.join(__dirname, "..", "ssh-tools.sh");
    const sshCmd = `${sshToolsPath} exec ${host} "${command.replace(/"/g, '\\"')}"`;
    console.error(`Executing with SSH: ${sshCmd}`);
    const result = execSync(sshCmd, { encoding: "utf8", stdio: "pipe" });
    return result;
  } catch (error) {
    throw new Error(`SSH execution failed: ${error.message}`);
  }
}

class AnsibleSSHDeciderServer {
  constructor() {
    this.server = new Server(
      {
        name: "ansible-ssh-decider",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "execute_command",
            description: "Execute a command on a remote host using intelligent routing: Ansible for privileged operations, configuration changes, and idempotent tasks; SSH for status queries and simple output commands.",
            inputSchema: {
              type: "object",
              properties: {
                host: {
                  type: "string",
                  description: "Target host (e.g., macpro, rpi5, mini, linode)"
                },
                command: {
                  type: "string",
                  description: "The command to execute"
                },
                description: {
                  type: "string",
                  description: "Description of what the command does (used to decide between Ansible/SSH)"
                }
              },
              required: ["host", "command", "description"]
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === "execute_command") {
        const { host, command, description } = args;

        const useAnsible = shouldUseAnsible(description, command);
        console.error(`Decision for "${description}": ${useAnsible ? "Ansible" : "SSH"}`);

        let result;
        try {
          if (useAnsible) {
            result = executeWithAnsible(host, command);
          } else {
            result = executeWithSSH(host, command);
          }

          return {
            content: [
              {
                type: "text",
                text: result
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error.message}`
              }
            ],
            isError: true
          };
        }
      }

      throw new Error(`Unknown tool: ${name}`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Ansible-SSH Decider MCP server running...");
  }
}

const server = new AnsibleSSHDeciderServer();
server.run().catch(console.error);