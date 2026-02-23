(see code for beautiful version)

Overview:
В данном проекте рассматривается задача El-farol: ситуация в которой пользователи с различными стратегиями и обладанием информацией выбирают идти им или не идти в бар (или какое-либо другое место) с потолком посещаемости. Например: есть 100 студентов ЭАДа, они думают идти им в бар в субботу или нет - при этом если в баре будет более 60 человек, то всем посетившим будет хуже, чем если бы они не шли. Раунды игры повторяются, анализируется оптимальность различных методов предсказания, общая полученная полезность относительно максимально возможной.

Реализация: 
Планируется создание telegram mini-app с бэкэндом на js & фронтендом на react + возможность интеграции бота с рассылкой для low commitment игры реальных пользователей. В приложении планируется создать "песочницу" по настройке модели (с возможностью создания кастомных агентов - путем вставления кода). Пользователь сможет выбирвать настройки бара, числа игроков, модели игроков, принимать личное участие в игре - и получать аналитику и визуализацию на основе заданных параметров. Для tg-бота планируется рассылка формата 1 раунд/день с низким коммитментом (идти/не идти) + предоставляемой информацией - игра будет вестись между пользователями бота, результаты - отображаться в приложении. 

##########################################################################################################################################################
Концепт взаимодействий:

┌───────────────────────────────────────────────────────────────┐
│                        Telegram Users                         │
│       (interact via Bot & Mini App inside Telegram)            │
└───────────────┬───────────────────────────────┬───────────────┘
                │                               │
     [Telegram Bot Service]             [Mini App (React)]
     - Sends “Go / Not go” polls         - Visualization (charts)
     - Collects decisions                - Config sandbox
     - Talks to Backend API              - Calls REST API
                │                               │
                └───────────────┬───────────────┘
                                │
                        [Backend API Server]
                (Fastify / Express + PostgreSQL + Redis)
                                │
          ┌─────────────────────┼────────────────────┐
          │                     │                    │
  [Simulation Engine]     [Analytics Service]   [Database Layer]
   - Runs El-Farol model    - Aggregates stats     - PostgreSQL
   - Executes agents code   - Generates insights  
   - Sandbox for user code
┌───────────────────────────────────────────────────────────────┐
│                        Telegram Users                         │
│       (interact via Bot & Mini App inside Telegram)            │
└───────────────┬───────────────────────────────┬───────────────┘
                │                               │
     [Telegram Bot Service]             [Mini App (React)]
     - Sends “Go / Not go” polls         - Visualization (charts)
     - Collects decisions                - Config sandbox
     - Talks to Backend API              - Calls REST API
                │                               │
                └───────────────┬───────────────┘
                                │
                        [Backend API Server]
                (Fastify / Express + PostgreSQL)
                                │
          ┌─────────────────────┼────────────────────┐
          │                     │                    │
  [Simulation Engine]     [Analytics Service]   [Database Layer]
   - Runs El-Farol model    - Aggregates stats     - PostgreSQL
   - Executes agents code   - Generates insights   
   - Sandbox for user code

##########################################################################################################################################################   
Концепт Архитектуры:

El-Farol/
│
├── package.json                 # root config (workspaces)
├── pnpm-lock.yaml
├── pnpm-workspace.yaml          # pnpm workspace config
├── tsconfig.json
├── .dockerignore                # Docker build exclusions
├── README.md
│
├── apps/
│   ├── backend/                 # Node.js hono backend
│   │   ├── package.json
│   │   ├── env.example
│   │   ├── prisma/
│   │   │   └── schema.prisma    # Prisma schema definition
│   │   └── src/
│   │       ├── index.ts         # app entrypoint
│   │       ├── server.ts        # hono app + routes registration
│   │       ├── routes/
│   │       │   ├── games.ts
│   │       │   ├── agents.ts
│   │       │   ├── rounds.ts
│   │       │   └── analytics.ts
│   │       ├── services/
│   │       │   ├── simulation_service.ts
│   │       │   ├── analytics_service.ts
│   │       │   └── telegram_service.ts
│   │       └── core/
│   │           ├── db/
│   │           │   ├── index.ts
│   │           │   ├── prisma.ts
│   │           │   ├── seed.ts
│   │           │   └── repositories/
│   │           │       ├── GameRepository.ts
│   │           │       └── RoundRepository.ts
│   │           └── simulation-engine/
│   │               ├── index.ts
│   │               ├── sandbox.ts
│   │               ├── stats.ts
│   │               └── models/
│   │                   ├── Agent.ts
│   │                   ├── AgentFactory.ts
│   │                   └── Game.ts
│   │
│   ├── bot/                      # Telegram bot service
│   │   ├── package.json
│   │   ├── env.example
│   │   └── src/
│   │       ├── index.ts          # bot entrypoint
│   │       ├── handlers/
│   │       │   ├── starts.ts
│   │       │   ├── decisions.ts
│   │       │   ├── results.ts
│   │       │   └── schedules.ts
│   │       └── utils/
│   │           ├── api_clients.ts
│   │           └── keyboards.ts
│   │
│   ├── frontend/                 # React + Vite + Tailwind Mini App
│   │   ├── package.json
│   │   ├── index.html            # HTML entry point
│   │   ├── vite.config.ts        # Vite config with API proxy
│   │   ├── tsconfig.json         # TypeScript config
│   │   ├── tailwind.config.js    # Tailwind CSS config
│   │   ├── postcss.config.js     # PostCSS config
│   │   └── src/
│   │       ├── index.css         # Tailwind directives + utilities
│   │       ├── main.tsx          # React entry point
│   │       ├── app.tsx           # Main App component
│   │       ├── components/
│   │       │   ├── gameconfig_form.tsx
│   │       │   ├── simulation_viz.tsx
│   │       │   ├── agent_editor.tsx
│   │       │   └── round_stats.tsx
│   │       └── api/
│   │           ├── client.ts
│   │           ├── games.ts
│   │           └── analytics.ts
│   │
│   └── shared/                   # Shared lib (types & utils)
│       ├── package.json
│       ├── index.ts
│       └── src/
│           ├── types/
│           │   ├── game.ts
│           │   ├── agent.ts
│           │   └── round.ts
│           └── utils/
│               └── random.ts
│
└── docker/
    ├── docker-compose.yaml       # All services orchestration
    ├── backend_dockerfile        # Multi-stage Node.js build
    ├── bot_dockerfile
    ├── frontend_dockerfile       # Multi-stage Vite build + nginx
    ├── nginx.conf                # SPA fallback + API proxy
    ├── env.example
    └── init.sql

Docker Commands:

# Setup
cd docker
cp env.example .env          

build/logs/stop
docker-compose up -d


docker-compose logs -f           # All services
docker-compose logs -f backend   # Backend only
docker-compose logs -f frontend  # Frontend only
docker-compose logs -f postgres  # Database only

docker-compose down

rebuild/restart/check status
docker-compose up -d --build

docker-compose build --no-cache && docker-compose up -d

docker-compose down -v && docker-compose up -d --build


docker-compose ps

# Db access
docker exec -it el_farol_postgres psql -U elfarol -d elfarol


PostgreSQL  5432          5434        localhost:5434        
Backend     3000          3001     http://localhost:3001  
Frontend    80 (nginx)    3002     http://localhost:3002  

Frontend nginx proxies /api/* requests to the backend container.
Frontend Commands (Local Development):

# install dependencies and frontend stuff
pnpm install


pnpm dev:frontend

cd apps/frontend && pnpm dev


pnpm build:frontend


cd apps/frontend && pnpm preview

cd apps/frontend && pnpm type-check

##############################################################
Running the Simulation Engine (API, curl examples):

The simulation engine runs inside the backend container. You drive it via the REST API.
Replace localhost:3001 with localhost:3000 if running the backend locally (pnpm dev:backend).

# 1. Create a game
curl -X POST http://localhost:3001/games \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Saturday Night",
    "config": {
      "capacity": 60,
      "numAgents": 100,
      "numRounds": 50
    }
  }'
# Response includes "id": "<GAME_ID>"  -- save it for the next steps.

# 2. Add agents to the game (batch)
#    builtInType options: "random", "threshold", "moving_average", "adaptive"
curl -X POST http://localhost:3001/games/<GAME_ID>/agents/batch \
  -H "Content-Type: application/json" \
  -d '{
    "agents": [
      { "name": "Random 1",  "type": "built_in", "builtInType": "random" },
      { "name": "Random 2",  "type": "built_in", "builtInType": "random" },
      { "name": "Thresh 1",  "type": "built_in", "builtInType": "threshold",      "parameters": { "threshold": 0.6, "goProbability": 0.8 } },
      { "name": "MA 1",      "type": "built_in", "builtInType": "moving_average", "parameters": { "windowSize": 5, "threshold": 0.6 } },
      { "name": "Adaptive 1","type": "built_in", "builtInType": "adaptive",       "parameters": { "initialThreshold": 0.6, "adaptationRate": 0.1 } }
    ]
  }'

# 3a. Run the entire simulation at once (all configured rounds)
curl -X POST http://localhost:3001/games/<GAME_ID>/simulate \
  -H "Content-Type: application/json" \
  -d '{}'
# Or run a specific number of rounds:  -d '{ "rounds": 20 }'

# 3b. Or step through one round at a time
#     First start the game:
curl -X PATCH http://localhost:3001/games/<GAME_ID>/status \
  -H "Content-Type: application/json" \
  -d '{ "status": "start" }'
#     Then advance one round:
curl -X POST http://localhost:3001/games/<GAME_ID>/rounds

# 4. Inspect results
curl http://localhost:3001/games/<GAME_ID>          # full game state
curl http://localhost:3001/games/<GAME_ID>/stats     # aggregated statistics
curl http://localhost:3001/rounds?gameId=<GAME_ID>   # round-by-round data

# Other useful endpoints
curl http://localhost:3001/games                     # list all games
curl http://localhost:3001/health                    # backend health check

##########################################################################################################################################################
Access Points Summary:

Environment Frontend Backend API  Notes                              

 Local Dev    http://localhost:5173  http://localhost:3001  Vite proxies /api to backend       
 Docker       http://localhost:3002  http://localhost:3001  nginx proxies /api to backend      



Frontend:
- React 18 + TypeScript
- Vite 6 (with SWC)
- Tailwind CSS 3
- nginx (production)

Backend:
- Node.js 22 + Hono
- Prisma ORM
- PostgreSQL 16

Build Tools:
- pnpm workspaces
- Docker multi-stage builds





References/Similar projects:
https://github.com/kennardmah/minority-game-theory-and-mechanism // An insightful exploration into the El Farol Bar problem through the lens of minority games, including single-shot static games, repeated static games, and repeated inductive games, culminating in a comprehensive final report.

https://eduardo-zambrano.github.io/documents/compufinal.pdf

https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://direct.mit.edu/isal/proceedings-pdf/isal2020/32/558/1908592/isal_a_00339.pdf&ved=2ahUKEwj8sf_guNOQAxW3HRAIHRiqGwU4FBAWegQIFRAB&usg=AOvVaw1IUSmzGA6rCjhnz19VpkYw //We take a unique approach to analyzing the problem by focusing on how the distribution of utilized strategies shifts over time

