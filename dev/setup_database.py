#!/usr/bin/env python3
"""
ICT Wallboard Database Setup
Creates the SQLite database and initializes the tiles table
"""

import sqlite3
import os
from datetime import datetime, timedelta

def setup_database():
    """Create the SQLite database and run the setup SQL"""
    
    # Ensure we're in the dev directory
    dev_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(dev_dir, 'wallboard.db')
    sql_path = os.path.join(dev_dir, 'setup_database.sql')
    
    # Read the SQL setup file
    try:
        with open(sql_path, 'r', encoding='utf-8') as f:
            sql_script = f.read()
    except FileNotFoundError:
        print(f"Error: Could not find {sql_path}")
        return False
    
    # Create/connect to database
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Execute the SQL script
        cursor.executescript(sql_script)
        
        # Commit changes
        conn.commit()
        
        print(f"✅ Database created successfully at: {db_path}")
        
        # Test the database by counting records
        cursor.execute("SELECT COUNT(*) FROM tiles WHERE is_active = 1")
        count = cursor.fetchone()[0]
        print(f"✅ Sample data loaded: {count} active tiles")
        
        # Show the active tiles
        cursor.execute("SELECT title, status, tile_type FROM active_tiles LIMIT 5")
        tiles = cursor.fetchall()
        print("\n📋 Sample tiles:")
        for tile in tiles:
            print(f"   - {tile[0]} ({tile[1]}) [{tile[2]}]")
        
        conn.close()
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_database():
    """Test database operations"""
    
    dev_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(dev_dir, 'wallboard.db')
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row  # Enable named access to columns
        cursor = conn.cursor()
        
        # Test adding a new tile
        test_tile = {
            'title': 'Test Alert',
            'icon': '🚨',
            'tile_type': 'standard',
            'value': '5',
            'sub_value': 'New critical issues',
            'status': 'error',
            'status_text': 'Immediate Action',
            'additional_info': 'Server Room: 3 | Network: 2',
            'priority': 1
        }
        
        cursor.execute("""
            INSERT INTO tiles (title, icon, tile_type, value, sub_value, status, status_text, additional_info, priority)
            VALUES (:title, :icon, :tile_type, :value, :sub_value, :status, :status_text, :additional_info, :priority)
        """, test_tile)
        
        # Test retrieving active tiles
        cursor.execute("SELECT * FROM active_tiles LIMIT 3")
        tiles = cursor.fetchall()
        
        print(f"\n🧪 Test Results:")
        print(f"   - Added test tile successfully")
        print(f"   - Retrieved {len(tiles)} active tiles")
        print(f"   - Top priority tile: {tiles[0]['title']} ({tiles[0]['status']})")
        
        # Clean up test data
        cursor.execute("DELETE FROM tiles WHERE title = 'Test Alert'")
        
        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Setting up ICT Wallboard Database...")
    
    if setup_database():
        print("\n🔬 Running database tests...")
        if test_database():
            print("\n✅ Database setup complete!")
            print("\n📝 Next steps:")
            print("   1. Use the API endpoints to add/update tiles")
            print("   2. Connect the frontend to fetch data from the database")
            print("   3. Set up automated scripts to populate tile data")
        else:
            print("\n⚠️  Database created but tests failed")
    else:
        print("\n❌ Database setup failed")