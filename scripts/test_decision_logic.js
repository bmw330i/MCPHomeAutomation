#!/usr/bin/env node

// Test script for ansible-ssh-decider decision logic
const SUDO_INDICATORS = [
  "sudo", "su ", "su -", "become", "privileges", "root",
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

// Test cases
console.log("🧪 Testing Ansible-SSH Decider Decision Logic");
console.log("=" .repeat(50));

const testCases = [
  // SSH cases (should return false)
  { desc: "Check running processes", cmd: "ps aux | grep python", expected: false },
  { desc: "Get disk usage", cmd: "df -h", expected: false },
  { desc: "List files", cmd: "ls -la", expected: false },
  { desc: "Check uptime", cmd: "uptime", expected: false },

  // Ansible cases (should return true)
  { desc: "Install vim package", cmd: "apt-get install vim", expected: true },
  { desc: "Restart nginx service", cmd: "sudo systemctl restart nginx", expected: true },
  { desc: "Create directory", cmd: "mkdir /tmp/test", expected: true },
  { desc: "Update system", cmd: "apt-get update", expected: true },
  { desc: "Change file permissions", cmd: "chmod 644 file.txt", expected: true },
  { desc: "Write to file", cmd: "echo 'test' > file.txt", expected: true },
];

let passed = 0;
let total = testCases.length;

for (const test of testCases) {
  const result = shouldUseAnsible(test.desc, test.cmd);
  const status = result === test.expected ? "✅ PASS" : "❌ FAIL";
  const expected = test.expected ? "Ansible" : "SSH";
  const actual = result ? "Ansible" : "SSH";

  console.log(`${status} "${test.desc}": ${test.cmd}`);
  console.log(`    Expected: ${expected}, Got: ${actual}`);

  if (result === test.expected) passed++;
  console.log("");
}

console.log("=" .repeat(50));
console.log(`📊 Results: ${passed}/${total} tests passed`);

if (passed === total) {
  console.log("🎉 All decision logic tests passed!");
} else {
  console.log("⚠️  Some tests failed. Review the decision logic.");
  process.exit(1);
}