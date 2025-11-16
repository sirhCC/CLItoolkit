#!/bin/bash

# Demo Script for Environment Configuration Manager
# Shows the tool in action with a realistic workflow

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Environment Configuration Manager - Demo Script       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

ENV_MANAGER="node dist/examples/real-world/env-manager.js"

echo "📋 Step 1: Show help"
$ENV_MANAGER
echo ""
sleep 2

echo "🚀 Step 2: Create development environment"
$ENV_MANAGER create dev
echo ""
sleep 2

echo "🔧 Step 3: Add some environment variables"
$ENV_MANAGER set dev DATABASE_URL postgres://localhost:5432/myapp_dev
$ENV_MANAGER set dev API_KEY dev_abc123xyz
$ENV_MANAGER set dev LOG_LEVEL debug
$ENV_MANAGER set dev PORT 3000
echo ""
sleep 2

echo "🚀 Step 4: Create staging environment (copying from dev)"
$ENV_MANAGER create staging --copy-from dev
echo ""
sleep 2

echo "🔧 Step 5: Update staging variables"
$ENV_MANAGER set staging DATABASE_URL postgres://staging.example.com:5432/myapp
$ENV_MANAGER set staging API_KEY staging_xyz789abc
$ENV_MANAGER set staging LOG_LEVEL info
echo ""
sleep 2

echo "📦 Step 6: List all environments (verbose)"
$ENV_MANAGER list --verbose
echo ""
sleep 2

echo "📤 Step 7: Export development environment as bash script"
$ENV_MANAGER export dev -f bash
echo ""
sleep 2

echo "📤 Step 8: Export staging environment to file"
$ENV_MANAGER export staging -o .env.staging -f bash
echo ""
sleep 1

echo "✅ Demo complete! Configuration saved to env-config.json"
echo ""
echo "Try it yourself:"
echo "  $ENV_MANAGER create prod"
echo "  $ENV_MANAGER set prod DATABASE_URL postgres://prod.example.com/myapp"
echo "  $ENV_MANAGER export prod -f docker"
echo ""
