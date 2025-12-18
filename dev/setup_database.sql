-- Bored Wallboard Database Setup
-- SQLite database for storing dynamic wallboard tiles
-- Each row represents a single tile with all its configuration and data

CREATE TABLE IF NOT EXISTS tiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tile_id VARCHAR(100) UNIQUE NOT NULL,           -- Custom ID: "cw_unassigned", "server_cpu_01"
    
    -- Display Configuration
    title VARCHAR(100) NOT NULL,                    -- "Unassigned Tickets"
    icon VARCHAR(50),                               -- Emoji or icon class: "🎫" or "fa-ticket"
    tile_type VARCHAR(20) DEFAULT 'standard',      -- 'standard', 'progress_wheel', 'progress_bar', 'chart'
    
    -- Values and Data
    value VARCHAR(50) NOT NULL,                     -- Main display value: "12", "Online", "75%"
    sub_value VARCHAR(100),                         -- Secondary value: "7.5TB / 10TB", "Current: 45ms"
    
    -- Status and Appearance
    status VARCHAR(20) DEFAULT 'info',             -- 'error', 'warning', 'success', 'info'
    status_text VARCHAR(50),                       -- "Action Required", "Critical", "Monitor", "Healthy"
    
    -- Additional Information
    additional_info VARCHAR(200),                  -- "High: 3 | Med: 6 | Low: 3", "Toner Low: 12 | Offline: 54"
    
    -- Progress/Chart Data (for wheel and bar tiles)
    current_value INTEGER DEFAULT 0,              -- For progress wheels: current count
    max_value INTEGER DEFAULT 100,                -- For progress wheels: maximum count
    
    -- Tile Priority and Ordering
    priority INTEGER DEFAULT 50,                  -- Custom priority (1-100, lower = higher priority)
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME DEFAULT (datetime(CURRENT_TIMESTAMP, '+24 hours')), -- Auto-expire tiles after 24h
    
    -- Configuration flags
    is_active BOOLEAN DEFAULT 1,                  -- Whether tile should be displayed
    auto_expire BOOLEAN DEFAULT 1                 -- Whether tile should auto-expire
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tiles_active_status ON tiles(is_active, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_tiles_expires ON tiles(expires_at);

-- Settings table for configuration
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(50) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT OR REPLACE INTO settings (key, value) VALUES
('dashboard_title', 'Bored Wallboard'),
('tile_lifetime_hours', '24'),
('setup_completed', 'false');

-- View to get active, non-expired tiles ordered by priority
CREATE VIEW IF NOT EXISTS active_tiles AS
SELECT *
FROM tiles
WHERE is_active = 1 
  AND (auto_expire = 0 OR expires_at > CURRENT_TIMESTAMP)
ORDER BY 
  CASE status 
    WHEN 'error' THEN 1 
    WHEN 'warning' THEN 2 
    WHEN 'info' THEN 3 
    WHEN 'success' THEN 4 
    ELSE 3 
  END,
  priority ASC,
  updated_at DESC;