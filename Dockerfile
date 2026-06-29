FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY src/ ./src/
COPY tsconfig.json ./
RUN npm ci
RUN npx tsc --outDir dist
COPY web/package*.json ./web/
COPY web/ ./web/
RUN cd web && npm ci && npm run build
FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/web/dist ./web/dist
COPY scripts/ ./scripts/
RUN chmod +x scripts/*.sh
RUN mkdir -p data
ARG ADMIN_PASSWORD=admin123
ARG JWT_SECRET=
ARG TG_BOT_TOKEN=
ARG TG_CHAT_ID=
ENV ADMIN_PASSWORD=$ADMIN_PASSWORD
ENV JWT_SECRET=$JWT_SECRET
ENV TG_BOT_TOKEN=$TG_BOT_TOKEN
ENV TG_CHAT_ID=$TG_CHAT_ID
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/index.js"]
