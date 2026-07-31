# Wallboard - Node.js Application

A dynamic, tile-based monitoring dashboard for operations teams. Built with Node.js, Express, SQLite, and vanilla JavaScript.

## Features

✅ **Dynamic Tile System** - Add/update/remove tiles via API calls  
✅ **Auto-Priority Sorting** - Critical issues appear first automatically  
✅ **10 Tile Types** - Standard, progress wheels/bars, gauges, sparklines, lists, countdowns, deltas, traffic lights, tickers  
✅ **Auto-Expiration** - Old tiles automatically disappear after 24 hours  
✅ **Real-time Updates** - Dashboard refreshes every 30 seconds  
✅ **Portable Database** - Single SQLite file, no external dependencies  
✅ **RESTful API** - Easy integration with monitoring systems  

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Server**
   ```bash
   npm start
   ```

4. **Open Dashboard**  
   Visit: http://localhost:3000

## API

Full endpoint list, field reference, all 10 tile types with example
payloads, icon keys, and status/size values: **[API.md](API.md)**.

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
   pm2 start server.js --name "wallboard"
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