FROM node:18-alpine

# Define o diretório de trabalho
WORKDIR /app

# Instala dependências do sistema
RUN apk add --no-cache tzdata

# Define timezone
ENV TZ=America/Sao_Paulo
ENV NODE_ENV=production

# Copia arquivos de dependências
COPY package*.json ./

# Instala dependências
RUN npm ci --only=production && npm cache clean --force

# Copia código fonte
COPY src ./src

# Cria diretório de logs
RUN mkdir -p logs && chmod 777 logs

# Expõe porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Comando de início
CMD ["node", "src/index.js"]