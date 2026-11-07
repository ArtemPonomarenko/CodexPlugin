FROM node:24-bookworm-slim
WORKDIR /app/chatgpt
COPY chatgpt/package.json chatgpt/package-lock.json ./
RUN npm ci --omit=dev
COPY chatgpt/src/ ./src/
COPY plugins/azure-devops/skills/ /app/plugins/azure-devops/skills/
ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["node", "src/main.js"]
