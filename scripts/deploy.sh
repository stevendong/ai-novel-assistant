#!/bin/bash
# Quick deployment script for AI Novel Assistant
# Supports multiple deployment targets

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 AI Novel Assistant Deployment Script${NC}"
echo "=========================================="
echo ""

# Show deployment options
show_help() {
    echo "Usage: $0 [target]"
    echo ""
    echo "Targets:"
    echo "  railway    Deploy to Railway.app"
    echo "  render     Deploy to Render.com"
    echo "  docker     Build and run with Docker"
    echo "  local      Deploy locally with PM2"
    echo "  check      Run pre-deployment checks only"
    echo ""
    echo "Examples:"
    echo "  $0 railway"
    echo "  $0 docker"
    echo "  $0 check"
}

# Run pre-deployment checks
run_checks() {
    echo -e "${YELLOW}Running pre-deployment checks...${NC}"
    if [ -f "./scripts/pre-deploy-check.sh" ]; then
        bash ./scripts/pre-deploy-check.sh
    else
        echo -e "${RED}Warning: pre-deploy-check.sh not found${NC}"
        echo "Skipping checks..."
    fi
}

# Deploy to Railway
deploy_railway() {
    echo -e "${BLUE}Deploying to Railway...${NC}"
    echo ""

    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
        echo -e "${RED}Railway CLI not found!${NC}"
        echo "Install it with: npm install -g @railway/cli"
        echo "Or visit: https://docs.railway.app/develop/cli"
        exit 1
    fi

    # Check if project is linked
    if [ ! -f ".railway/config.json" ]; then
        echo "Project not linked to Railway."
        echo "Run: railway link"
        exit 1
    fi

    echo "Building project..."
    npm run build

    echo ""
    echo "Deploying to Railway..."
    railway up

    echo ""
    echo -e "${GREEN}✅ Deployed to Railway!${NC}"
    echo "View your deployment: railway open"
}

# Deploy to Render
deploy_render() {
    echo -e "${BLUE}Deploying to Render...${NC}"
    echo ""

    # Render uses Blueprint (render.yaml) for deployment
    # Just need to push to git

    echo "Checking git status..."
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}You have uncommitted changes.${NC}"
        read -p "Commit and push? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "Enter commit message: " commit_msg
            git add .
            git commit -m "$commit_msg"
        else
            echo "Deployment cancelled."
            exit 1
        fi
    fi

    echo "Pushing to git..."
    git push

    echo ""
    echo -e "${GREEN}✅ Code pushed to git!${NC}"
    echo "Render will automatically deploy from your connected repository."
    echo "Visit https://dashboard.render.com/ to monitor deployment."
}

# Deploy with Docker
deploy_docker() {
    echo -e "${BLUE}Building and running with Docker...${NC}"
    echo ""

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker not found!${NC}"
        echo "Install Docker from: https://docs.docker.com/get-docker/"
        exit 1
    fi

    # Check for .env file
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}Warning: .env file not found${NC}"
        read -p "Create from .env.example? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp .env.example .env
            echo "Please edit .env file with your configuration"
            exit 1
        fi
    fi

    echo "Building Docker image..."
    docker-compose build

    echo ""
    echo "Starting container..."
    docker-compose up -d

    echo ""
    echo "Waiting for application to start..."
    sleep 5

    # Show status
    docker-compose ps

    echo ""
    echo -e "${GREEN}✅ Docker deployment completed!${NC}"
    echo ""
    echo "Useful commands:"
    echo "  View logs: docker-compose logs -f"
    echo "  Stop: docker-compose down"
    echo "  Restart: docker-compose restart"
    echo ""
    echo "Application should be running at: http://localhost:3001"
}

# Deploy locally with PM2
deploy_local() {
    echo -e "${BLUE}Deploying locally with PM2...${NC}"
    echo ""

    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        echo "PM2 not found. Installing..."
        npm install -g pm2
    fi

    # Install dependencies
    echo "Installing dependencies..."
    npm install

    # Build frontend
    echo "Building frontend..."
    npm run build

    # Setup database
    echo "Setting up database..."
    npm run db:push

    # Stop existing instance if running
    pm2 delete ai-novel-assistant 2>/dev/null || true

    # Start with PM2
    echo "Starting application with PM2..."
    cd server
    pm2 start index.js --name ai-novel-assistant

    # Save PM2 configuration
    pm2 save

    # Setup startup script
    pm2 startup

    echo ""
    echo -e "${GREEN}✅ Local deployment completed!${NC}"
    echo ""
    echo "Useful commands:"
    echo "  View logs: pm2 logs ai-novel-assistant"
    echo "  Stop: pm2 stop ai-novel-assistant"
    echo "  Restart: pm2 restart ai-novel-assistant"
    echo "  Status: pm2 status"
    echo ""
    echo "Application running at: http://localhost:3001"
}

# Main script
TARGET="${1:-}"

case "$TARGET" in
    railway)
        run_checks
        deploy_railway
        ;;
    render)
        run_checks
        deploy_render
        ;;
    docker)
        run_checks
        deploy_docker
        ;;
    local)
        run_checks
        deploy_local
        ;;
    check)
        run_checks
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Error: Invalid or missing target${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
