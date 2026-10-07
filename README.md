# Job Search

Aplicação pessoal para descoberta, análise e acompanhamento de vagas com base em um perfil profissional configurável. Reúne vagas de fontes diretas e da web, aplica regras locais de compatibilidade e apresenta as oportunidades em um dashboard para revisão manual. A candidatura é sempre no site original.

## Tecnologias

Backend: Node.js, TypeScript, Express 5, PostgreSQL (`pg`, sem ORM), Cheerio, Multer, Mammoth, pdf-parse.

Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Lucide React.

## Como rodar

    npm ci
    cd backend && npm ci
    cd ../frontend && npm ci

Configurar `backend/.env` e `frontend/.env.local` com base nos `.env.example`. Aplicar as migrations de `database/migrations` em ordem.

Backend: `cd backend && npm run dev`.
Frontend: `cd frontend && npm run dev`.

## Validação

    cd backend && npm run test && npm run test:typecheck && npm run build
    cd ../frontend && npm run lint && npm run build

## Documentos

- `README_ATUAL.md` — estado atual da aplicação.
- `PRD.md` — requisitos de produto.
- `DESIGN.md` — arquitetura, padrões e mapa de arquivos.
- `HANDOFF.md` — passagem de bastão, pendências e manual de retomada.
- `CHANGELOG.md` — histórico de mudanças.
- `CONFIG.md` — variáveis de ambiente, dependências e migrações.
