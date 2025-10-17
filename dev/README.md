# ICT Wallboard Database Documentation

## Database Structure

The wallboard uses a single SQLite database (`wallboard.db`) with one main table: `tiles`

### Tiles Table Schema

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `id` | INTEGER PRIMARY KEY | Auto-incrementing unique ID | 1, 2, 3... |
| `title` | VARCHAR(100) | Display title for the tile | "Unassigned Tickets" |
| `icon` | VARCHAR(50) | Emoji or icon class | "🎫" or "fa-ticket" |
| `tile_type` | VARCHAR(20) | Type of tile display | "standard", "progress_wheel", "progress_bar" |
| `value` | VARCHAR(50) | Main display value | "12", "Online", "75%" |
| `sub_value` | VARCHAR(100) | Secondary value/description | "Awaiting assignment" |
| `status` | VARCHAR(20) | Alert level | "error", "warning", "success", "info" |
| `status_text` | VARCHAR(50) | Status description | "Critical", "Action Required" |
| `additional_info` | VARCHAR(200) | Extra details for footer | "High: 3 \| Med: 6 \| Low: 3" |
| `current_value` | INTEGER | For progress tiles: current count | 18 (printers online) |
| `max_value` | INTEGER | For progress tiles: maximum count | 72 (total printers) |
| `priority` | INTEGER | Custom priority (1-100, lower = higher) | 10 |
| `created_at` | DATETIME | When tile was created | 2025-10-17 10:30:00 |
| `updated_at` | DATETIME | Last update time | 2025-10-17 10:35:00 |
| `expires_at` | DATETIME | When tile expires (auto-cleanup) | 2025-10-18 10:30:00 |
| `is_active` | BOOLEAN | Whether tile should be displayed | 1 (true) |
| `auto_expire` | BOOLEAN | Whether tile auto-expires | 1 (true) |

### Tile Types

1. **standard** - Basic tile with title, value, and description
2. **progress_wheel** - Circular progress indicator (uses current_value/max_value)
3. **progress_bar** - Linear progress bar (uses current_value/max_value)
4. **chart** - Reserved for future chart implementations

### Status Levels (Priority Order)

1. **error** - Critical issues (red background, highest priority)
2. **warning** - Issues needing attention (orange background)
3. **info** - Normal information (gray background)
4. **success** - All good (green background, lowest priority)

### Icon Handling

Icons can be:
- **Emoji**: "🎫", "🏪", "🌐" (recommended for simplicity)
- **Icon Classes**: "fa-ticket", "material-icons-ticket" (requires CSS framework)

### Auto-Expiration

- Tiles automatically expire after 24 hours by default
- Set `auto_expire = 0` to prevent expiration
- Expired tiles are filtered out by the `active_tiles` view

## Usage Examples

### Adding a New Tile
```sql
INSERT INTO tiles (
    title, icon, tile_type, value, sub_value, 
    status, status_text, additional_info, priority
) VALUES (
    'Server Down', '🚨', 'standard', '1', 
    'Critical server offline', 'error', 
    'Immediate Action', 'Database Server: SQL01', 1
);
```

### Updating Tile Data
```sql
UPDATE tiles 
SET value = '15', 
    sub_value = 'New tickets pending', 
    updated_at = CURRENT_TIMESTAMP,
    expires_at = datetime(CURRENT_TIMESTAMP, '+24 hours')
WHERE title = 'Unassigned Tickets';
```

### Getting Active Tiles (Frontend Query)
```sql
SELECT * FROM active_tiles;
```

This returns all active, non-expired tiles ordered by:
1. Status priority (error, warning, info, success)
2. Custom priority value (ascending)
3. Most recently updated (descending)

## Setup Instructions

1. **With SQLite3 installed:**
   ```bash
   cd dev/
   sqlite3 wallboard.db < setup_database.sql
   ```

2. **With PowerShell:**
   ```powershell
   cd dev/
   .\setup_database.ps1
   ```

3. **Manual setup:**
   - Download SQLite3
   - Run: `sqlite3 wallboard.db`
   - Run: `.read setup_database.sql`
   - Run: `.exit`

## API Integration

The database is designed to work with external scripts that:
1. Monitor systems (ticketing, servers, antivirus, etc.)
2. Insert/update tile data via API calls
3. Let the frontend automatically display prioritized, current data

This approach means:
- ✅ Any system can add tiles without frontend changes
- ✅ Old data automatically expires
- ✅ Critical issues always appear first
- ✅ Completely portable (single SQLite file)