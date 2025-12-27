#!/bin/bash
# Setup addon for local development
# This creates a bind mount so changes in your git repo are immediately reflected

set -e

echo "Setting up local addon for development..."

# Wait for supervisor to be ready
sleep 3

# Remove any existing symlink
docker exec hassio_supervisor rm -f /data/addons/local/ilert 2>/dev/null || true

# Create a bind mount inside the supervisor container
# This makes your git repo addon appear at the expected location without copying
docker exec --privileged hassio_supervisor sh -c "
    mkdir -p /data/addons/local/ilert && \
    mount --bind /data/addons/local/hassio-addons/ilert /data/addons/local/ilert && \
    echo 'Bind mount created successfully'
" || echo "Warning: Could not create bind mount. Trying symlink..."

# Fallback: if bind mount fails, try symlink
if ! docker exec hassio_supervisor mountpoint -q /data/addons/local/ilert 2>/dev/null; then
    echo "Bind mount failed, using symlink fallback..."
    docker exec hassio_supervisor ln -sf hassio-addons/ilert /data/addons/local/ilert
fi

# Reload store to detect the addon
echo "Reloading addon store..."
ha store reload

echo "Done! Your addon should now be detected as 'local_ilert'"
echo "Run 'ha addons info local_ilert' to verify"
