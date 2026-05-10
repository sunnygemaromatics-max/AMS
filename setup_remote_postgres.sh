#!/bin/bash
# ============================================================
# Automated Remote Server PostgreSQL Setup Script
# Run this on your remote Linux server as root or with sudo
# ============================================================

set -e  # Exit on error

echo "==============================================="
echo "Asset Harmony - Remote PostgreSQL Setup"
echo "==============================================="
echo ""

# Configuration
DB_NAME="asset_harmony"
DB_USER="ams_user"
DB_PASSWORD=$(openssl rand -base64 16)  # Generate random password
SERVER_IP=$(hostname -I | awk '{print $1}')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root or with sudo"
    exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
else
    print_error "Cannot detect OS"
    exit 1
fi

print_status "Detected OS: $OS"

# Update system
print_status "Updating system packages..."
if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    apt update && apt upgrade -y
elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Fedora"* ]]; then
    yum update -y
else
    print_warning "Unknown OS, attempting to continue..."
fi

# Install PostgreSQL
print_status "Installing PostgreSQL..."
if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    apt install -y postgresql postgresql-contrib
    PG_VERSION=$(psql --version | grep -oP '\d+' | head -1)
    PG_CONFIG_DIR="/etc/postgresql/${PG_VERSION}/main"
    PG_DATA_DIR="/var/lib/postgresql/${PG_VERSION}/main"
elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Fedora"* ]]; then
    yum install -y postgresql-server postgresql-contrib
    postgresql-setup initdb
    PG_CONFIG_DIR="/var/lib/pgsql/data"
    PG_DATA_DIR="/var/lib/pgsql/data"
else
    print_error "Cannot install PostgreSQL automatically for this OS"
    exit 1
fi

# Start PostgreSQL
print_status "Starting PostgreSQL service..."
if command -v systemctl &> /dev/null; then
    systemctl start postgresql
    systemctl enable postgresql
else
    service postgresql start
fi

# Wait for PostgreSQL to be ready
sleep 2

# Configure PostgreSQL for remote access
print_status "Configuring PostgreSQL for remote access..."

# Backup original config files
cp ${PG_CONFIG_DIR}/postgresql.conf ${PG_CONFIG_DIR}/postgresql.conf.backup
cp ${PG_CONFIG_DIR}/pg_hba.conf ${PG_CONFIG_DIR}/pg_hba.conf.backup

# Update postgresql.conf
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" ${PG_CONFIG_DIR}/postgresql.conf || true
sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/" ${PG_CONFIG_DIR}/postgresql.conf || true

# Add to pg_hba.conf for remote access
print_status "Configuring authentication..."
cat >> ${PG_CONFIG_DIR}/pg_hba.conf <<EOF

# Asset Harmony Remote Access
host    all             all             0.0.0.0/0               scram-sha-256
EOF

# Restart PostgreSQL
print_status "Restarting PostgreSQL..."
if command -v systemctl &> /dev/null; then
    systemctl restart postgresql
else
    service postgresql restart
fi

# Create database and user
print_status "Creating database and user..."
su - postgres -c "psql <<EOF
CREATE DATABASE ${DB_NAME};
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
EOF"

# Configure firewall
print_status "Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 5432/tcp
    print_status "UFW firewall configured"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=5432/tcp
    firewall-cmd --reload
    print_status "firewalld configured"
elif command -v iptables &> /dev/null; then
    iptables -A INPUT -p tcp --dport 5432 -j ACCEPT
    # Save rules (varies by OS)
    if [ -f /etc/debian_version ]; then
        apt install -y iptables-persistent
        netfilter-persistent save
    fi
    print_status "iptables configured"
else
    print_warning "Could not detect firewall, please configure manually"
fi

# Download and install schema
print_status "Downloading database schema..."
cd /tmp
curl -o schema.sql https://raw.githubusercontent.com/sam7399/asset-harmony/main/supabase_complete_schema.sql 2>/dev/null || wget -q -O schema.sql https://raw.githubusercontent.com/sam7399/asset-harmony/main/supabase_complete_schema.sql

if [ -f schema.sql ]; then
    print_status "Installing database schema..."
    su - postgres -c "psql -d ${DB_NAME} -f /tmp/schema.sql" || print_warning "Schema installation had warnings"
else
    print_error "Could not download schema file"
fi

# Create verification file
print_status "Creating verification script..."
cat > /tmp/verify_setup.sql <<'EOF'
-- Verify setup
SELECT 'DATABASE TABLES' as check_type;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

SELECT 'TABLE COUNTS' as check_type;
SELECT 'companies' as table_name, count(*) as rows FROM companies
UNION ALL SELECT 'assets', count(*) FROM assets
UNION ALL SELECT 'employees', count(*) FROM employees
UNION ALL SELECT 'profiles', count(*) FROM profiles
UNION ALL SELECT 'user_roles', count(*) FROM user_roles;

SELECT 'RLS POLICIES' as check_type;
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' LIMIT 5;
EOF

# Create connection info file
cat > /root/db_connection_info.txt <<EOF
===============================================
DATABASE CONNECTION INFORMATION
===============================================

Database Name: ${DB_NAME}
Username: ${DB_USER}
Password: ${DB_PASSWORD}
Host: ${SERVER_IP}
Port: 5432

Connection String:
postgresql://${DB_USER}:${DB_PASSWORD}@${SERVER_IP}:5432/${DB_NAME}

pgAdmin/psql:
Host: ${SERVER_IP}
Port: 5432
Database: ${DB_NAME}
Username: ${DB_USER}
Password: ${DB_PASSWORD}

===============================================
IMPORTANT: SAVE THIS INFORMATION!
===============================================
EOF

chmod 600 /root/db_connection_info.txt

# Display summary
echo ""
echo "==============================================="
echo "SETUP COMPLETE!"
echo "==============================================="
echo ""
echo "Database Name: ${DB_NAME}"
echo "Username: ${DB_USER}"
echo "Password: ${DB_PASSWORD}"
echo "Host: ${SERVER_IP}"
echo "Port: 5432"
echo ""
echo "Connection String:"
echo "postgresql://${DB_USER}:${DB_PASSWORD}@${SERVER_IP}:5432/${DB_NAME}"
echo ""
echo "Full connection details saved to: /root/db_connection_info.txt"
echo ""
echo "Next Steps:"
echo "1. Export data from Supabase using export_from_supabase.sql"
echo "2. Import data to this server"
echo "3. Update your app with the connection string above"
echo "4. Run verification: su - postgres -c 'psql -d ${DB_NAME} -f /tmp/verify_setup.sql'"
echo ""
echo "==============================================="
echo ""

# Display warning about security
echo "==============================================="
print_warning "SECURITY RECOMMENDATIONS:"
echo "1. This setup allows connections from ANY IP (0.0.0.0/0)"
echo "2. For production, restrict to your specific IP in pg_hba.conf"
echo "3. Set up SSL certificates for encrypted connections"
echo "4. Configure firewall to only allow your IP"
echo "5. Install fail2ban to prevent brute force attacks"
echo "==============================================="
