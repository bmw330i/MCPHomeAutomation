#!/usr/bin/env python3
"""
MCP Home Automation Setup Verification Script
Tests that all components are properly configured and working.
"""

import sys
import sqlite3
from pathlib import Path

def check_virtual_env():
    """Check if running in virtual environment"""
    print("🔍 Checking Python virtual environment...")
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("✅ Running in virtual environment")
        return True
    else:
        print("❌ Not running in virtual environment")
        return False

def check_dependencies():
    """Check if required Python packages are installed"""
    print("\n🔍 Checking Python dependencies...")
    required_packages = ['requests', 'dotenv', 'sqlalchemy', 'pypdf']
    missing = []

    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package}")
            missing.append(package)

    return len(missing) == 0

def check_database():
    """Check if database is properly initialized"""
    print("\n🔍 Checking database setup...")
    db_path = Path("data/home_automation.db")

    if not db_path.exists():
        print("❌ Database file not found")
        return False

    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Check if tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        table_names = [table[0] for table in tables]

        required_tables = ['devices', 'events', 'configuration']
        missing_tables = [t for t in required_tables if t not in table_names]

        if missing_tables:
            print(f"❌ Missing tables: {missing_tables}")
            conn.close()
            return False

        print("✅ Database tables exist")
        conn.close()
        return True

    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return False

def check_env_file():
    """Check if .env file exists and has required variables"""
    print("\n🔍 Checking environment configuration...")
    env_path = Path(".env")

    if not env_path.exists():
        print("❌ .env file not found")
        return False

    required_vars = ['PYTHON_EXECUTABLE', 'PYTHONPATH']
    missing_vars = []

    with open(env_path, 'r', encoding='utf-8') as f:
        content = f.read()

    for var in required_vars:
        if var not in content:
            missing_vars.append(var)

    if missing_vars:
        print(f"❌ Missing environment variables: {missing_vars}")
        return False

    print("✅ Environment configuration found")
    return True

def check_node_servers():
    """Check if Node.js MCP servers can be found"""
    print("\n🔍 Checking MCP server files...")
    servers = [
        "ansible-mcp-server/index.mjs",
        "ansible-ssh-decider/index.mjs",
        "documents-mcp-server/index.mjs"
    ]

    missing = []
    for server in servers:
        if not Path(server).exists():
            missing.append(server)

    if missing:
        print(f"❌ Missing server files: {missing}")
        return False

    print("✅ All MCP server files found")
    return True

def main():
    """Run all verification checks"""
    print("🚀 MCP Home Automation Setup Verification")
    print("=" * 50)

    checks = [
        check_virtual_env,
        check_dependencies,
        check_database,
        check_env_file,
        check_node_servers
    ]

    passed = 0
    total = len(checks)

    for check in checks:
        if check():
            passed += 1

    print("\n" + "=" * 50)
    print(f"📊 Results: {passed}/{total} checks passed")

    if passed == total:
        print("🎉 Setup verification complete! Your MCP Home Automation system is ready.")
        print("\nNext steps:")
        print("1. Configure your .env file with your network settings")
        print("2. Start your MCP servers: node <server-name>/index.mjs")
        print("3. Connect your AI assistant to the MCP servers")
    else:
        print("⚠️  Some checks failed. Please review the output above and fix any issues.")
        sys.exit(1)

if __name__ == "__main__":
    main()