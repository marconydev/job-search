# CONFIG — Job Search

## 1. Variáveis de ambiente

backend/.env.example:

    DATABASE_URL=
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=
    DB_USER=
    DB_PASSWORD=
    PORT=3333
    API_ACCESS_TOKEN=
    BRAVE_SEARCH_API_KEY=

A aplicação prefere DATABASE_URL. Na ausência dela, usa DB_HOST, DB_PORT, DB_NAME, DB_USER e DB_PASSWORD.

frontend/.env.example:

    API_BACKEND_URL=http://localhost:3333
    API_ACCESS_TOKEN=
    APP_USER=
    APP_PASSWORD=

## 2. Segredos

Nunca registrar no Git: API_ACCESS_TOKEN, BRAVE_SEARCH_API_KEY, senha PostgreSQL, APP_PASSWORD, URL de banco com credenciais.

## 3. Dependências

Backend runtime: Node.js, TypeScript, Express 5.2.1, pg 8.23.0, Cheerio 1.2.0, dotenv 17.4.2, Mammoth 1.12.1, Multer 2.2.0, pdf-parse 2.4.5.

Backend dev: TypeScript 7.0.2, tsx 4.23.12, tipos Node/Express/Multer/pg.

Frontend: Next.js 16.3.0, React 19.2.8, React DOM 19.2.8, Lucide React 1.31.0, Tailwind CSS 4, ESLint 9, TypeScript 5.

Node.js: sem engines declarado. Ambiente: 24.13.1. Valor final: A DEFINIR.

## 4. Scripts

Raiz: npm run format, npm run format:check.

Backend: dev, build, start, test, test:watch, test:typecheck, sync, diagnose.

Frontend: dev, build, start, lint.

## 5. Banco de dados

PostgreSQL. Migrations numeradas de 001 a 013.

Estruturas:

- jobs — oportunidades normalizadas.
- job_matches — resultado do matching.
- perfil_profissional — singleton em JSONB.
- fontes_ats — fontes ATS aprendidas.
- controle_busca_web — cache e orçamento da busca web.
- estado_sincronizacao — estado da execução.
- funil_telemetria — contadores de funil (012).

Campos centrais de jobs: id, source, external_id, company, title, description, location, remote, url, published_at, created_at, partial, source_key, last_seen_at, unavailable_at, content_hash.

Unique por source + external_id.

job_matches: score 0–100, competências JSONB, motivos JSONB, status, timestamps, matcher_version.

funil_telemetria: execucao_id, fonte, coletadas, apos_janela, apos_elegibilidade, apos_matcher, importadas, duplicadas, descartes JSONB, erros JSONB, duracao_ms, created_at.

## 6. Busca web

Brave Search opcional: 30 chamadas/dia, 1000/mês, cache 7 dias. Paginação offset de 0 a 9. Chamadas registradas antes da requisição.

## 7. Fontes diretas

- Gupy — `https://portal.gupy.io/api/job-search/jobs`.
- Sólides — `https://apigw.solides.com.br/jobs/v3/portal-vacancies`.
- Vagas.com, GeekHunter, GetOnBoard — scraping/API pública própria.
- Remotive, Remote OK, Jobicy, Arbeitnow — feeds internacionais de vagas remotas.

## 8. ATS

Greenhouse, Lever, Workable, Recruitee, Ashby, InHire.

## 9. Parâmetros do matcher

backend/src/config/matcher.ts:

- MATCHER_VERSION = 3.
- MIN_SCORE_RELEVANT = 60.
- PENALIDADE_TITULO_FORA_FOCO = 15.

backend/src/config/job-lifecycle.ts:

- maxAgeDays = 21.
- requireConfirmationAfterDays = 15.
- confirmationFreshnessDays = 7.

## 10. Deploy

    Vercel (frontend Next.js)
       ↓
    Render (backend Express)
       ↓
    Supabase PostgreSQL

Backend em produção usa DATABASE_URL e API_ACCESS_TOKEN.
Frontend usa API_BACKEND_URL, API_ACCESS_TOKEN, APP_USER e APP_PASSWORD.

## 11. Setup básico

    npm ci
    cd backend && npm ci
    cd ../frontend && npm ci

Configurar .env com base nos .env.example, aplicar migrations em ordem, iniciar backend/frontend.

## 12. Validação

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
