#!/bin/bash
set -e

DB_NAME="livestream_db"
DB_USER="livestream_user"
DB_PASSWORD=$(openssl rand -base64 32)

echo "🗄️ Creating database..."
echo "Password: $DB_PASSWORD"
echo ""

sudo -u postgres psql << EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END \$\$;

SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

echo "✅ Database created!"
echo ""
echo "Copy this to backend/.env:"
echo "DATABASE_URL=\"postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME\""