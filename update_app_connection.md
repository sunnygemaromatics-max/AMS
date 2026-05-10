\# Update Your App for Remote Database

Quick guide to update your AMS app to connect to your remote 24/7 server.

## Step 1: Get Your Connection Info

After running the remote setup, you'll have:

```
Server IP: YOUR_SERVER_IP
Database: asset_harmony
Username: ams_user
Password: GENERATED_PASSWORD
Port: 5432
```

## Step 2: Update Environment Variables

### Create `.env` file in your project root:

```env
# Remote PostgreSQL Server
DATABASE_URL=postgresql://ams_user:PASSWORD@YOUR_SERVER_IP:5432/asset_harmony

# If using Supabase client with PostgREST on remote
VITE_SUPABASE_URL=http://YOUR_SERVER_IP:3000
VITE_SUPABASE_ANON_KEY=your-anon-key

# For direct connection
DB_HOST=YOUR_SERVER_IP
DB_PORT=5432
DB_NAME=asset_harmony
DB_USER=ams_user
DB_PASSWORD=PASSWORD
```

## Step 3: Update Database Connection Code

### If using Supabase Client (src/lib/supabase.ts)

```typescript
import { createClient } from '@supabase/supabase-js'

// OLD (Supabase Cloud)
// const supabaseUrl = 'https://your-project.supabase.co'
// const supabaseKey = 'your-anon-key'

// NEW (Your Remote Server with PostgREST)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://YOUR_SERVER_IP:3000'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-local-anon-key'

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### If using Direct PostgreSQL (Node.js)

Install pg driver:
```bash
npm install pg
```

Create `src/lib/db.ts`:
```typescript
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST || 'YOUR_SERVER_IP',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'asset_harmony',
  user: process.env.DB_USER || 'ams_user',
  password: process.env.DB_PASSWORD || 'PASSWORD',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

export default pool
```

## Step 4: Update API Calls

### If previously using Supabase RPC

You may need to update API endpoints to use direct SQL queries:

```typescript
// OLD (Supabase)
const { data, error } = await supabase
  .from('companies')
  .select('*')

// NEW (Direct PostgreSQL)
import pool from './lib/db'
const result = await pool.query('SELECT * FROM companies')
const data = result.rows
```

## Step 5: Build and Deploy

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Or start dev server
npm run dev
```

## Step 6: Test Connection

1. Start your app: `npm run dev`
2. Open browser: `http://localhost:5173`
3. Try to login
4. Check browser console for errors
5. Check that data loads from remote server

## Troubleshooting Connection Issues

### "Connection refused"

1. Check server IP is correct
2. Verify PostgreSQL is running on remote server:
   ```bash
   # On remote server
   sudo systemctl status postgresql
   ```
3. Check firewall allows port 5432
4. Verify `listen_addresses = '*'` in postgresql.conf

### "Password authentication failed"

1. Double-check username/password in `.env`
2. Reset password if needed:
   ```sql
   -- On remote server
   ALTER USER ams_user WITH PASSWORD 'newpassword';
   ```

### "Database does not exist"

```sql
-- On remote server
CREATE DATABASE asset_harmony;
GRANT ALL PRIVILEGES ON DATABASE asset_harmony TO ams_user;
```

### "SSL required"

If getting SSL errors, update connection:
```typescript
ssl: {
  rejectUnauthorized: false
}
```

Or disable SSL requirement in pg_hba.conf:
```
host    all    all    0.0.0.0/0    trust
```
(Note: Less secure, for testing only)

## Connection String Examples

### For Node.js pg
```javascript
const connectionString = 'postgresql://ams_user:password@YOUR_SERVER_IP:5432/asset_harmony'
```

### For psql command line
```bash
psql "postgresql://ams_user:password@YOUR_SERVER_IP:5432/asset_harmony"
```

### For pgAdmin 4
- Host: `YOUR_SERVER_IP`
- Port: `5432`
- Database: `asset_harmony`
- Username: `ams_user`
- Password: `yourpassword`

### For DBeaver/TablePlus
Use PostgreSQL connector with above credentials.

## Quick Test Script

Save as `test_connection.js`:

```javascript
const { Pool } = require('pg')

const pool = new Pool({
  host: 'YOUR_SERVER_IP',
  port: 5432,
  database: 'asset_harmony',
  user: 'ams_user',
  password: 'PASSWORD'
})

async function test() {
  try {
    const result = await pool.query('SELECT NOW() as current_time, current_database() as database')
    console.log('✅ Connection successful!')
    console.log('Server time:', result.rows[0].current_time)
    console.log('Database:', result.rows[0].database)
    
    const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
    console.log('Tables:', tables.rows.map(r => r.tablename).join(', '))
  } catch (err) {
    console.error('❌ Connection failed:', err.message)
  } finally {
    pool.end()
  }
}

test()
```

Run: `node test_connection.js`

## Production Deployment Checklist

- [ ] SSL enabled on PostgreSQL
- [ ] Firewall restricted to your IP only
- [ ] Strong database password
- [ ] Regular backups configured
- [ ] App environment variables set
- [ ] Connection tested successfully
- [ ] All tables verified
- [ ] User permissions confirmed
