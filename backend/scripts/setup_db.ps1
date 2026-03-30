param(
    [string]$PostgresUser = "postgres",
    [string]$NewDb = "vitabridge",
    [string]$NewUser = "vitabridge_user",
    [string]$NewPassword = "changeme"
)

Write-Host "This script will attempt to create database '$NewDb' and user '$NewUser' using the local 'psql' client."

# Prompt for postgres password interactively
$securePass = Read-Host -AsSecureString -Prompt "Enter password for PostgreSQL user '$PostgresUser' (will not be echoed)"
$plainPass = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass))

$env:PGPASSWORD = $plainPass

# Create database
$createDbCmd = "CREATE DATABASE \"$NewDb\";"
Write-Host "Creating database $NewDb..."
psql -U $PostgresUser -d postgres -c "$createDbCmd"

# Create user and grant privileges
$createUserCmd = "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$NewUser') THEN CREATE ROLE \"$NewUser\" WITH LOGIN PASSWORD '$NewPassword'; END IF; END $$;"
Write-Host "Creating/ensuring user $NewUser exists..."
psql -U $PostgresUser -d postgres -c "$createUserCmd"

$grantCmd = "GRANT ALL PRIVILEGES ON DATABASE \"$NewDb\" TO \"$NewUser\";"
Write-Host "Granting privileges to $NewUser on database $NewDb..."
psql -U $PostgresUser -d postgres -c "$grantCmd"

Write-Host "Cleaning up environment variable PGPASSWORD"
Remove-Item Env:PGPASSWORD

Write-Host "Done. If there were no errors above, the database and user should exist."
Write-Host "Now update your application properties or environment variables to use the new credentials:"
Write-Host "  SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/$NewDb"
Write-Host "  SPRING_DATASOURCE_USERNAME=$NewUser"
Write-Host "  SPRING_DATASOURCE_PASSWORD=$NewPassword"

Write-Host "Example: run in PowerShell"
Write-Host "  ./gradlew.bat bootRun"

exit 0
