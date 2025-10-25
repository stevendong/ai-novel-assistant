#!/bin/bash
# Pre-deployment checklist script
# Run this before deploying to catch common issues

set -e

echo "🚀 Pre-deployment Check for AI Novel Assistant"
echo "=============================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check counter
PASSED=0
FAILED=0
WARNINGS=0

# Function to print status
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

# 1. Check Node.js version
echo "1. Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 20 ]; then
    check_pass "Node.js version is $NODE_VERSION (>= 20)"
else
    check_fail "Node.js version is $NODE_VERSION (< 20)"
fi

# 2. Check npm version
echo "2. Checking npm version..."
NPM_VERSION=$(npm --version | cut -d'.' -f1)
if [ "$NPM_VERSION" -ge 9 ]; then
    check_pass "npm version is $NPM_VERSION (>= 9)"
else
    check_warn "npm version is $NPM_VERSION (< 9)"
fi

# 3. Check if .env exists
echo "3. Checking environment configuration..."
if [ -f "server/.env" ]; then
    check_pass ".env file exists"

    # Check for required variables
    if grep -q "OPENAI_API_KEY" server/.env && ! grep -q "OPENAI_API_KEY=your_openai_api_key_here" server/.env; then
        check_pass "OPENAI_API_KEY is configured"
    else
        check_fail "OPENAI_API_KEY is not configured"
    fi

    if grep -q "JWT_SECRET" server/.env && ! grep -q "JWT_SECRET=your-super-secret" server/.env; then
        check_pass "JWT_SECRET is configured"
    else
        check_warn "JWT_SECRET might not be configured properly"
    fi
else
    check_fail ".env file not found"
fi

# 4. Check if dependencies are installed
echo "4. Checking dependencies..."
if [ -d "node_modules" ]; then
    check_pass "Root dependencies installed"
else
    check_fail "Root dependencies not installed (run: npm install)"
fi

if [ -d "server/node_modules" ]; then
    check_pass "Server dependencies installed"
else
    check_fail "Server dependencies not installed"
fi

if [ -d "client/node_modules" ]; then
    check_pass "Client dependencies installed"
else
    check_fail "Client dependencies not installed"
fi

# 5. Check Prisma setup
echo "5. Checking Prisma setup..."
if [ -f "server/prisma/schema.prisma" ]; then
    check_pass "Prisma schema exists"
else
    check_fail "Prisma schema not found"
fi

if [ -d "server/node_modules/.prisma" ] || [ -d "server/node_modules/@prisma/client" ]; then
    check_pass "Prisma client generated"
else
    check_warn "Prisma client might not be generated (run: npm run db:push)"
fi

# 6. Try to build the project
echo "6. Testing build process..."
echo "   Building client..."
if npm run build --workspace=client > /dev/null 2>&1; then
    check_pass "Client build successful"
else
    check_fail "Client build failed"
fi

# 7. Check build output
if [ -d "client/dist" ] && [ "$(ls -A client/dist)" ]; then
    check_pass "Client build output exists"
else
    check_fail "Client build output is empty or missing"
fi

# 8. Check Git status
echo "8. Checking Git status..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    check_pass "Git repository detected"

    if [ -z "$(git status --porcelain)" ]; then
        check_pass "Working directory is clean"
    else
        check_warn "You have uncommitted changes"
        echo "   Run 'git status' to see changes"
    fi
else
    check_warn "Not a git repository"
fi

# 9. Check for Docker setup (if using Docker)
echo "9. Checking Docker configuration..."
if [ -f "Dockerfile" ]; then
    check_pass "Dockerfile exists"
else
    check_warn "Dockerfile not found (only needed for Docker deployment)"
fi

if [ -f "docker-compose.yml" ]; then
    check_pass "docker-compose.yml exists"
else
    check_warn "docker-compose.yml not found (only needed for Docker deployment)"
fi

# 10. Check deployment configuration files
echo "10. Checking deployment configurations..."
if [ -f "railway.toml" ]; then
    check_pass "Railway configuration exists"
else
    check_warn "railway.toml not found (only needed for Railway)"
fi

if [ -f "render.yaml" ]; then
    check_pass "Render configuration exists"
else
    check_warn "render.yaml not found (only needed for Render)"
fi

# Print summary
echo ""
echo "=============================================="
echo "Summary:"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
fi
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
fi
echo "=============================================="

# Exit with error if any critical checks failed
if [ $FAILED -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ Pre-deployment check failed!${NC}"
    echo "Please fix the issues above before deploying."
    exit 1
else
    echo ""
    echo -e "${GREEN}✅ All critical checks passed!${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}Note: There are some warnings, but you can proceed.${NC}"
    fi
    echo "You're ready to deploy!"
    exit 0
fi
