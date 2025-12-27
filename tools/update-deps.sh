#!/bin/bash

# Update Dependencies Script
# Updates npm dependencies and Docker base images for all addons

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

main() {
    print_info "Scanning for Node.js addons..."

    local addons_found=0

    for dir in */; do
        dir="${dir%/}"

        # Skip non-addon directories
        [[ "$dir" == .* ]] && continue
        [[ "$dir" == "node_modules" ]] && continue
        [[ "$dir" == "tools" ]] && continue
        [[ "$dir" == "docs" ]] && continue

        # Check if it's a Node.js addon
        if [ -f "$dir/package.json" ] && [ -f "$dir/config.yaml" ]; then
            print_info "Found Node.js addon: $dir"
            addons_found=$((addons_found + 1))

            # Update npm dependencies
            if [ -f "$dir/package.json" ]; then
                print_info "Updating npm dependencies for $dir..."
                (cd "$dir" && npm update)
                print_success "Updated $dir dependencies"
            fi

            # Check for outdated packages
            print_info "Checking for outdated packages in $dir..."
            (cd "$dir" && npm outdated || true)
        fi
    done

    if [ $addons_found -eq 0 ]; then
        print_warning "No Node.js addons found"
    else
        print_success "Processed $addons_found addon(s)"
        print_info "Run 'npm audit' in individual addon directories to check for security issues"
    fi
}

main "$@"