#!/bin/bash

# Health check script for Roommate Finder App services

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    local service=$1
    local status=$2
    local message=$3
    
    if [ "$status" == "healthy" ]; then
        echo -e "${GREEN}✓${NC} $service: $message"
    elif [ "$status" == "warning" ]; then
        echo -e "${YELLOW}⚠${NC} $service: $message"
    else
        echo -e "${RED}✗${NC} $service: $message"
    fi
}

check_service() {
    local service_name=$1
    local url=$2
    local timeout=${3:-10}
    
    echo "Checking $service_name..."
    
    if curl -f -s --max-time $timeout "$url" > /dev/null 2>&1; then
        print_status "$service_name" "healthy" "Service is responding"
        return 0
    else
        print_status "$service_name" "error" "Service is not responding"
        return 1
    fi
}

check_database() {
    echo "Checking MongoDB..."
    
    if docker-compose exec -T mongodb mongosh --quiet --eval "db.adminCommand('ping')" roommate_app > /dev/null 2>&1; then
        print_status "MongoDB" "healthy" "Database is responding"
        return 0
    else
        print_status "MongoDB" "error" "Database is not responding"
        return 1
    fi
}

main() {
    echo "=== Roommate Finder App Health Check ==="
    echo ""
    
    local all_healthy=true
    
    # Check MongoDB
    if ! check_database; then
        all_healthy=false
    fi
    
    # Check Backend API
    if ! check_service "Backend API" "http://localhost/api/health"; then
        all_healthy=false
    fi
    
    # Check Frontend
    if ! check_service "Frontend" "http://localhost"; then
        all_healthy=false
    fi
    
    # Check individual services directly (internal network)
    echo ""
    echo "=== Internal Service Checks ==="
    
    if docker-compose ps | grep -q "backend.*Up"; then
        if ! check_service "Backend (internal)" "http://localhost:8001/api/health" 5; then
            print_status "Backend (internal)" "warning" "Internal service may have issues"
        fi
    else
        print_status "Backend Container" "error" "Container is not running"
        all_healthy=false
    fi
    
    if docker-compose ps | grep -q "frontend.*Up"; then
        if ! check_service "Frontend (internal)" "http://localhost:3000" 5; then
            print_status "Frontend (internal)" "warning" "Internal service may have issues"
        fi
    else
        print_status "Frontend Container" "error" "Container is not running"
        all_healthy=false
    fi
    
    echo ""
    if [ "$all_healthy" = true ]; then
        echo -e "${GREEN}=== All services are healthy! ===${NC}"
        echo -e "Access your app at: ${BLUE}http://localhost${NC}"
        exit 0
    else
        echo -e "${RED}=== Some services have issues ===${NC}"
        echo "Run 'docker-compose logs' to check for errors"
        exit 1
    fi
}

main "$@"