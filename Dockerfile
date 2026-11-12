FROM node:22.15-bookworm-slim
WORKDIR /app
COPY package.json ./
COPY db.mjs server.mjs ./
COPY public ./public
COPY scripts ./scripts
RUN chmod +x scripts/start.sh && mkdir -p /app/data /app/vendor
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/checklist.db
EXPOSE 3000
CMD ["npm", "start"]
