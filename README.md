# Job Search

Aplicação para descoberta, análise e acompanhamento de oportunidades profissionais com base em um perfil configurável.

O sistema reúne vagas de fontes diretas e páginas encontradas na web, aplica regras locais de compatibilidade e apresenta as oportunidades em um dashboard para revisão manual.

A candidatura continua sendo realizada pelo usuário no site original da vaga.

## Tecnologias

### Backend

- Node.js
- TypeScript
- Express
- PostgreSQL
- Cheerio
- Multer
- Mammoth
- pdf-parse

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Lucide React

## Estrutura

```text
job-search/
├── backend/
│   └── src/
│       ├── collectors/
│       ├── config/
│       ├── database/
│       ├── discovery/
│       ├── extractors/
│       ├── repositories/
│       ├── routes/
│       ├── scripts/
│       ├── services/
│       └── types/
│
├── database/
│   └── migrations/
│
└── frontend/
    └── src/
        ├── app/
        ├── components/
        ├── lib/
        └── types/


Funcionalidades atuais
coleta de vagas por fontes diretas;
descoberta complementar de oportunidades na web;
integração opcional com Brave Search;
cache para reduzir buscas desnecessárias;
análise e scoring local das vagas;
consideração de cargos, competências, experiência, formação e cursos;
filtros de localização;
dashboard de oportunidades;
acompanhamento do status das vagas;
perfil profissional editável;
importação e análise de currículos PDF, DOCX e TXT.
```
