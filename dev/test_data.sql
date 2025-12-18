-- Test data for ICT Wallboard
-- This file contains 15 diverse dummy entries covering all tile types and statuses
-- Run this after setting up the database to populate with test data

-- Clear existing test data (optional)
-- DELETE FROM tiles WHERE tile_id LIKE 'test_%';

-- Insert 15 diverse test tiles
INSERT OR REPLACE INTO tiles (
    tile_id, title, icon, tile_type, value, sub_value, status, status_text, 
    additional_info, priority, current_value, max_value, is_active, auto_expire
) VALUES

-- Critical Error Tiles (High Priority)
('test_server_down', 'Web Server Down', '🔥', 'standard', 'OFFLINE', 'Server unresponsive since 14:30', 'error', 'Critical', 'Last ping: 15 minutes ago', 1, 0, 0, 1, 1),
('test_disk_full', 'Disk Space Critical', '💾', 'progress_wheel', '95%', '1.9TB / 2TB', 'error', 'Critical', 'Only 100GB remaining', 2, 1900, 2000, 1, 1),
('test_security_breach', 'Security Alert', '🚨', 'standard', '3', 'Active security incidents', 'error', 'Immediate Action', 'Firewall blocks: 150/hour', 3, 0, 0, 1, 1),

-- Warning Tiles (Medium Priority)
('test_memory_usage', 'Memory Usage', '🧠', 'progress_bar', '78%', '12.5GB / 16GB', 'warning', 'Monitor', 'Trending upward last 2hrs', 10, 12500, 16000, 1, 1),
('test_ssl_expiry', 'SSL Certificates', '🔒', 'standard', '7', 'Expiring within 30 days', 'warning', 'Renewal Due', 'Main cert expires: Dec 15', 11, 0, 0, 1, 1),
('test_backup_old', 'Backup Status', '⏰', 'standard', '18 hours', 'Last successful backup', 'warning', 'Overdue', 'Should run every 12 hours', 12, 0, 0, 1, 1),
('test_bandwidth', 'Network Bandwidth', '📡', 'progress_wheel', '65%', '650 Mbps / 1 Gbps', 'warning', 'High Usage', 'Peak usage: 2PM-4PM', 13, 650, 1000, 1, 1),

-- Success/Healthy Tiles (Lower Priority)
('test_uptime', 'System Uptime', '⏱️', 'standard', '99.8%', '42 days, 8 hours', 'success', 'Excellent', 'Last restart: Sep 5', 20, 0, 0, 1, 1),
('test_users_online', 'Active Users', '👥', 'standard', '247', 'Users currently online', 'success', 'Normal', 'Peak today: 312 at 10AM', 21, 0, 0, 1, 1),
('test_database_conn', 'Database Health', '🗄️', 'progress_bar', '42%', '420 / 1000 connections', 'success', 'Healthy', 'Avg response: 15ms', 22, 420, 1000, 1, 1),

-- Info Tiles (Standard Priority)
('test_license_count', 'Software Licenses', '📋', 'progress_wheel', '83%', '83 / 100 used', 'info', 'Monitor', 'Office: 60, Adobe: 15, CAD: 8', 30, 83, 100, 1, 1),
('test_email_queue', 'Email Queue', '📧', 'standard', '12', 'Messages pending', 'info', 'Processing', 'Average wait: 3 minutes', 31, 0, 0, 1, 1),
('test_temperature', 'Server Room Temp', '🌡️', 'progress_bar', '68°F', '18°C', 'info', 'Normal', 'Range: 65-75°F optimal', 32, 68, 85, 1, 1),

-- Mixed Status Examples
('test_printer_farm', 'Printer Status', '🖨️', 'progress_wheel', '75%', '15 / 20 online', 'warning', 'Some Offline', 'Paper jam: 2, Offline: 3', 14, 15, 20, 1, 1),
('test_website_speed', 'Website Response', '🌐', 'standard', '1.2s', 'Average page load time', 'info', 'Acceptable', 'Target: <1s, 95th percentile: 2.1s', 33, 0, 0, 1, 1);

-- Set some tiles to expire at different times for testing auto-expiration
UPDATE tiles SET expires_at = datetime(CURRENT_TIMESTAMP, '+1 hour') WHERE tile_id = 'test_email_queue';
UPDATE tiles SET expires_at = datetime(CURRENT_TIMESTAMP, '+6 hours') WHERE tile_id = 'test_temperature';
UPDATE tiles SET expires_at = datetime(CURRENT_TIMESTAMP, '+24 hours') WHERE tile_id IN ('test_server_down', 'test_security_breach');

-- Set one tile to not auto-expire (permanent)
UPDATE tiles SET auto_expire = 0 WHERE tile_id = 'test_uptime';

-- Set one tile as inactive for testing
UPDATE tiles SET is_active = 0 WHERE tile_id = 'test_website_speed';

-- Display summary
SELECT 
    status,
    COUNT(*) as count,
    GROUP_CONCAT(title, ', ') as titles
FROM tiles 
WHERE tile_id LIKE 'test_%' AND is_active = 1
GROUP BY status
ORDER BY 
    CASE status 
        WHEN 'error' THEN 1 
        WHEN 'warning' THEN 2 
        WHEN 'info' THEN 3 
        WHEN 'success' THEN 4 
        ELSE 5 
    END;