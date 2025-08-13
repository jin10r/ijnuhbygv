#!/bin/bash

# Configuration validation script for Roommate Finder App
# This script validates all configuration files before Docker deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

validate_file_exists() {
    local file_path=$1
    local description=$2
    
    if [[ -f "$file_path" ]]; then
        print_success "✓ $description exists: $file_path"
        return 0
    else
        print_error "✗ $description missing: $file_path"
        return 1
    fi
}

validate_docker_compose() {
    print_info "Validating docker-compose.yml..."
    
    local compose_file="$APP_ROOT/docker-compose.yml"
    
    if validate_file_exists "$compose_file" "Docker Compose file"; then
        # Check for required services
        local required_services=("mongodb" "backend" "frontend" "nginx")
        local all_services_found=true
        
        for service in "${required_services[@]}"; do
            if grep -q "^  $service:" "$compose_file"; then
                print_success "✓ Service '$service' defined"
            else
                print_error "✗ Service '$service' not found"
                all_services_found=false
            fi
        done
        
        if [[ "$all_services_found" == true ]]; then
            print_success "All required services are defined"
        else
            print_error "Some required services are missing"
            return 1
        fi
    else
        return 1
    fi
}

validate_env_file() {
    print_info "Validating .env file..."
    
    local env_file="$APP_ROOT/.env"
    
    if validate_file_exists "$env_file" "Environment file"; then
        local required_vars=("MONGO_URL" "TELEGRAM_BOT_TOKEN" "REACT_APP_BACKEND_URL")
        local all_vars_found=true
        
        for var in "${required_vars[@]}"; do
            if grep -q "^$var=" "$env_file"; then
                local value=$(grep "^$var=" "$env_file" | cut -d'=' -f2- | tr -d '"'"'"'"')
                if [[ -n "$value" && "$value" != "your_"*"_here" ]]; then
                    print_success "✓ $var is set"
                else
                    print_warning "⚠ $var needs to be configured"
                fi
            else
                print_error "✗ $var not found"
                all_vars_found=false
            fi
        done
        
        if [[ "$all_vars_found" == true ]]; then
            print_success "All required environment variables are present"
        else
            print_error "Some required environment variables are missing"
            return 1
        fi
    else
        return 1
    fi
}

validate_dockerfiles() {
    print_info "Validating Dockerfiles..."
    
    validate_file_exists "$APP_ROOT/backend/Dockerfile" "Backend Dockerfile"
    validate_file_exists "$APP_ROOT/frontend/Dockerfile" "Frontend Dockerfile"
}

validate_nginx_config() {
    print_info "Validating nginx configuration..."
    
    validate_file_exists "$APP_ROOT/docker/nginx/nginx.conf" "Nginx main config"
    validate_file_exists "$APP_ROOT/docker/nginx/default.conf" "Nginx default config"
    
    local nginx_config="$APP_ROOT/docker/nginx/default.conf"
    if [[ -f "$nginx_config" ]]; then
        if grep -q "upstream backend" "$nginx_config" && grep -q "upstream frontend" "$nginx_config"; then
            print_success "✓ Nginx upstreams configured correctly"
        else
            print_error "✗ Nginx upstreams not configured properly"
            return 1
        fi
        
        if grep -q "location /api/" "$nginx_config" && grep -q "location /" "$nginx_config"; then
            print_success "✓ Nginx routing configured correctly"
        else
            print_error "✗ Nginx routing not configured properly"
            return 1
        fi
    fi
}

validate_mongodb_init() {
    print_info "Validating MongoDB initialization..."
    
    validate_file_exists "$APP_ROOT/docker/mongodb/init-mongo.js" "MongoDB init script"
}

validate_scripts() {
    print_info "Validating helper scripts..."
    
    local scripts=(
        "$APP_ROOT/start.sh"
        "$APP_ROOT/docker/scripts/wait-for-it.sh"
        "$APP_ROOT/docker/scripts/health-check.sh"
    )
    
    for script in "${scripts[@]}"; do
        if validate_file_exists "$script" "Script $(basename "$script")"; then
            if [[ -x "$script" ]]; then
                print_success "✓ $(basename "$script") is executable"
            else
                print_warning "⚠ $(basename "$script") is not executable"
                print_info "  Run: chmod +x $script"
            fi
        fi
    done
}

validate_app_structure() {
    print_info "Validating application structure..."
    
    local required_dirs=(
        "$APP_ROOT/backend"
        "$APP_ROOT/frontend"
        "$APP_ROOT/docker"
        "$APP_ROOT/docker/nginx"
        "$APP_ROOT/docker/mongodb"
        "$APP_ROOT/docker/scripts"
    )
    
    for dir in "${required_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            print_success "✓ Directory exists: $(basename "$dir")"
        else
            print_error "✗ Directory missing: $dir"
            return 1
        fi
    done
    
    # Check key application files
    local app_files=(
        "$APP_ROOT/backend/server.py"
        "$APP_ROOT/backend/requirements.txt"
        "$APP_ROOT/frontend/package.json"
        "$APP_ROOT/frontend/src/App.js"
    )
    
    for file in "${app_files[@]}"; do
        validate_file_exists "$file" "App file $(basename "$file")"
    done
}

check_dependencies() {
    print_info "Checking for required dependencies..."
    
    # Check if Docker is available (optional)
    if command -v docker &> /dev/null; then
        print_success "✓ Docker is available"
        docker --version
    else
        print_warning "⚠ Docker not found (install before deployment)"
    fi
    
    # Check if Docker Compose is available (optional)
    if command -v docker-compose &> /dev/null; then
        print_success "✓ Docker Compose is available"
        docker-compose --version
    else
        print_warning "⚠ Docker Compose not found (install before deployment)"
    fi
}

generate_summary() {
    print_info "Generating configuration summary..."
    
    echo ""
    echo "=== CONFIGURATION SUMMARY ==="
    echo ""
    echo "Services configured:"
    echo "  • nginx (reverse proxy) - Port 80"
    echo "  • frontend (React) - Port 3000"  
    echo "  • backend (FastAPI) - Port 8001"
    echo "  • mongodb (Database) - Port 27017"
    echo ""
    echo "Network routing:"
    echo "  • ngrok → nginx:80 → frontend (/) or backend (/api)"
    echo "  • All services in 'roommate_network' Docker network"
    echo ""
    echo "Configuration files:"
    echo "  • Centralized .env file for all settings"
    echo "  • Docker Compose with health checks"
    echo "  • Nginx reverse proxy configuration"
    echo "  • MongoDB initialization script"
    echo ""
    echo "Management scripts:"
    echo "  • ./start.sh - Main management script"
    echo "  • ./docker/scripts/health-check.sh - Health monitoring"
    echo "  • ./docker/scripts/wait-for-it.sh - Service dependencies"
    echo ""
}

main() {
    echo "=== Roommate Finder App - Configuration Validation ==="
    echo ""
    
    local validation_failed=false
    
    # Run all validations
    if ! validate_app_structure; then validation_failed=true; fi
    if ! validate_docker_compose; then validation_failed=true; fi
    if ! validate_env_file; then validation_failed=true; fi
    if ! validate_dockerfiles; then validation_failed=true; fi
    if ! validate_nginx_config; then validation_failed=true; fi
    if ! validate_mongodb_init; then validation_failed=true; fi
    if ! validate_scripts; then validation_failed=true; fi
    
    echo ""
    check_dependencies
    
    echo ""
    if [[ "$validation_failed" == false ]]; then
        print_success "=== VALIDATION PASSED ==="
        print_info "Your Docker configuration is ready for deployment!"
        generate_summary
        
        echo ""
        print_info "Next steps:"
        echo "1. Install Docker and Docker Compose if not available"
        echo "2. Configure API keys in .env file"
        echo "3. Run: ./start.sh start"
        echo "4. Setup ngrok: ngrok http 80"
        
    else
        print_error "=== VALIDATION FAILED ==="
        print_error "Please fix the issues above before deployment"
        exit 1
    fi
}

main "$@"