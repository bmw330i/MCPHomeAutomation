# MCP Home Automation Database Setup

This directory contains database files and utilities for persisting home automation data.

## Recommended Database: SQLite with JSON Support

For your use case of storing JSON data locally in a lightweight manner, **SQLite with JSON1 extension** is the best choice:

### Why SQLite?
- ✅ **Zero configuration** - no server to run
- ✅ **File-based** - single .db file, easy backup
- ✅ **JSON support** - native JSON column types and operations
- ✅ **ACID compliant** - reliable data storage
- ✅ **Cross-platform** - works on all your devices
- ✅ **Python built-in** - no additional dependencies needed
- ✅ **Lightweight** - minimal resource usage

### Database Schema

```sql
-- Devices table for storing device information
CREATE TABLE devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT UNIQUE NOT NULL,
    device_type TEXT NOT NULL,
    ip_address TEXT,
    hostname TEXT,
    mac_address TEXT,
    device_data JSON,  -- Store arbitrary device-specific data
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table for logging automation events
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    device_id TEXT,
    event_data JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Configuration table for storing system settings
CREATE TABLE configuration (
    key TEXT PRIMARY KEY,
    value JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Usage Examples

#### Python with SQLite JSON support:
```python
import sqlite3
import json

# Connect to database
conn = sqlite3.connect('data/home_automation.db')
conn.execute("PRAGMA foreign_keys = ON")

# Store device data
device_data = {
    "name": "OpenWRT Router",
    "ip": "192.168.1.1",
    "wifi_clients": ["laptop", "phone", "tablet"],
    "uptime": "5 days",
    "firmware_version": "23.05.0"
}

conn.execute("""
    INSERT OR REPLACE INTO devices (device_id, device_type, ip_address, device_data)
    VALUES (?, ?, ?, ?)
""", ("openwrt_router", "router", "192.168.1.1", json.dumps(device_data)))

conn.commit()
conn.close()
```

#### Query JSON data:
```python
# Find all devices with WiFi clients
cursor = conn.execute("""
    SELECT device_id, device_data
    FROM devices
    WHERE json_extract(device_data, '$.wifi_clients') IS NOT NULL
""")

for row in cursor:
    device_id, device_json = row
    device_data = json.loads(device_json)
    print(f"{device_id}: {device_data['wifi_clients']}")
```

## Alternative Options

### If you prefer document databases:

1. **TinyDB** (Python)
   - Lightweight document database
   - JSON file storage
   - No server required
   - Good for small datasets

2. **MongoDB** (you already have this configured)
   - Full document database
   - Requires running MongoDB server
   - Better for larger datasets
   - More complex setup

### For time-series data:
- **InfluxDB** - specialized for sensor/time-series data
- **TimescaleDB** - PostgreSQL extension for time-series

## Setup Instructions

1. **Initialize the database:**
   ```bash
   python3 scripts/init_database.py
   ```

2. **Environment variables are already configured in `.env`:**
   ```bash
   SQLITE_DB_PATH=/Users/david/Documents/MCPHomeAutomation/data/home_automation.db
   ```

3. **Backup your data:**
   ```bash
   cp data/home_automation.db data/home_automation_backup.db
   ```

## Data Persistence Benefits

- **Device State**: Store current status, configurations, capabilities
- **Historical Data**: Track changes over time (firmware updates, IP changes)
- **Automation Rules**: Store custom rules and triggers
- **Performance Metrics**: Monitor device uptime, response times
- **Configuration History**: Track changes to network settings

This approach allows your MCP tools to access rich contextual data without requiring external API calls or manual data entry for every operation.</content>
<parameter name="filePath">/Users/david/Documents/MCPHomeAutomation/data/README.md