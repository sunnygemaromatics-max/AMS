# Remote Server PostgreSQL Setup Guide

Complete guide to set up PostgreSQL on your remote 24/7 server and make your AMS software always accessible.

## Overview

- **Remote Server**: Your 24/7 server (where PostgreSQL will run)
- **Your Computer**: Where you develop/access the AMS software
- **Goal**: AMS connects to remote PostgreSQL over the internet

---

## Step 1: Connect to Your Remote Server

### Windows Remote Desktop (RDP)
```
Windows Key + R → mstsc → Enter Server IP
```

### Linux SSH
```bash
ssh username@your-server-ip
```

---

## Step 2: Install PostgreSQL on Remote Server

### For Ubuntu/Debian Linux Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### For Windows Server

1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run installer on your remote server
3. Choose components: PostgreSQL Server, pgAdmin, Command Line Tools
4. Set password for `postgres` user (remember this!)
5. Keep default port 5432
6. Complete installation

---

## Step 3: Configure PostgreSQL for Remote Access

### On Linux Server

```bash
# Edit postgresql.conf to allow remote connections
sudo nano /etc/postgresql/15/main/postgresql.conf

# Find this line and change:
# FROM: listen_addresses = 'localhost'
# TO:   listen_addresses = '*'
listen_addresses = '*'

# Save (Ctrl+X, Y, Enter)
```

```bash
# Edit pg_hba.conf to allow your IP
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Add this at the end of the file:
# Allow your specific IP (replace x.x.x.x with your actual IP)
host    all             all             x.x.x.x/32           scram-sha-256

# OR allow all IPs (less secure, for testing only)
host    all             all             0.0.0.0/0            scram-sha-256

# Save and exit
```

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Check if listening on 0.0.0.0:5432
sudo netstat -tulpn | grep 5432
```

### On Windows Server

1. Open `C:\Program Files\PostgreSQL\15\data\postgresql.conf`
2. Find `listen_addresses = 'localhost'`
3. Change to: `listen_addresses = '*'`
4. Save file

5. Open `C:\Program Files\PostgreSQL\15\data\pg_hba.conf`
6. Add at the end:
   ```
   host    all    all    0.0.0.0/0    scram-sha-256
   ```
7. Save file

8. Restart PostgreSQL service:
   - Services app → PostgreSQL → Restart

---

## Step 4: Open Firewall on Remote Server

### Linux (UFW Firewall)

```bash
# Allow PostgreSQL port
sudo ufw allow 5432/tcp

# OR allow from specific IP only (more secure)
sudo ufw allow from YOUR_IP_ADDRESS to any port 5432

# Check status
sudo ufw status
```

### Linux (iptables)

```bash
# Allow port 5432
sudo iptables -A INPUT -p tcp --dport 5432 -j ACCEPT
sudo iptables-save
```

### Windows Server Firewall

1. Windows Firewall → Advanced Settings
2. Inbound Rules → New Rule
3. Port → TCP → 5432
4. Allow connection
5. Apply to all profiles (Domain, Private, Public)
6. Name: PostgreSQL Remote
7. Finish

### Cloud Provider Security Groups

If using AWS, Azure, GCP, etc.:

**AWS Security Group:**
- Type: PostgreSQL
- Protocol: TCP
- Port: 5432
- Source: Your IP address (or 0.0.0.0/0 for any - less secure)

**Azure Network Security Group:**
- Add inbound rule
- Source: Your IP
- Destination: Any
- Service: PostgreSQL (5432)
- Action: Allow

---

## Step 5: Create Database and User on Remote Server

Connect to PostgreSQL on remote server:

```bash
# Linux
sudo -u postgres psql

# Windows (in cmd)
psql -U postgres
```

Create database and user:

```sql
-- Create database
CREATE DATABASE asset_harmony;

-- Create a dedicated user for your app (more secure than using postgres)
CREATE USER ams_user WITH PASSWORD 'YourStrongPassword123!';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE asset_harmony TO ams_user;

-- Connect to database
\c asset_harmony

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO ams_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ams_user;

-- Exit
\q
```

---

## Step 6: Import Schema to Remote Database

### Option A: Copy Files to Remote Server

```bash
# From your local machine, copy schema file to remote server
scp supabase_complete_schema.sql user@remote-server-ip:/home/user/

# Then SSH to remote server and run:
psql -U postgres -d asset_harmony -f /home/user/supabase_complete_schema.sql
```

### Option B: Run Schema Directly

On remote server:

```bash
# Download schema from GitHub
curl -o schema.sql https://raw.githubusercontent.com/sam7399/asset-harmony/main/supabase_complete_schema.sql

# Run it
psql -U postgres -d asset_harmony -f schema.sql
```

---

## Step 7: Import Your Data

### Method 1: Direct Transfer from Supabase to Remote

Create a data export script on your local machine, then run on remote:

```bash
# On remote server, create data import file
nano import_data.sql

# Paste the INSERT statements from export_from_supabase.sql output
# Save and run:
psql -U postgres -d asset_harmony -f import_data.sql
```

### Method 2: Using pg_dump and pg_restore

```bash
# On Supabase (or export from Supabase dashboard to SQL)
# Download your data as SQL file

# Copy to remote server
scp data_export.sql user@remote-server-ip:/home/user/

# Import on remote server
psql -U postgres -d asset_harmony -f /home/user/data_export.sql
```

---

## Step 8: Configure Your App for Remote Connection

### Update Environment File

Create or edit `.env` file in your AMS project:

```env
# Remote PostgreSQL Connection
DATABASE_URL=postgresql://ams_user:YourStrongPassword123!@YOUR_SERVER_IP:5432/asset_harmony

# For Supabase client compatibility (if using PostgREST on remote)
VITE_SUPABASE_URL=http://YOUR_SERVER_IP:3000
VITE_SUPABASE_ANON_KEY=your-local-anon-key
```

### Direct PostgreSQL Connection (Node.js/Express)

```javascript
// db.js or database config
const { Pool } = require('pg');

const pool = new Pool({
  host: 'YOUR_SERVER_IP',
  port: 5432,
  database: 'asset_harmony',
  user: 'ams_user',
  password: 'YourStrongPassword123!',
  ssl: false // Set to true if you configure SSL (recommended for production)
});

module.exports = pool;
```

### Connection with SSL (More Secure)

```javascript
const pool = new Pool({
  host: 'YOUR_SERVER_IP',
  port: 5432,
  database: 'asset_harmony',
  user: 'ams_user',
  password: 'YourStrongPassword123!',
  ssl: {
    rejectUnauthorized: false // For self-signed certs
  }
});
```

---

## Step 9: Set Up PostgREST on Remote Server (Optional)

If your app uses Supabase client, install PostgREST on remote server:

```bash
# Download PostgREST
wget https://github.com/PostgREST/postgrest/releases/download/v11.2.0/postgrest-v11.2.0-linux-static-x64.tar.xz

# Extract
tar xJf postgrest-v11.2.0-linux-static-x64.tar.xz

# Create config
nano postgrest.conf
```

Add to config:
```conf
db-uri = "postgres://ams_user:YourStrongPassword123!@localhost:5432/asset_harmony"
db-schema = "public"
db-anon-role = "ams_user"
server-port = 3000
server-host = "0.0.0.0"
jwt-secret = "your-secret-key-min-32-characters-long-for-jwt"
```

Run PostgREST:
```bash
./postgrest postgrest.conf
```

Make it run always (using systemd):
```bash
sudo nano /etc/systemd/system/postgrest.service
```

Add:
```ini
[Unit]
Description=PostgREST API
After=network.target

[Service]
Type=simple
User=postgres
WorkingDirectory=/home/user
ExecStart=/home/user/postgrest /home/user/postgrest.conf
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable postgrest
sudo systemctl start postgrest
sudo systemctl status postgrest
```

---

## Step 10: Test Connection from Your Local Machine

### Test PostgreSQL Connection

```bash
# Install psql client if not installed
# Then test:
psql -h YOUR_SERVER_IP -U ams_user -d asset_harmony -p 5432

# Enter password when prompted
# If you see the psql prompt, connection works!
```

### Test from Your App

1. Start your AMS app locally
2. Try to login
3. Check browser console for connection errors

---

## Step 11: Verify Setup on Remote Server

Run the verification script:

```bash
# Copy verify script to remote
curl -o verify.sql https://raw.githubusercontent.com/sam7399/asset-harmony/main/verify_local_setup.sql

# Run it
psql -U postgres -d asset_harmony -f verify.sql
```

Or manually check:

```sql
-- Count rows in main tables
SELECT 'companies', count(*) FROM companies
UNION ALL SELECT 'assets', count(*) FROM assets
UNION ALL SELECT 'employees', count(*) FROM employees;

-- Check your permissions
SELECT public.has_role('YOUR_UUID'::uuid, 'admin');
```

---

## Step 12: Set Up SSL for Production Security (Recommended)

### Generate Self-Signed Certificate (Quick Setup)

```bash
# On remote server
sudo -u postgres openssl req -new -x509 -days 365 -nodes -text \
  -out /var/lib/postgresql/server.crt \
  -keyout /var/lib/postgresql/server.key \
  -subj "/CN=YOUR_SERVER_IP"

sudo chmod 600 /var/lib/postgresql/server.key
sudo chown postgres:postgres /var/lib/postgresql/server.*
```

### Configure PostgreSQL to Use SSL

Edit `postgresql.conf`:

```conf
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

Update your app connection string:
```javascript
const pool = new Pool({
  host: 'YOUR_SERVER_IP',
  port: 5432,
  database: 'asset_harmony',
  user: 'ams_user',
  password: 'YourStrongPassword123!',
  ssl: {
    rejectUnauthorized: false // Accept self-signed cert
  }
});
```

---

## Troubleshooting

### "Connection refused" Error

1. Check PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql
   ```

2. Check listening on all interfaces:
   ```bash
   sudo netstat -tulpn | grep 5432
   # Should show 0.0.0.0:5432
   ```

3. Check firewall allows port 5432

4. Check cloud security group allows your IP

### "Password authentication failed"

1. Verify username/password
2. Check pg_hba.conf has correct auth method
3. Try: `sudo -u postgres psql -c "\du"` to list users

### "Database does not exist"

```bash
# List databases
psql -U postgres -c "\l"

# Create if missing
createdb -U postgres asset_harmony
```

### Slow Connection

1. Check server bandwidth/latency:
   ```bash
   ping YOUR_SERVER_IP
   ```

2. Use connection pooling (PgBouncer)

3. Consider VPN for better security and performance

---

## Security Checklist

- [ ] Changed default postgres password
- [ ] Created dedicated app user (ams_user)
- [ ] Firewall allows only your IP (not 0.0.0.0/0)
- [ ] SSL enabled on PostgreSQL
- [ ] Strong password for database user
- [ ] Regular backups configured
- [ ] Fail2ban installed (Linux) to prevent brute force

### Install Fail2ban (Linux)

```bash
sudo apt install fail2ban -y

# Configure for PostgreSQL
sudo nano /etc/fail2ban/jail.local
```

Add:
```ini
[postgres]
enabled = true
port = 5432
filter = postgres
logpath = /var/log/postgresql/postgresql-15-main.log
maxretry = 3
bantime = 3600
```

```bash
sudo systemctl restart fail2ban
```

---

## Backup Automation

Set up automatic daily backups on remote server:

```bash
# Create backup script
sudo nano /usr/local/bin/backup_db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U postgres asset_harmony > $BACKUP_DIR/asset_harmony_$DATE.sql
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

```bash
sudo chmod +x /usr/local/bin/backup_db.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /usr/local/bin/backup_db.sh" | sudo crontab -
```

---

## Connection String Reference

### For Your App

```
postgresql://ams_user:PASSWORD@SERVER_IP:5432/asset_harmony
```

### For psql Client

```bash
psql -h SERVER_IP -U ams_user -d asset_harmony -p 5432
```

### For pgAdmin

- Host: `YOUR_SERVER_IP`
- Port: `5432`
- Database: `asset_harmony`
- Username: `ams_user`
- Password: `YourStrongPassword123!`

---

## Summary

1. ✅ Installed PostgreSQL on remote 24/7 server
2. ✅ Configured for remote access (listen_addresses, pg_hba.conf)
3. ✅ Opened firewall and security groups
4. ✅ Created database and app user
5. ✅ Imported schema and data
6. ✅ Configured app to connect remotely
7. ✅ Set up SSL (optional but recommended)
8. ✅ Configured backups and monitoring

Your AMS software is now connected to your always-on remote database!
