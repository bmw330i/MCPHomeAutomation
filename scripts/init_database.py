#!/usr/bin/env python3
"""
Home Automation Database Initialization Script
Creates SQLite database with JSON support for storing device and automation data
"""

import sqlite3
import os
import json
from pathlib import Path

def init_database(db_path):
    """Initialize the SQLite database with required tables"""

    # Ensure data directory exists
    db_dir = os.path.dirname(db_path)
    os.makedirs(db_dir, exist_ok=True)

    # Connect to database
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")  # Better concurrency

    # Create devices table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT UNIQUE NOT NULL,
            device_type TEXT NOT NULL,
            ip_address TEXT,
            hostname TEXT,
            mac_address TEXT,
            device_data JSON,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create events table for logging
    conn.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            device_id TEXT,
            event_data JSON,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create configuration table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS configuration (
            key TEXT PRIMARY KEY,
            value JSON,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Insert some default configuration
    default_config = {
        "network": {
            "subnet": "192.168.1.0/24",
            "gateway": "192.168.1.1",
            "dns_servers": ["8.8.8.8", "1.1.1.1"]
        },
        "automation": {
            "enabled": True,
            "log_level": "info",
            "backup_interval_hours": 24
        }
    }

    conn.execute("""
        INSERT OR IGNORE INTO configuration (key, value)
        VALUES (?, ?)
    """, ("system_config", json.dumps(default_config)))

    # Insert sample device data
    sample_devices = [
        {
            "device_id": "openwrt_router",
            "device_type": "router",
            "ip_address": "192.168.1.1",
            "hostname": "openwrt",
            "device_data": {
                "model": "OpenWRT One",
                "firmware_version": "23.05.0",
                "wifi_enabled": True,
                "lan_ports": 3,
                "wan_ports": 1
            }
        },
        {
            "device_id": "macpro_server",
            "device_type": "server",
            "ip_address": "192.168.1.214",
            "hostname": "macpro",
            "device_data": {
                "os": "Debian Linux",
                "services": ["jellyfin", "mongodb", "deduplication"],
                "storage_tb": 11
            }
        }
    ]

    for device in sample_devices:
        conn.execute("""
            INSERT OR IGNORE INTO devices
            (device_id, device_type, ip_address, hostname, device_data)
            VALUES (?, ?, ?, ?, ?)
        """, (
            device["device_id"],
            device["device_type"],
            device["ip_address"],
            device["hostname"],
            json.dumps(device["device_data"])
        ))

    conn.commit()
    conn.close()

    print(f"✅ Database initialized successfully at: {db_path}")
    print("📊 Created tables: devices, events, configuration")
    print("📝 Inserted sample data and default configuration")

def main():
    # Get database path from environment or use default
    db_path = os.getenv('SQLITE_DB_PATH', 'data/home_automation.db')

    # Convert to absolute path if relative
    if not os.path.isabs(db_path):
        db_path = os.path.join(os.getcwd(), db_path)

    try:
        init_database(db_path)
        print(f"\n🔍 Database file location: {db_path}")
        print("💡 You can explore the data with: sqlite3 data/home_automation.db")
        print("   Example queries:")
        print("   - SELECT * FROM devices;")
        print("   - SELECT key, value FROM configuration;")
        print("   - SELECT * FROM events ORDER BY timestamp DESC LIMIT 10;")

    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        return 1

    return 0

if __name__ == "__main__":
    exit(main())