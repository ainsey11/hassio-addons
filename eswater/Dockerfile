ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js and Playwright dependencies
RUN \
    set -x \
    && apk add --no-cache \
        nodejs \
        npm \
        chromium \
        nss \
        freetype \
        freetype-dev \
        harfbuzz \
        ca-certificates \
        ttf-freefont \
    && rm -rf /var/cache/apk/*

# Copy addon files
COPY package*.json ./
COPY index.js ./
COPY run.sh ./
COPY functions/ ./functions/
COPY utils/ ./utils/
COPY translations/ ./translations/

# Install npm dependencies
RUN npm install --only=production

# Set Playwright environment variables to use system Chromium
ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Make run script executable
RUN chmod +x ./run.sh

CMD [ "./run.sh" ]
