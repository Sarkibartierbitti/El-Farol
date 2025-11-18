(see code for beautiful version)

Overview:
В данном проекте рассматривается задача El-farol: ситуация в которой пользователи с различными стратегиями и обладанием информацией выбирают идти им или не идти в бар (или какое-либо другое место) с потолком посещаемости. 

Пример задачи:

Есть 100 студентов ЭАДа (агенты класса 1) и 100 студентов ПМИ (агенты класса 2). Рядом с вышкой есть бар, куда многие из этих студентов любят ходить в субботу. Вместимость бара - 120 человек. Это значит, что если ночью придет больше студентов, чем 120, то всем им будет некомфортно и они получат -1 полезности. Если же в баре окажется  меньше 120 человек, то все, кто пойдет - получат 1 полезности. Если же студент решает не идти, то он получает 0 полезности.
Каждую субботу разные студенты решают идти или нет - на основе предыдущих данных. Так, студенты пытаются каждый раз предугадать - стоит им идти или нет.
При этом, студенты ЭАДа и ПМИ могут обладать разными моделями (свойствами): например студенты ЭАДа могт обладать меньшей глубиной памяти (помнить данные за последние x суббот, в то время как ПМИ - за последние y суббот, где x < y) или другим предсказателем (например вместо сложной модели предсказания - просто идти всегда).

Для такой задачи мы расчитываем общую полезность, которую получили агенты, сравниваем с максимально возможной полезностью для данной модели, также можем сравнить исходы для разных агентов


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
├── pnpm-workspace.yaml
├── README.md
│
├── apps/
│   ├── backend/                 # Node.js Fastify / Express backend
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts         # app entrypoint
│   │   │   ├── server.ts        # Fastify app + routes registration
│   │   │   ├── routes/
│   │   │   │   ├── games.ts
│   │   │   │   ├── agents.ts
│   │   │   │   ├── rounds.ts
│   │   │   │   └── analytics.ts
│   │   │   ├── services/
│   │   │   │   ├── simulation.service.ts
│   │   │   │   ├── analytics.service.ts
│   │   │   │   └── telegram.service.ts
│   │   │   ├── core/
│   │   │   │   ├── simulation-engine/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── models/
│   │   │   │   │   │   ├── Agent.ts
│   │   │   │   │   │   └── Game.ts
│   │   │   │   │   └── sandbox.ts   # vm2 isolated execution
│   │   │   ├── db/
│   │   │   │   ├── index.ts         # db client (pg / Prisma)
│   │   │   │   ├── migrations/
│   │   │   │   └── seed.ts
│   │   │   └── utils/
│   │   │       ├── logger.ts
│   │   │       └── config.ts
│   │   └── .env.example
│   │
│   ├── bot/                      # Telegram bot service
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts          # bot entrypoint
│   │   │   ├── handlers/
│   │   │   │   ├── start.ts
│   │   │   │   ├── decisions.ts
│   │   │   │   ├── results.ts
│   │   │   │   └── schedule.ts
│   │   │   ├── middlewares/
│   │   │   └── utils/
│   │   │       ├── apiClient.ts  # communicates with backend
│   │   │       └── keyboards.ts
│   │   └── .env.example
│   │
│   ├── frontend/                 # React Mini App (Telegram WebApp)
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   │   ├── GameConfigForm.tsx
│   │   │   │   ├── SimulationViz.tsx
│   │   │   │   ├── AgentEditor.tsx   # Monaco Editor
│   │   │   │   ├── RoundStats.tsx
│   │   │   └── api/
│   │   │       ├── client.ts
│   │   │       ├── games.ts
│   │   │       └── analytics.ts
│   │   ├── public/
│   │   └── vite.config.ts
│   │
│   └── shared/                   # Optional shared lib (types & utils)
│       ├── package.json
│       ├── src/
│       │   ├── types/
│       │   │   ├── game.ts
│       │   │   ├── agent.ts
│       │   │   └── round.ts
│       │   └── utils/
│       │       └── random.ts
│       └── index.ts
│
└── docker/
    ├── docker-compose.yml
    ├── backend.Dockerfile
    ├── bot.Dockerfile
    ├── frontend.Dockerfile
    └── init.sql





References/Similar projects:
https://github.com/kennardmah/minority-game-theory-and-mechanism // An insightful exploration into the El Farol Bar problem through the lens of minority games, including single-shot static games, repeated static games, and repeated inductive games, culminating in a comprehensive final report.

https://eduardo-zambrano.github.io/documents/compufinal.pdf

https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://direct.mit.edu/isal/proceedings-pdf/isal2020/32/558/1908592/isal_a_00339.pdf&ved=2ahUKEwj8sf_guNOQAxW3HRAIHRiqGwU4FBAWegQIFRAB&usg=AOvVaw1IUSmzGA6rCjhnz19VpkYw //We take a unique approach to analyzing the problem by focusing on how the distribution of utilized strategies shifts over time

