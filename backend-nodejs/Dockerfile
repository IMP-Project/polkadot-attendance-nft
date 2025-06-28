FROM node:18-alpine

# Install OpenSSL and other dependencies for Prisma and Polkadot
RUN apk add --no-cache openssl python3 make g++ libc6-compat

# Install Chromium dependencies for Puppeteer (let puppeteer download its own chromium)
RUN apk add --no-cache \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    udev \
    xvfb

# Don't skip chromium download - let puppeteer handle it
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for development)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 3001

# Start with inline command
CMD ["sh", "-c", "until npx prisma db push --skip-generate; do echo 'Waiting for database...'; sleep 2; done && npm run dev"]