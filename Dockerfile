FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src

RUN npm run build

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
ENV STUDIO_DATA_DIR=/tmp/studio-data
ENV GOOGLE_GENAI_USE_VERTEXAI=1
ENV GOOGLE_CLOUD_PROJECT=vertex-ai-demos-468803
ENV GOOGLE_CLOUD_LOCATION=global
ENV VERTEX_LYRIA_LOCATION=us-central1

EXPOSE 8080

CMD ["npm", "start"]
