# ICT Wallboard - Node.js Application

A dynamic, tile-based monitoring dashboard for ICT operations teams. Built with Node.js, Express, SQLite, and vanilla JavaScript.

## Features

✅ **Dynamic Tile System** - Add/update/remove tiles via API calls  
✅ **Auto-Priority Sorting** - Critical issues appear first automatically  
✅ **Multiple Tile Types** - Standard, progress wheels, progress bars  
✅ **Auto-Expiration** - Old tiles automatically disappear after 24 hours  
✅ **Real-time Updates** - Dashboard refreshes every 30 seconds  
✅ **Portable Database** - Single SQLite file, no external dependencies  
✅ **RESTful API** - Easy integration with monitoring systems  

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Initialize Database**
   ```bash
   npm run init-db
   ```

3. **Start Server**
   ```bash
   npm start
   ```

4. **Open Dashboard**  
   Visit: http://localhost:3000

## API Endpoints

### 📊 Get All Tiles
```http
GET /api/tiles
```
Returns all active, non-expired tiles sorted by priority.

### 🎯 Get Specific Tile
```http
GET /api/tiles/:id
```

### ➕ Add/Update Tile
```http
POST /api/add
Content-Type: application/json

{
  "id": "cw_unassigned",              // REQUIRED: Unique tile identifier
  "title": "Unassigned Tickets",     // REQUIRED: Display title
  "value": "12",                     // REQUIRED: Main display value
  "icon": "🎫",                      // Optional: Emoji or CSS class (default: "📊")
  "tile_type": "standard",           // Optional: "standard", "progress_wheel", "progress_bar" (default: "standard")
  "sub_value": "Awaiting assignment", // Optional: Secondary description text
  "status": "warning",               // Optional: "error", "warning", "info", "success" (default: "info")
  "status_text": "Action Required",  // Optional: Status label text
  "additional_info": "High: 3 | Med: 6 | Low: 3", // Optional: Footer details
  "current_value": 12,               // Optional: For progress tiles - current count (default: 0)
  "max_value": 50,                   // Optional: For progress tiles - maximum count (default: 100)
  "priority": 10,                    // Optional: Custom priority 1-100, lower = higher priority (default: 50)
  "auto_expire": true                // Optional: Auto-expire after 24 hours (default: true)
}
```

**Required Fields:** `id`, `title`, `value`  
**All other fields are optional** and will use sensible defaults if not provided.

### 🗑️ Remove Tile
```http
DELETE /api/remove/:id
```

### 🧹 Cleanup Expired Tiles
```http
POST /api/cleanup
```

### ❤️ Health Check
```http
GET /api/health
```

## Complete API Field Reference

### Required Fields (Must be provided)
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | String | Unique identifier for the tile | `"cw_unassigned"` |
| `title` | String | Display title shown on tile | `"Unassigned Tickets"` |
| `value` | String | Main display value (large text) | `"12"`, `"Online"`, `"85%"` |

### Optional Fields (Will use defaults if not provided)
| Field | Type | Default | Description | Example |
|-------|------|---------|-------------|---------|
| `icon` | String | `"📊"` | Emoji or CSS class for tile icon | `"🎫"`, `"fa-ticket"` |
| `tile_type` | String | `"standard"` | Type of tile display | `"standard"`, `"progress_wheel"`, `"progress_bar"` |
| `sub_value` | String | `""` | Secondary text below main value | `"Awaiting assignment"` |
| `status` | String | `"info"` | Alert level (affects color/priority) | `"error"`, `"warning"`, `"info"`, `"success"` |
| `status_text` | String | `""` | Status label in footer | `"Critical"`, `"Action Required"`, `"Healthy"` |
| `additional_info` | String | `""` | Extra details in footer | `"High: 3 \| Med: 6 \| Low: 3"` |
| `current_value` | Integer | `0` | For progress tiles: current count | `18` (printers online) |
| `max_value` | Integer | `100` | For progress tiles: maximum count | `72` (total printers) |
| `priority` | Integer | `50` | Custom priority (1-100, lower = higher) | `10` (high priority), `80` (low priority) |
| `auto_expire` | Boolean | `true` | Auto-expire after 24 hours | `true`, `false` |

### Field Usage by Tile Type

**Standard Tile** - Uses: `id`, `title`, `value`, `icon`, `sub_value`, `status`, `status_text`, `additional_info`

**Progress Wheel** - Uses: All standard fields PLUS `current_value`, `max_value` (calculates percentage automatically)

**Progress Bar** - Uses: All standard fields PLUS `current_value`, `max_value` (calculates percentage automatically)

### Tile Types

**Standard Tile**
```json
{
  "id": "server_status",
  "title": "Server Status", 
  "value": "Online",
  "status": "success"
}
```

**Progress Wheel**
```json
{
  "id": "storage_usage",
  "title": "Storage Usage",
  "tile_type": "progress_wheel", 
  "value": "75%",
  "current_value": 750,
  "max_value": 1000,
  "status": "warning"
}
```

**Progress Bar**
```json
{
  "id": "compliance_rate",
  "title": "Device Compliance",
  "tile_type": "progress_bar",
  "value": "85%", 
  "current_value": 340,
  "max_value": 400,
  "status": "warning"
}
```

### Status Priority (Auto-Sorting)

1. **🔴 error** - Critical issues (red background)
2. **🟡 warning** - Needs attention (orange background)  
3. **⚪ info** - Normal information (gray background)
4. **🟢 success** - All good (green background)

## Example Usage

### PowerShell Script to Update Tickets
```powershell
$tileData = @{
    id = "cw_unassigned"                    # REQUIRED: Custom tile ID
    title = "Unassigned Tickets"           # REQUIRED: Display title  
    value = "15"                           # REQUIRED: Main value to display
    icon = "🎫"                            # Optional: Display icon
    tile_type = "standard"                 # Optional: Tile type
    sub_value = "Awaiting assignment"      # Optional: Secondary text
    status = "warning"                     # Optional: Alert level
    status_text = "Action Required"        # Optional: Status description
    additional_info = "High: 5 | Med: 7 | Low: 3" # Optional: Footer info
    priority = 10                          # Optional: Display priority
    auto_expire = $true                    # Optional: Auto-expire setting
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/add" -Method POST -Body $tileData -ContentType "application/json"
```

### Python Script to Monitor Storage
```python
import requests

def update_storage_tile():
    # Get storage data from your monitoring system
    used_gb = get_storage_usage()  # Your function
    total_gb = 1000
    percentage = round((used_gb / total_gb) * 100)
    
    # Determine status
    status = "success"
    if percentage >= 90: status = "error"
    elif percentage >= 75: status = "warning"
    
    # Update tile - ALL fields included for complete control
    tile_data = {
        "id": "storage_main",                    # REQUIRED: Unique identifier
        "title": "Storage Usage",               # REQUIRED: Display title
        "value": f"{percentage}%",              # REQUIRED: Main display value
        "icon": "💽",                          # Optional: Display icon
        "tile_type": "progress_wheel",          # Optional: Use progress wheel
        "sub_value": f"{used_gb}GB / {total_gb}GB", # Optional: Secondary info
        "status": status,                       # Optional: Alert level
        "status_text": "Monitor" if status == "warning" else "Normal", # Optional: Status label
        "additional_info": "Growth: 2GB/day",   # Optional: Footer details
        "current_value": used_gb,               # Optional: Progress current value
        "max_value": total_gb,                  # Optional: Progress maximum value
        "priority": 20,                         # Optional: Display priority
        "auto_expire": True                     # Optional: Auto-expire after 24h
    }
    
    response = requests.post("http://localhost:3000/api/add", json=tile_data)
    print(f"Tile updated: {response.json()}")

# Run every 5 minutes
update_storage_tile()
```

## Development

### Run in Development Mode
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Test API
```bash
npm test    # Runs automated API tests
```

### Project Structure
```
├── server.js              # Main Express server
├── package.json           # Dependencies and scripts
├── data/
│   └── wallboard.db       # SQLite database (created on init)
├── public/
│   └── index.html         # Dashboard frontend
├── scripts/
│   ├── init-database.js   # Database initialization
│   └── test-api.js        # API testing
└── dev/
    ├── setup_database.sql # Database schema
    └── README.md          # Database documentation
```

## Production Deployment

1. **Install PM2** (Production Process Manager)
   ```bash
   npm install -g pm2
   ```

2. **Start with PM2**
   ```bash
   pm2 start server.js --name "ict-wallboard"
   pm2 startup
   pm2 save
   ```

3. **Environment Variables**
   ```bash
   export PORT=3000
   export NODE_ENV=production
   ```

## Integration Examples

This wallboard is designed to be populated by your existing monitoring systems:

- **Ticketing Systems** (ConnectWise, ServiceNow) → Unassigned tickets
- **Network Monitoring** (PRTG, SolarWinds) → Store connectivity  
- **Antivirus Consoles** (Symantec, McAfee) → Security status
- **Microsoft Intune** → Device compliance
- **Phone Systems** → Call volumes
- **Backup Software** → Backup status
- **Custom Scripts** → Any metric you need

Simply have each system POST to `/api/add` with updated data!

## Support

For issues or questions, check the logs:
- Server logs: Console output from `npm start`
- Browser logs: F12 Developer Console
- Database: Located at `data/wallboard.db`

The system is designed to be robust - if external data feeds fail, tiles will auto-expire and disappear rather than showing stale data.