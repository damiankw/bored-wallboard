const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database and SQL file paths
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'wallboard.db');
const sqlPath = path.join(__dirname, '..', 'dev', 'setup_database.sql');

console.log('- Initializing Wallboard Database...\n');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('📁 Created data directory');
}

// Read SQL setup file
let sqlScript;
try {
    sqlScript = fs.readFileSync(sqlPath, 'utf8');
    console.log('📄 SQL script loaded');
} catch (error) {
    console.error('❌ Error reading SQL file:', error.message);
    process.exit(1);
}

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('🗃️  Connected to SQLite database');
});

// Execute SQL script
db.exec(sqlScript, (err) => {
    if (err) {
        console.error('❌ Error executing SQL script:', err.message);
        db.close();
        process.exit(1);
    }
    
    console.log('✅ Database tables created');
    
    // Test the database
    db.get('SELECT COUNT(*) as count FROM tiles WHERE is_active = 1', [], (err, row) => {
        if (err) {
            console.error('❌ Error testing database:', err.message);
        } else {
            console.log(`✅ Sample data loaded: ${row.count} active tiles`);
            
            // Show sample tiles
            db.all('SELECT tile_id, title, status, tile_type FROM active_tiles LIMIT 5', [], (err, tiles) => {
                if (err) {
                    console.error('❌ Error fetching sample tiles:', err.message);
                } else {
                    console.log('\n📋 Sample tiles:');
                    tiles.forEach(tile => {
                        console.log(`   - ${tile.tile_id}: ${tile.title} (${tile.status}) [${tile.tile_type}]`);
                    });
                }
                
                // Close database and show next steps
                db.close((err) => {
                    if (err) {
                        console.error('❌ Error closing database:', err.message);
                    } else {
                        console.log('\n✅ Database initialization complete!');
                        console.log('\n📝 Next steps:');
                        console.log('   1. Run: npm start');
                        console.log('   2. Visit: http://localhost:3000');
                        console.log('   3. Test API: http://localhost:3000/api/health');
                        console.log('   4. Add tiles via: POST /api/add');
                    }
                });
            });
        }
    });
});