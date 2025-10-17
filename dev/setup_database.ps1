# ICT Wallboard Database Setup Script
# PowerShell script to create SQLite database

Write-Host "🔧 Setting up ICT Wallboard Database..." -ForegroundColor Cyan

$devPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$dbPath = Join-Path $devPath "wallboard.db"
$sqlPath = Join-Path $devPath "setup_database.sql"

# Check if SQLite is available
$sqliteCommand = Get-Command sqlite3 -ErrorAction SilentlyContinue

if (-not $sqliteCommand) {
    Write-Host "❌ SQLite3 not found. Please install SQLite3 or use the manual setup instructions." -ForegroundColor Red
    Write-Host ""
    Write-Host "📝 Manual Setup Instructions:" -ForegroundColor Yellow
    Write-Host "1. Download SQLite3 from https://sqlite.org/download.html"
    Write-Host "2. Run: sqlite3 wallboard.db"
    Write-Host "3. Run: .read setup_database.sql"
    Write-Host "4. Run: .exit"
    return
}

try {
    # Read SQL file content
    $sqlContent = Get-Content $sqlPath -Raw -Encoding UTF8
    
    # Create database and run SQL
    $sqlContent | sqlite3 $dbPath
    
    Write-Host "✅ Database created successfully at: $dbPath" -ForegroundColor Green
    
    # Test the database
    $tileCount = sqlite3 $dbPath "SELECT COUNT(*) FROM tiles WHERE is_active = 1;"
    Write-Host "✅ Sample data loaded: $tileCount active tiles" -ForegroundColor Green
    
    # Show sample tiles
    Write-Host ""
    Write-Host "📋 Sample tiles:" -ForegroundColor Cyan
    $sampleTiles = sqlite3 $dbPath "SELECT title || ' (' || status || ') [' || tile_type || ']' FROM active_tiles LIMIT 5;"
    foreach ($tile in $sampleTiles) {
        Write-Host "   - $tile" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "✅ Database setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Create API endpoints to add/update tiles"
    Write-Host "   2. Connect the frontend to fetch data from the database"
    Write-Host "   3. Set up automated scripts to populate tile data"
    
} catch {
    Write-Host "❌ Error setting up database: $($_.Exception.Message)" -ForegroundColor Red
}