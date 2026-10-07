# CONFIG — Job Search

## 1. Variáveis de ambiente

`backend/.env.example`:

    DATABASE_URL=
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=
    DB_USER=
    DB_PASSWORD=
    PORT=3333
    API_ACCESS_TOKEN=
    BRAVE_SEARCH_API_KEY=

Prefere `DATABASE_URL`. Na ausência, usa `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

`frontend/.env.local`:

    API_BACKEND_URL=https://job-search-api-xap1.onrender.com
    API_ACCESS_TOKEN=
    APP_USER=
    APP_PASSWORD=

## 2. Segredos

Nunca registrar no Git: `API_ACCESS_TOKEN`, `BRAVE_SEARCH_API_KEY`, senha PostgreSQL, `APP_PASSWORD`, URL de banco com credenciais. `.env`, `.env.local` e `.env.neon` estão no `.gitignore`.

## 3. Dependências

Backend runtime: Node.js, TypeScript, Express 5.2.1, `pg` 8.23.0, Cheerio 1.2.0, dotenv 17.4.2, Mammoth 1.12.1, Multer 2.2.0, pdf-parse 2.4.5.

Backend dev: TypeScript 7.0.2, tsx 4.23.12.

Frontend: Next.js 16.3.0, React 19.2.8, React DOM 19.2.8, Lucide React 1.31.0, Tailwind CSS 4, ESLint 9, TypeScript 5.

Node.js: sem `engines` declarado. Ambiente: 24.13.1.

## 4. Scripts

Raiz: `npm run format`, `npm run format:check`.

Backend: `dev`, `build`, `start`, `test`, `test:watch`, `test:typecheck`, `sync`, `diagnose`.

Frontend: `dev`, `build`, `start`, `lint`.

## 5. Banco de dados

PostgreSQL (Neon em produção, Postgres local em dev).

Migrations `001` a `015`:

- `jobs` — oportunidades.
- `job_matches` — análise local.
- `perfil_profissional` — perfil singleton JSONB.
- `fontes_ats` — ATS aprendidos + contadores de produtividade.
- `controle_busca_web` — cache/orçamento Brave.
- `estado_sincronizacao` — estado da sync.
- `funil_telemetria` — contadores por execução/fonte.

Campos centrais de `jobs`: `id`, `source`, `external_id`, `company`, `title`, `description`, `location`, `remote`, `workplace_type`, `url`, `published_at`, `created_at`, `partial`, `source_key`, `last_seen_at`, `unavailable_at`, `content_hash`.

Unique por `source + external_id`.

## 6. Deploy

    Vercel (frontend Next.js)
       ↓
    Render (backend Express: job-search-api-xap1)
       ↓
    Neon PostgreSQL

Vercel usa `API_BACKEND_URL`, `API_ACCESS_TOKEN`, `APP_USER`, `APP_PASSWORD` e encaminha para o Render.

Render usa `DATABASE_URL` (Neon), `API_ACCESS_TOKEN`, `BRAVE_SEARCH_API_KEY`, `NODE_VERSION`, `TZ`.

Vercel só encaminha requisições. Quem executa coleta é o Render.

## 7. Setup básico

    npm ci
    cd backend && npm ci
    cd ../frontend && npm ci

Aplicar migrations em ordem no banco de destino.

## 8. Validação

    # raiz
    npm run format
    npm run format:check

    # backend
    cd backend
    npm run test
    npm run test:typecheck
    npm run build

    # frontend
    cd ../frontend
    npm run lint
    npm run build
