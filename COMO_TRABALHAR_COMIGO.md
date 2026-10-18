# Como trabalhar comigo — Marco / Job Search

Contrato operacional. Toda IA deve ler isto antes de propor qualquer coisa.

## 0. Contexto

- Sou dev. Sou Analista de Suporte/Infra com experiencia
  em processos, supervisao e coordenacao.
- Nao executo terminal com fluencia. Copio e colo.
- Estou desempregado e usando o sistema para procurar vaga. Velocidade
  e assertividade sao prioridade.
- Ambiente: Windows + Git Bash. Node 24.13.1.

## 1. Como me pedir coisas

- Se voce nao leu o arquivo, voce nao sabe. Nao invente. Peca.
- Recon antes de patch. Sempre.
- 1 a 3 arquivos por vez. Nunca o projeto inteiro.
- Nao me peca cat arquivo.md — meu Git Bash quebra. Use notepad,
  powershell Get-Content -Raw, ou gere .txt e leia com notepad.
- Toda afirmacao marcada: [observado] / [hipotese] / [nao encontrei] /
  [nao medido].
- Nao me peca decisao tecnica. Me de sua recomendacao + motivo.
  Se realmente precisar, 2 opcoes com trade-off + recomendacao.

## 2. Como gerar scripts

- Bloco unico. Sempre. Nunca divida. Nunca peca Ctrl+D.
- tee arquivo.sh <<'SCRIPT_END' ... SCRIPT_END, depois chmod +x
  e execucao — tudo junto.
- set -uo pipefail (com -u e -o pipefail, SEM -e).
- Heredoc com aspas simples no delimitador.
- \r\n quebra tudo — sempre \n.
- cd /c/Projetos/job-search no topo.

### NUNCA fazer no meu Git Bash

- node -e com codigo complexo — ! dispara history expansion. Use .cjs.
- source em .env — quebra com CRLF, BOM, $, !.
- head -N em pipe — meu Windows fecha o pipe, Node reclama
  stdout is not a tty. Use > arquivo.txt + notepad.
- cat arquivo.md — mesmo problema.
- Heredoc aninhado com $ ou backtick.
- grep com regex complicado em aspas duplas.
- Backticks dentro de bloco de codigo (quebra o parser do chat).
- Backtick no corpo de heredoc no terminal — trunca o paste (comprovado 3x em 18/10).
  Para markdown/codigo com backtick, usar .cjs com String.fromCharCode(96) ou
  printf '%s\n' 'linha1' 'linha2' ... > arquivo.
- Diff verboso no meio de bloco — trunca o paste. Diff sempre em .txt + notepad,
  nunca colado no meio de bloco.
- Mensagem de commit multiline — printf '%s\n' 'linha1' 'linha2' ... > msg.txt,
  depois git commit -F msg.txt. Nunca heredoc.

### Preferir .cjs quando possivel

Use fs.readFileSync, path.join(process.cwd(), node_modules, pg),
lerEnv com split em \r?\n, Client do pg, try/finally com cli.end().

### Backup antes de alterar

F=backend/src/services/arquivo.ts
BAK=/c/Projetos/job-search-diag/arquivo.ts.bak
[ -f "$BAK" ] || cp "$F" "$BAK"

Backups vao fora do repo (/c/Projetos/job-search-diag/).
Sufixo por fase: .f2bak, .f3bak.

### Patch de arquivo

.cjs com verificacao de ancora: se nao achar o trecho, abort e
imprime nao achou: rotulo. Nunca escreve pela metade.

### Read-only por padrao

Scripts que escrevem no banco: dry-run por padrao, APPLY=1 para
aplicar, REVERT=1 BACKUP=path para reverter. Backup JSONB antes.

## 3. Validacao e commit

- Typecheck + testes + build antes de pronto.
- git add explicito (nunca -A). git commit -F arquivo (nunca -m).
- Codigo + docs no mesmo commit.
- Sem git push --force sem autorizacao.

## 4. Como entregar

Toda resposta com script:

1. Uma frase do que faz.
2. Riscos (se houver).
3. Bloco unico pronto para colar.
4. O que esperar na saida.
5. Proximo passo.

Sem preambulo. Sem certamente. Sem vamos la.

## 5. Regras que nunca mudam

- Sem LLM no pipeline. Sem candidatura automatica.
- PostgreSQL e a unica fonte de estado.
- Brave e orcamento controlado (30/dia, 1000/mes).
- LinkedIn e Glassdoor so via Brave dork. Nunca autenticado.
- Arquivos: kebab-case. Tipos: camelCase. Constantes: SCREAMING_SNAKE_CASE.

## 6. Nunca fazer

- Pedir faz tudo de uma vez.
- Codigo sem ler o arquivo alvo.
- Patch sem typecheck + testes.
- Commit sem git diff --cached --stat.
- Aceitar achismo sem [hipotese].
- Backup dentro do repo.
- Script em 2 mensagens.
- Me pedir para escolher arquitetura.

## 7. Resumo

Recon antes de patch. Bloco unico. Backup antes. Typecheck + testes
+ build. Commit com docs juntos. Marcadores em toda afirmacao.
Voce decide, eu executo.
