const fetch = require('node-fetch');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Test data - Complete tile examples showing all available fields
const testTile = {
    id: 'test_critical_alert',                 // REQUIRED: Unique ID
    title: 'Critical Test Alert',              // REQUIRED: Display title
    value: '5',                               // REQUIRED: Main value
    icon: '🚨',                               // Optional: Display icon
    tile_type: 'standard',                    // Optional: Tile type
    sub_value: 'Test alert for API validation', // Optional: Secondary text
    status: 'error',                          // Optional: Alert level
    status_text: 'Test Mode',                 // Optional: Status label
    additional_info: 'This is a test | API Working', // Optional: Footer info
    priority: 1,                              // Optional: Display priority
    auto_expire: true                         // Optional: Auto-expire setting
};

const testProgressTile = {
    id: 'test_storage_usage',                 // REQUIRED: Unique ID
    title: 'Test Storage Usage',              // REQUIRED: Display title  
    value: '85%',                            // REQUIRED: Main value (auto-calculated from current/max)
    icon: '💽',                              // Optional: Display icon
    tile_type: 'progress_wheel',              // Optional: Use progress wheel display
    sub_value: '850GB / 1TB',                // Optional: Shows ratio
    status: 'warning',                        // Optional: Alert level
    status_text: 'Monitor',                   // Optional: Status label
    additional_info: 'Growth: 5GB/day | Cleanup needed', // Optional: Footer details
    current_value: 850,                       // Optional: For progress calculation
    max_value: 1000,                          // Optional: For progress calculation  
    priority: 20,                             // Optional: Display priority
    auto_expire: true                         // Optional: Auto-expire setting
};

// Minimal tile example (only required fields)
const minimalTile = {
    id: 'test_minimal',
    title: 'Minimal Test Tile',
    value: 'OK'
    // All other fields will use defaults
};

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        const result = await response.json();
        
        console.log(`${method} ${endpoint}:`, response.status, response.statusText);
        console.log('Response:', result);
        console.log('---');
        
        return { response, result };
    } catch (error) {
        console.error(`Error with ${method} ${endpoint}:`, error.message);
        return { error };
    }
}

// Test functions
async function testHealthEndpoint() {
    console.log('🏥 Testing health endpoint...');
    await apiRequest('GET', '/health');
}

async function testGetTiles() {
    console.log('📋 Testing get all tiles...');
    await apiRequest('GET', '/tiles');
}

async function testAddTile() {
    console.log('➕ Testing add tile...');
    await apiRequest('POST', '/add', testTile);
}

async function testAddProgressTile() {
    console.log('🔄 Testing add progress wheel tile...');
    await apiRequest('POST', '/add', testProgressTile);
}

async function testUpdateTile() {
    console.log('✏️  Testing update tile...');
    const updatedTile = { ...testTile, value: '8', sub_value: 'Updated test alert' };
    await apiRequest('POST', '/add', updatedTile);
}

async function testGetSpecificTile() {
    console.log('🎯 Testing get specific tile...');
    await apiRequest('GET', `/tiles/${testTile.id}`);
}

async function testRemoveTile() {
    console.log('🗑️  Testing remove tile...');
    await apiRequest('DELETE', `/remove/${testTile.id}`);
}

async function testCleanup() {
    console.log('🧹 Testing cleanup...');
    await apiRequest('POST', '/cleanup');
}

// Main test runner
async function runTests() {
    console.log('🧪 Starting API Tests for ICT Wallboard\n');
    
    // Check if server is running
    try {
        const response = await fetch(BASE_URL);
        if (!response.ok) {
            throw new Error('Server not responding');
        }
        console.log('✅ Server is running\n');
    } catch (error) {
        console.error('❌ Server not accessible. Make sure to run "npm start" first.');
        console.error('Expected server at:', BASE_URL);
        process.exit(1);
    }
    
    // Run tests in sequence
    await testHealthEndpoint();
    await testGetTiles();
    await testAddTile();
    await testAddProgressTile();
    await testUpdateTile();
    await testGetSpecificTile();
    await testGetTiles(); // Check updated list
    await testCleanup();
    await testRemoveTile();
    await testGetTiles(); // Check final list
    
    console.log('✅ API tests completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Visit dashboard: http://localhost:3000');
    console.log('   2. Test with your own data via API calls');
    console.log('   3. Set up monitoring scripts to populate tiles');
    
    process.exit(0);
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled error:', error.message);
    process.exit(1);
});

// Run the tests
runTests();