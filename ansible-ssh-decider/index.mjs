#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Decision logic: what Ansible is best for vs SSH
const ANSIBLE_KEYWORDS = [
  "install", "configure", "remove", "kill", "modify", "change", "update",
  "create", "delete", "set", "enable", "disable", "restart", "stop", "start",
  "upgrade", "downgrade", "add", "append", "replace", "backup", "restore",
  "mount", "unmount", "format", "partition", "service", "systemctl", "apt",
  "yum", "dnf", "pacman", "brew", "pip", "npm", "gem"
];

const SSH_KEYWORDS = [
  "status", "show", "list", "get", "check", "monitor", "ps", "top", "df",
  "free", "uptime", "who", "w", "tail", "head", "grep", "find", "ls",
  "cat", "echo", "date", "hostname", "ifconfig", "ip", "netstat", "ss"
];

function shouldUseAnsible(description, command) {
  const text = (description + " " + command).toLowerCase();

  // Count matches for each category
  const ansibleMatches = ANSIBLE_KEYWORDS.filter(keyword => text.includes(keyword)).length;
  const sshMatches = SSH_KEYWORDS.filter(keyword => text.includes(keyword)).length;

  // If more Ansible keywords, use Ansible
  if (ansibleMatches > sshMatches) return true;

  // If equal or SSH has more, use SSH
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
            description: "Execute a command on a remote host, automatically choosing between Ansible (for configuration changes) and SSH (for status/output commands) based on the operation type.",
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