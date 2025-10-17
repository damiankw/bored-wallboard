const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'wallboard.db');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('- Created data directory');
}

// Check if database file exists
const databaseExists = fs.existsSync(dbPath);
console.log(`- Database exists: ${databaseExists}`);

// Initialize database connection
let db;
let setupRequired = false;

try {
    db = new sqlite3.Database(dbPath);
    console.log('- Connected to SQLite database');
    
    // Check if setup is required
    if (!databaseExists) {
        setupRequired = true;
        console.log('- New database - setup required');
    } else {
        // Check if settings table exists and setup is completed
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'", (err, row) => {
            if (err || !row) {
                setupRequired = true;
                console.log('- Settings table missing - setup required');
            } else {
                // Check if setup_completed setting exists and is true
                db.get('SELECT value FROM settings WHERE key = ?', ['setup_completed'], (err, settingRow) => {
                    if (err || !settingRow || settingRow.value !== 'true') {
                        setupRequired = true;
                        console.log('- Setup not completed - setup required');
                    } else {
                        console.log('- Database setup verified');
                    }
                });
            }
        });
    }
} catch (error) {
    console.error('- Database connection failed:', error);
    setupRequired = true;
}

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    }
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware to check if setup is completed
async function requireSetup(req, res, next) {
    // Skip setup check for setup-related routes and static files
    if (req.path.includes('/setup') || req.path.includes('/api/setup') || req.path.includes('.css') || req.path.includes('.js') || req.path.includes('.ico')) {
        return next();
    }

    // If we know setup is required from startup, redirect immediately
    if (setupRequired) {
        return res.redirect('/setup.html');
    }

    // Double-check database state for runtime verification
    if (!db) {
        return res.redirect('/setup.html');
    }

    // Verify settings table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'", (err, row) => {
        if (err || !row) {
            console.log('- Settings table missing - redirecting to setup');
            return res.redirect('/setup.html');
        }

        // Check if setup is completed
        db.get('SELECT value FROM settings WHERE key = ?', ['setup_completed'], (err, settingRow) => {
            if (err || !settingRow || settingRow.value !== 'true') {
                console.log('- Setup not completed - redirecting to setup');
                return res.redirect('/setup.html');
            }
            next();
        });
    });
}

// Apply setup check to main routes BEFORE static file serving
app.use('/', requireSetup);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes

// Setup status check
app.get('/api/setup-status', (req, res) => {
    // If database doesn't exist or connection failed
    if (!db || setupRequired) {
        return res.json({ 
            setupCompleted: false, 
            reason: 'Database not initialized or setup incomplete'
        });
    }

    // Check if settings table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'", (err, row) => {
        if (err || !row) {
            return res.json({ 
                setupCompleted: false, 
                reason: 'Settings table missing'
            });
        }

        // Check setup completion status
        db.get('SELECT value FROM settings WHERE key = ?', ['setup_completed'], (err, settingRow) => {
            if (err) {
                return res.json({ 
                    setupCompleted: false, 
                    error: err.message 
                });
            }
            
            res.json({ 
                setupCompleted: settingRow && settingRow.value === 'true',
                reason: !settingRow ? 'Setup completion status not found' : 
                        settingRow.value !== 'true' ? 'Setup not marked as completed' : null
            });
        });
    });
});

// Initialize setup
app.post('/api/setup', (req, res) => {
    const { dashboardTitle, tileLifetime } = req.body;

    if (!dashboardTitle || tileLifetime === undefined) {
        return res.status(400).json({ 
            error: 'Missing required fields: dashboardTitle, tileLifetime' 
        });
    }

    // Read and execute database setup script
    const fs = require('fs');
    const sqlPath = path.join(__dirname, 'dev', 'setup_database.sql');
    
    try {
        const sqlScript = fs.readFileSync(sqlPath, 'utf8');
        
        db.exec(sqlScript, (err) => {
            if (err) {
                console.error('Database setup error:', err);
                return res.status(500).json({ error: 'Database initialization failed', details: err.message });
            }

            // Update settings with user preferences
            const updateSettings = db.prepare(`
                INSERT OR REPLACE INTO settings (key, value, updated_at) 
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `);

            updateSettings.run('dashboard_title', dashboardTitle);
            updateSettings.run('tile_lifetime_hours', tileLifetime.toString());
            updateSettings.run('setup_completed', 'true');
            updateSettings.finalize();

            // Reset the setupRequired flag since setup is now complete
            setupRequired = false;

            res.json({
                success: true,
                message: 'Wallboard initialized successfully',
                settings: {
                    dashboardTitle,
                    tileLifetime
                }
            });
        });

    } catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({ error: 'Setup failed', details: error.message });
    }
});

// Get settings
app.get('/api/settings', (req, res) => {
    db.all('SELECT key, value FROM settings', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error', details: err.message });
        }

        const settings = {};
        rows.forEach(row => {
            settings[row.key] = row.value;
        });

        res.json({ success: true, settings });
    });
});

// Get all active tiles
app.get('/api/tiles', (req, res) => {
    const query = `
        SELECT * FROM active_tiles
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        res.json({
            success: true,
            count: rows.length,
            tiles: rows
        });
    });
});

// Get specific tile by ID
app.get('/api/tiles/:id', (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT * FROM tiles WHERE tile_id = ? AND is_active = 1
    `;
    
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Tile not found' });
        }
        
        res.json({
            success: true,
            tile: row
        });
    });
});

// Add or update tile
app.post('/api/add', (req, res) => {
    const {
        id,
        title,
        icon = '📊',
        tile_type = 'standard',
        value,
        sub_value = '',
        status = 'info',
        status_text = '',
        additional_info = '',
        current_value = 0,
        max_value = 100,
        priority = 50,
        auto_expire = true
    } = req.body;

    // Validation
    if (!id || !title || !value) {
        return res.status(400).json({ 
            error: 'Missing required fields', 
            required: ['id', 'title', 'value'] 
        });
    }

    // Check if tile exists
    const checkQuery = 'SELECT id FROM tiles WHERE tile_id = ?';
    
    db.get(checkQuery, [id], (err, existingTile) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }

        const now = new Date().toISOString();
        const expires = auto_expire ? 
            new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : 
            null;

        if (existingTile) {
            // Update existing tile
            const updateQuery = `
                UPDATE tiles SET 
                    title = ?, icon = ?, tile_type = ?, value = ?, sub_value = ?,
                    status = ?, status_text = ?, additional_info = ?,
                    current_value = ?, max_value = ?, priority = ?,
                    updated_at = ?, expires_at = ?, auto_expire = ?, is_active = 1
                WHERE tile_id = ?
            `;
            
            db.run(updateQuery, [
                title, icon, tile_type, value, sub_value,
                status, status_text, additional_info,
                current_value, max_value, priority,
                now, expires, auto_expire, id
            ], function(err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error', details: err.message });
                }
                
                res.json({
                    success: true,
                    message: 'Tile updated successfully',
                    tile_id: id,
                    action: 'updated'
                });
            });
        } else {
            // Insert new tile
            const insertQuery = `
                INSERT INTO tiles (
                    tile_id, title, icon, tile_type, value, sub_value,
                    status, status_text, additional_info,
                    current_value, max_value, priority,
                    created_at, updated_at, expires_at, auto_expire, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `;
            
            db.run(insertQuery, [
                id, title, icon, tile_type, value, sub_value,
                status, status_text, additional_info,
                current_value, max_value, priority,
                now, now, expires, auto_expire
            ], function(err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error', details: err.message });
                }
                
                res.status(201).json({
                    success: true,
                    message: 'Tile created successfully',
                    tile_id: id,
                    action: 'created'
                });
            });
        }
    });
});

// Remove tile (set inactive)
app.delete('/api/remove/:id', (req, res) => {
    const { id } = req.params;
    
    const query = 'UPDATE tiles SET is_active = 0, updated_at = ? WHERE tile_id = ?';
    
    db.run(query, [new Date().toISOString(), id], function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Tile not found' });
        }
        
        res.json({
            success: true,
            message: 'Tile removed successfully',
            tile_id: id
        });
    });
});

// Cleanup expired tiles
app.post('/api/cleanup', (req, res) => {
    const query = `
        UPDATE tiles 
        SET is_active = 0, updated_at = ?
        WHERE auto_expire = 1 AND expires_at < ? AND is_active = 1
    `;
    
    const now = new Date().toISOString();
    
    db.run(query, [now, now], function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        res.json({
            success: true,
            message: 'Cleanup completed',
            tiles_expired: this.changes
        });
    });
});

// Health check
app.get('/api/health', (req, res) => {
    db.get('SELECT COUNT(*) as count FROM tiles WHERE is_active = 1', [], (err, row) => {
        if (err) {
            return res.status(500).json({ 
                status: 'error', 
                database: 'disconnected',
                error: err.message 
            });
        }
        
        res.json({
            status: 'ok',
            database: 'connected',
            active_tiles: row.count,
            timestamp: new Date().toISOString()
        });
    });
});

// Serve main wallboard page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});

// Auto-cleanup expired tiles every 5 minutes
setInterval(() => {
    const query = `
        UPDATE tiles 
        SET is_active = 0, updated_at = ?
        WHERE auto_expire = 1 AND expires_at < ? AND is_active = 1
    `;
    
    const now = new Date().toISOString();
    
    db.run(query, [now, now], function(err) {
        if (err) {
            console.error('Auto-cleanup error:', err);
        } else if (this.changes > 0) {
            console.log(`Auto-cleanup: ${this.changes} tiles expired`);
        }
    });
}, 5 * 60 * 1000); // 5 minutes

// Start server
app.listen(PORT, () => {
    console.log(`- Wallboard server running on http://localhost:${PORT}`);
    console.log(`- Dashboard: http://localhost:${PORT}`);
    console.log(`- API: http://localhost:${PORT}/api/tiles`);
    console.log(`- Health: http://localhost:${PORT}/api/health`);
});