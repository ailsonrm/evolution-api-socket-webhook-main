# Evolution API WebSocket Forwarder

🚀 Encaminha eventos do WebSocket da Evolution API para múltiplos webhooks configuráveis.

## 🎯 Features

- ✅ Suporte a múltiplas instâncias simultâneas
- ✅ Webhooks específicos por instância
- ✅ Webhooks globais (todas as instâncias)
- ✅ Sistema completo de logs configurável
- ✅ Retry automático em caso de falha
- ✅ Estatísticas em tempo real
- ✅ Health checks
- ✅ Docker ready
- ✅ Filtros de eventos por instância

## 📋 Requisitos

- Node.js 18+
- Docker e Docker Compose (opcional)
- Evolution API configurada

## 🚀 Quick Start

### Local (sem Docker)
```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações

# Executar
node src/index.js
```

### Docker
```bash
# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações

# Subir container
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

## ⚙️ Configuração

### Variáveis de Ambiente Mínimas
```env
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_api_key

INSTANCE_1_NAME=nome_da_instancia
INSTANCE_1_WEBHOOKS=https://webhook1.com,https://webhook2.com
```

### Múltiplas Instâncias
```env
INSTANCE_1_NAME=dev
INSTANCE_1_WEBHOOKS=https://webhook.site/dev-id

INSTANCE_2_NAME=producao
INSTANCE_2_WEBHOOKS=https://webhook.site/prod-id

INSTANCE_3_NAME=teste
INSTANCE_3_WEBHOOKS=https://webhook.site/test-id
```

### Webhooks Globais

Webhooks que recebem eventos de TODAS as instâncias:
```env
GLOBAL_WEBHOOKS=https://webhook.site/global,https://monitor.com/events
```

### Filtros de Eventos
```env
# Receber apenas mensagens
INSTANCE_1_EVENTS=messages.upsert

# Receber múltiplos eventos
INSTANCE_2_EVENTS=messages.upsert,messages.update,connection.update
```

### Configurações de Log
```env
LOG_LEVEL=info                    # silent, error, warn, info, debug, verbose
LOG_CONNECTION=true               # Logs de conexão WebSocket
LOG_EVENTS=true                   # Logs de eventos recebidos
LOG_FORWARDS=true                 # Logs de encaminhamentos
LOG_ERRORS=true                   # Logs de erros
LOG_PAYLOAD=false                 # Mostrar payload completo (verbose)
LOG_TO_FILE=false                 # Salvar logs em arquivo
LOG_STATS_INTERVAL=5              # Intervalo de stats (minutos)
```

Ver `.env.example` para todas as opções.

## 📡 Endpoints da API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/health` | GET | Health check e status |
| `/stats` | GET | Estatísticas globais |
| `/stats/:instance` | GET | Estatísticas por instância |
| `/stats/all/detailed` | GET | Estatísticas detalhadas |
| `/config` | GET | Configuração atual |
| `/instances` | GET | Status das instâncias |
| `/stats/reset` | POST | Resetar estatísticas |
| `/logs/config` | POST | Atualizar config de logs |

## 📊 Exemplos de Uso

### Health Check
```bash
curl http://localhost:3000/health
```

### Ver Estatísticas
```bash
curl http://localhost:3000/stats
```

### Ver Configuração
```bash
curl http://localhost:3000/config
```

### Atualizar Logs em Tempo Real
```bash
curl -X POST http://localhost:3000/logs/config \
  -H "Content-Type: application/json" \
  -d '{"level":"debug","payload":true}'
```

## 🐳 Deploy

### EasyPanel

1. Conecte este repositório no EasyPanel
2. Configure as variáveis de ambiente
3. Deploy!

### Docker Hub
```bash
docker build -t seu-usuario/evolution-webhook-forwarder .
docker push seu-usuario/evolution-webhook-forwarder
```

## 📝 Estrutura do Projeto
```
evolution-api-socket-webhook/
├── src/
│   ├── index.js              # Entry point
│   ├── config.js             # Configurações
│   ├── logger.js             # Sistema de logs
│   ├── forwarder.js          # Encaminhamento de eventos
│   ├── websocket.js          # Cliente WebSocket
│   └── instance-manager.js   # Gerenciador de instâncias
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

## 🔧 Troubleshooting

### WebSocket não conecta

- Verifique se a URL da Evolution API está correta
- Verifique se a instância existe e está ativa
- Verifique se a API Key está correta

### Webhooks não recebem eventos

- Verifique se a URL do webhook está acessível
- Verifique os logs para ver se há erros
- Teste o webhook diretamente com curl

### Logs não aparecem

- Verifique o nível de log: `LOG_LEVEL`
- Verifique se os tipos de log estão habilitados
- Use `LOG_LEVEL=verbose` para debug

## 📄 Licença

Private - Todos os direitos reservados

## 👤 Autor

Jefinho

---

**Nota:** Este é um projeto privado. Não compartilhe as credenciais ou configurações.