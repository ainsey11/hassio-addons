ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js
RUN \
    set -x \
    && apk add --no-cache \
        nodejs \
        npm

# Copy addon files
COPY package*.json ./
COPY index.js ./
COPY run.sh ./

# Install npm dependencies
RUN npm ci --only=production

# Make run script executable
RUN chmod +x ./run.sh

CMD [ "./run.sh" ]
