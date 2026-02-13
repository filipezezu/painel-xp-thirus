# Painel de XP - Thirus 2D

Painel de monitoramento em tempo real de XP e Level dos jogadores do Thirus 2D RPG.

## Como funciona

- A cada 1 minuto, um **Cron Job da Vercel** aciona o endpoint `/api/scrape`
- O scraper busca o **ranking** (5 páginas) e a **lista de jogadores online**
- Cruza os dados: identifica jogadores online que estão no ranking
- Calcula **ganho/perda de XP** entre cada ciclo
- Armazena tudo no **MongoDB Atlas** (gratuito)

## Setup - MongoDB Atlas (Gratuito)

1. Acesse [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Crie uma conta gratuita
3. Crie um Cluster (Free Tier - M0 Sandbox)
4. Vá em **Database Access** → Adicione um usuário com senha
5. Vá em **Network Access** → Adicione `0.0.0.0/0` (acesso de qualquer IP)
6. Clique em **Connect** → **Drivers** → Copie a Connection String
7. A string será algo como:
   ```
   mongodb+srv://USUARIO:SENHA@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Setup - Variáveis de Ambiente

### Local (.env.local)
```
MONGODB_URI=mongodb+srv://USUARIO:SENHA@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
CRON_SECRET=qualquer_string_secreta_aqui
```

### Na Vercel (Environment Variables)
Configure as mesmas variáveis no dashboard da Vercel:
- `MONGODB_URI` → sua connection string do MongoDB Atlas
- `CRON_SECRET` → uma chave secreta para proteger o endpoint de scraping

## Desenvolvimento Local

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`

Para testar o scraping manualmente:
```
GET http://localhost:3000/api/scrape
```

## Deploy na Vercel

1. Suba o código no GitHub
2. Vá em [vercel.com](https://vercel.com) → Import Project
3. Conecte o repositório
4. Configure as **Environment Variables** (MONGODB_URI e CRON_SECRET)
5. Deploy!

O cron job (`vercel.json`) vai executar automaticamente a cada 1 minuto.

> **Nota:** Cron jobs na Vercel free tier rodam no mínimo a cada 1 minuto. No plano Pro, pode ser mais frequente.

## Estrutura

```
├── lib/
│   ├── mongodb.js       # Conexão com MongoDB Atlas
│   └── scraper.js       # Funções de scraping do site
├── pages/
│   ├── index.js         # Dashboard frontend (React)
│   └── api/
│       ├── scrape.js    # Cron job - coleta dados
│       ├── status.js    # Status atual
│       ├── tracked.js   # Jogadores rastreados
│       ├── snapshots.js # Snapshots históricos
│       └── history/
│           └── [name].js # Histórico de um jogador
├── vercel.json          # Config de cron jobs
├── .env.local           # Variáveis de ambiente (local)
└── README.md
```
