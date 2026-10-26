# Build stage: install everything (TypeScript included) and compile src/ to dist/.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Runtime stage: only the compiled JavaScript and production dependencies.
# No TypeScript, tests or dev tools, so the image is smaller
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Don't run as root.
USER node
# Cloud Run will send traffic to $PORT server.ts reads it.
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/api/server.js"]