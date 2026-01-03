#!/bin/bash
# Setup addon for local development
# This creates a bind mount so changes in your git repo are immediately reflected

set -e

echo "Setting up local addon for development..."

# Wait for supervisor to be ready
sleep 3

# Setup for ilert addon
echo "Setting up ilert addon..."
# Remove any existing symlink
docker exec hassio_supervisor rm -f /data/addons/local/ilert 2>/dev/null || true

# Create a bind mount inside the supervisor container
# This makes your git repo addon appear at the expected location without copying
docker exec --privileged hassio_supervisor sh -c "
    mkdir -p /data/addons/local/ilert && \
    mount --bind /data/addons/local/hassio-addons/ilert /data/addons/local/ilert && \
    echo 'ilert bind mount created successfully'
" || echo "Warning: Could not create ilert bind mount. Trying symlink..."

# Fallback: if bind mount fails, try symlink
if ! docker exec hassio_supervisor mountpoint -q /data/addons/local/ilert 2>/dev/null; then
    echo "ilert bind mount failed, using symlink fallback..."
    docker exec hassio_supervisor ln -sf hassio-addons/ilert /data/addons/local/ilert
fi

# Setup for azure-ddns addon
echo "Setting up azure-ddns addon..."
# Remove any existing symlink
docker exec hassio_supervisor rm -f /data/addons/local/azure-ddns 2>/dev/null || true

# Create a bind mount inside the supervisor container
docker exec --privileged hassio_supervisor sh -c "
    mkdir -p /data/addons/local/azure-ddns && \
    mount --bind /data/addons/local/hassio-addons/azure-ddns /data/addons/local/azure-ddns && \
    echo 'azure-ddns bind mount created successfully'
" || echo "Warning: Could not create azure-ddns bind mount. Trying symlink..."

# Fallback: if bind mount fails, try symlink
if ! docker exec hassio_supervisor mountpoint -q /data/addons/local/azure-ddns 2>/dev/null; then
    echo "azure-ddns bind mount failed, using symlink fallback..."
    docker exec hassio_supervisor ln -sf hassio-addons/azure-ddns /data/addons/local/azure-ddns
fi

# Setup for eswater addon
echo "Setting up eswater addon..."
# Remove any existing symlink
docker exec hassio_supervisor rm -f /data/addons/local/eswater 2>/dev/null || true

# Create a bind mount inside the supervisor container
docker exec --privileged hassio_supervisor sh -c "
    mkdir -p /data/addons/local/eswater && \
    mount --bind /data/addons/local/hassio-addons/eswater /data/addons/local/eswater && \
    echo 'eswater bind mount created successfully'
" || echo "Warning: Could not create eswater bind mount. Trying symlink..."

# Fallback: if bind mount fails, try symlink
if ! docker exec hassio_supervisor mountpoint -q /data/addons/local/eswater 2>/dev/null; then
    echo "eswater bind mount failed, using symlink fallback..."
    docker exec hassio_supervisor ln -sf hassio-addons/eswater /data/addons/local/eswater
fi

# Reload store to detect the addons
echo "Reloading addon store..."
ha store reload

echo "Done! Your addons should now be detected as 'local_ilert', 'local_azure-ddns', and 'local_eswater'"
echo "Run 'ha addons info local_ilert', 'ha addons info local_azure-ddns', or 'ha addons info local_eswater' to verify"
