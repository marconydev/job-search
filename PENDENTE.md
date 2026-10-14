# PENDENTE — Job Search (13/10/2026)

Fonte de verdade quando os docs grandes estiverem defasados.
Quando o ciclo fechar, deletar este arquivo.

## Estado do repositório

- Working tree limpo.
- Commits recentes: 0639fe3 (fixes geograficos + Solides + termos Gupy),
  166664b (HANDOFF sincronizado).
- Suite: 276/276 backend verdes. typecheck + build OK.

## Fechado em 13/10

- Falso positivo Curitiba (descricaoRestringeParaOutroPais).
- Opcao 2 bypassava regra presencial (43 saneadas via saneamento-onsite).
- Variantes UK (uk, gb, great britain, england, scotland, wales, u.k.).
- Fallback textual location=null (UF brasileira + brasil/brazil).
- Solides: publishedAt null (API so expoe createdAt).
- gerarTermosBuscaNativaGupy: principais por familia prefixados.

## Pendente

### Brave / LinkedIn / Glassdoor

Investigacao detalhada em BRAVE_LINKEDIN_PENDENTE.md.
Proximo passo: ler controle-busca-web-repository.ts para descobrir
o nome real da tabela de cache, depois consultar no Neon. Confirmar
com o usuario qual dos 2 botoes ele clica em producao.

### Documentos defasados

HANDOFF.md, CHANGELOG.md, README_ATUAL.md — verificar se cobrem
os fixes de 0639fe3. Se sim, deletar este PENDENTE.md.

## Regras

- Scripts em bloco unico. set -uo pipefail. Sem node -e. Sem head em pipe.
- git add explicito. git commit -F. Sem push --force.
- Typecheck + testes + build antes de pronto.
- Toda afirmacao com [observado] / [hipotese] / [nao encontrei] / [nao medido].
