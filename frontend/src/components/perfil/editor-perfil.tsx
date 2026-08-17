"use client"

import { useMemo, useState } from "react"

import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  GraduationCap,
  LoaderCircle,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  Upload,
  UserRound,
  Wrench
} from "lucide-react"

import type {
  CompetenciaPerfil,
  CursoProfissional,
  ExperienciaProfissional,
  FormacaoProfissional,
  PerfilProfissional,
  PerfilProfissionalComMetadados,
  ResultadoImportacaoCurriculo
} from "@/types/perfil"

type Propriedades = {
  dadosIniciais: PerfilProfissionalComMetadados
}

type CompetenciaEditavel = {
  nome: string

  termosTexto: string
}

type ListasTexto = {
  cargosPrincipais: string

  cargosRelacionados: string

  cargosDesvio: string

  localizacoesAceitas: string

  titulosExcluidos: string
}

type SelecaoImportacao = {
  resumoProfissional: boolean

  competencias: boolean[]

  experiencias: boolean[]

  formacoes: boolean[]

  cursos: boolean[]
}

type CampoListaImportacao = "competencias" | "experiencias" | "formacoes" | "cursos"

const LIMITE_COMPETENCIAS = 10

const LIMITE_ARQUIVO_CURRICULO = 5 * 1024 * 1024

const EXTENSOES_CURRICULO = new Set(["pdf", "docx", "txt"])

/**
 * Eu mantenho opções padronizadas para evitar variações desnecessárias
 * na forma como o nível acadêmico é armazenado.
 */
const NIVEIS_FORMACAO = [
  "Ensino Médio",
  "Técnico",
  "Tecnólogo",
  "Graduação",
  "Bacharelado",
  "Licenciatura",
  "Especialização",
  "Pós-graduação",
  "MBA",
  "Mestrado",
  "Doutorado",
  "Pós-doutorado",
  "Outro"
]

function listaParaTexto(valores: string[]) {
  return valores.join("\n")
}

function textoParaLista(valor: string) {
  return [
    ...new Set(
      valor
        .split(/\r?\n/)
        .map(item => item.trim())
        .filter(Boolean)
    )
  ]
}

function termosParaTexto(termos: string[]) {
  return termos.join(", ")
}

function textoParaTermos(valor: string) {
  return [
    ...new Set(
      valor
        .split(/[,\n]/)
        .map(item => item.trim())
        .filter(Boolean)
    )
  ]
}

function normalizarChave(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function formatarTamanhoArquivo(tamanho: number) {
  if (tamanho < 1024) {
    return `${tamanho} B`
  }

  if (tamanho < 1024 * 1024) {
    return `${(tamanho / 1024).toFixed(1)} KB`
  }

  return `${(tamanho / (1024 * 1024)).toFixed(1)} MB`
}

function extensaoArquivo(nome: string) {
  return nome.split(".").pop()?.toLowerCase() ?? ""
}

/**
 * Eu centralizo a conversão das competências porque utilizo a mesma
 * estrutura tanto ao carregar quanto depois de salvar o perfil.
 */
function criarCompetenciasEditaveis(perfil: PerfilProfissional): CompetenciaEditavel[] {
  return perfil.competencias.map(competencia => ({
    nome: competencia.nome,

    termosTexto: termosParaTexto(competencia.termos)
  }))
}

/**
 * Eu também centralizo as listas que são editadas como texto.
 */
function criarListasTexto(perfil: PerfilProfissional): ListasTexto {
  return {
    cargosPrincipais: listaParaTexto(perfil.cargosPrincipais),

    cargosRelacionados: listaParaTexto(perfil.cargosRelacionados),

    cargosDesvio: listaParaTexto(perfil.cargosDesvio),

    localizacoesAceitas: listaParaTexto(perfil.localizacoesAceitas),

    titulosExcluidos: listaParaTexto(perfil.titulosExcluidos)
  }
}

/**
 * Eu monto sempre a mesma representação final do perfil.
 *
 * Além de preparar os dados para a API, utilizo essa estrutura para
 * saber se existe realmente alguma alteração ainda não salva.
 */
function montarPerfil(
  perfil: PerfilProfissional,

  listasTexto: ListasTexto,

  competencias: CompetenciaEditavel[]
): PerfilProfissional {
  return {
    ...perfil,

    cargosPrincipais: textoParaLista(listasTexto.cargosPrincipais),

    cargosRelacionados: textoParaLista(listasTexto.cargosRelacionados),

    cargosDesvio: textoParaLista(listasTexto.cargosDesvio),

    localizacoesAceitas: textoParaLista(listasTexto.localizacoesAceitas),

    titulosExcluidos: textoParaLista(listasTexto.titulosExcluidos),

    competencias: competencias
      .map(competencia => ({
        nome: competencia.nome.trim(),

        termos: textoParaTermos(competencia.termosTexto)
      }))
      .filter(competencia => Boolean(competencia.nome))
  }
}

function mesclarCompetencias(
  atuais: CompetenciaEditavel[],

  novas: CompetenciaPerfil[]
) {
  const resultado = atuais.map(competencia => ({
    ...competencia
  }))

  for (const competencia of novas) {
    const chave = normalizarChave(competencia.nome)

    const indiceExistente = resultado.findIndex(atual => normalizarChave(atual.nome) === chave)

    if (indiceExistente === -1) {
      resultado.push({
        nome: competencia.nome,

        termosTexto: termosParaTexto(competencia.termos)
      })

      continue
    }

    const existente = resultado[indiceExistente]

    if (!existente) {
      continue
    }

    const termos = [...new Set([...textoParaTermos(existente.termosTexto), ...competencia.termos])]

    resultado[indiceExistente] = {
      ...existente,

      termosTexto: termosParaTexto(termos)
    }
  }

  return resultado
}

function mesclarExperiencias(
  atuais: ExperienciaProfissional[],

  novas: ExperienciaProfissional[]
) {
  const resultado = [...atuais]

  const chaves = new Set(
    atuais.map(experiencia =>
      normalizarChave([experiencia.empresa, experiencia.cargo, experiencia.periodo].join("|"))
    )
  )

  for (const experiencia of novas) {
    const chave = normalizarChave(
      [experiencia.empresa, experiencia.cargo, experiencia.periodo].join("|")
    )

    if (!chave || chaves.has(chave)) {
      continue
    }

    resultado.push(experiencia)

    chaves.add(chave)
  }

  return resultado
}

function mesclarFormacoes(
  atuais: FormacaoProfissional[],

  novas: FormacaoProfissional[]
) {
  const resultado = [...atuais]

  const chaves = new Set(
    atuais.map(formacao =>
      normalizarChave([formacao.instituicao, formacao.curso, formacao.periodo].join("|"))
    )
  )

  for (const formacao of novas) {
    const chave = normalizarChave(
      [formacao.instituicao, formacao.curso, formacao.periodo].join("|")
    )

    if (!chave || chaves.has(chave)) {
      continue
    }

    resultado.push(formacao)

    chaves.add(chave)
  }

  return resultado
}

function mesclarCursos(
  atuais: CursoProfissional[],

  novos: CursoProfissional[]
) {
  const resultado = [...atuais]

  const chaves = new Set(
    atuais.map(curso => normalizarChave([curso.nome, curso.instituicao, curso.ano].join("|")))
  )

  for (const curso of novos) {
    const chave = normalizarChave([curso.nome, curso.instituicao, curso.ano].join("|"))

    if (!chave || chaves.has(chave)) {
      continue
    }

    resultado.push(curso)

    chaves.add(chave)
  }

  return resultado
}

function criarSelecaoInicial(
  resultado: ResultadoImportacaoCurriculo,

  perfil: PerfilProfissional
): SelecaoImportacao {
  return {
    /**
     * Se já existe um resumo profissional, eu não o substituo por padrão.
     * O usuário pode marcar explicitamente a opção caso queira trocá-lo.
     */
    resumoProfissional:
      !perfil.resumoProfissional.trim() && Boolean(resultado.sugestoes.resumoProfissional.trim()),

    competencias: resultado.sugestoes.competencias.map(() => true),

    experiencias: resultado.sugestoes.experiencias.map(() => true),

    formacoes: resultado.sugestoes.formacoes.map(() => true),

    cursos: resultado.sugestoes.cursos.map(() => true)
  }
}

export function EditorPerfil({ dadosIniciais }: Propriedades) {
  const competenciasIniciais = criarCompetenciasEditaveis(dadosIniciais.perfil)

  const listasIniciais = criarListasTexto(dadosIniciais.perfil)

  const [perfil, setPerfil] = useState<PerfilProfissional>(dadosIniciais.perfil)

  const [competencias, setCompetencias] = useState<CompetenciaEditavel[]>(competenciasIniciais)

  const [listasTexto, setListasTexto] = useState<ListasTexto>(listasIniciais)

  const [exibirTodasCompetencias, setExibirTodasCompetencias] = useState(false)

  const [salvando, setSalvando] = useState(false)

  const [erro, setErro] = useState<string | null>(null)

  const [importandoCurriculo, setImportandoCurriculo] = useState(false)

  const [resultadoImportacao, setResultadoImportacao] =
    useState<ResultadoImportacaoCurriculo | null>(null)

  const [selecaoImportacao, setSelecaoImportacao] = useState<SelecaoImportacao | null>(null)

  const [mensagemImportacao, setMensagemImportacao] = useState<string | null>(null)

  /**
   * Eu salvo uma assinatura do último estado persistido.
   *
   * A comparação é feita com o perfil completo, então qualquer alteração
   * em experiência, formação, competência, cargo ou configuração do
   * matcher faz o botão de salvar aparecer.
   */
  const [assinaturaSalva, setAssinaturaSalva] = useState(() =>
    JSON.stringify(montarPerfil(dadosIniciais.perfil, listasIniciais, competenciasIniciais))
  )

  const perfilParaSalvar = useMemo(
    () => montarPerfil(perfil, listasTexto, competencias),
    [competencias, listasTexto, perfil]
  )

  const assinaturaAtual = useMemo(() => JSON.stringify(perfilParaSalvar), [perfilParaSalvar])

  /**
   * O botão aparece somente quando existe uma diferença real em relação
   * ao último perfil salvo.
   */
  const possuiAlteracoes = assinaturaAtual !== assinaturaSalva

  const competenciasVisiveis = useMemo(
    () => (exibirTodasCompetencias ? competencias : competencias.slice(0, LIMITE_COMPETENCIAS)),
    [competencias, exibirTodasCompetencias]
  )

  const possuiCompetenciasOcultas = competencias.length > LIMITE_COMPETENCIAS

  const possuiSelecaoImportacao = useMemo(() => {
    if (!selecaoImportacao) {
      return false
    }

    return (
      selecaoImportacao.resumoProfissional ||
      selecaoImportacao.competencias.some(Boolean) ||
      selecaoImportacao.experiencias.some(Boolean) ||
      selecaoImportacao.formacoes.some(Boolean) ||
      selecaoImportacao.cursos.some(Boolean)
    )
  }, [selecaoImportacao])

  function alterarListaTexto(
    campo: keyof ListasTexto,

    valor: string
  ) {
    setErro(null)

    setListasTexto(atual => ({
      ...atual,

      [campo]: valor
    }))
  }

  function adicionarCompetencia() {
    setErro(null)

    setExibirTodasCompetencias(true)

    setCompetencias(atuais => [
      ...atuais,

      {
        nome: "",

        termosTexto: ""
      }
    ])
  }

  function alterarNomeCompetencia(
    indice: number,

    valor: string
  ) {
    setErro(null)

    setCompetencias(atuais =>
      atuais.map((competencia, posicao) =>
        posicao === indice
          ? {
              ...competencia,

              nome: valor
            }
          : competencia
      )
    )
  }

  function alterarTermosCompetencia(
    indice: number,

    valor: string
  ) {
    setErro(null)

    setCompetencias(atuais =>
      atuais.map((competencia, posicao) =>
        posicao === indice
          ? {
              ...competencia,

              termosTexto: valor
            }
          : competencia
      )
    )
  }

  function removerCompetencia(indice: number) {
    setErro(null)

    setCompetencias(atuais => atuais.filter((_competencia, posicao) => posicao !== indice))
  }

  function adicionarExperiencia() {
    setErro(null)

    setPerfil(atual => ({
      ...atual,

      experiencias: [
        ...atual.experiencias,

        {
          empresa: "",

          cargo: "",

          periodo: "",

          descricao: ""
        }
      ]
    }))
  }

  function alterarExperiencia(
    indice: number,

    campo: keyof ExperienciaProfissional,

    valor: string
  ) {
    setErro(null)

    setPerfil(atual => ({
      ...atual,

      experiencias: atual.experiencias.map((experiencia, posicao) =>
        posicao === indice
          ? {
              ...experiencia,

              [campo]: valor
            }
          : experiencia
      )
    }))
  }

  function removerExperiencia(indice: number) {
    setErro(null)

    setPerfil(atual => ({
      ...atual,

      experiencias: atual.experiencias.filter((_experiencia, posicao) => posicao !== indice)
    }))
  }

  function adicionarFormacao() {
    setErro(null)

    setPerfil(atual => ({
      ...atual,

      formacoes: [
        ...atual.formacoes,

        {
          instituicao: "",

          curso: "",

          nivel: "",

          periodo: ""
        }
      ]
    }))
  }

  function alterarFormacao(
    indice: number,

    campo: keyof FormacaoProfissional,

    valor: string
  ) {
    setErro(null)

    setPerfil(atual => ({
      ...atual,

      formacoes: atual.formacoes.map((formacao, posicao) =>
        posicao === indice
          ? {
              ...formacao,

              [campo]: valor
            }
          : formacao
      )
    }))
  }

  function removerFormacao(indice: number) {
    setErro(null)

    setPerfil(atual => ({
      ...atual,

      formacoes: atual.formacoes.filter((_formacao, posicao) => posicao !== indice)
    }))
  }

  function adicionarCurso() {
    setErro(null)

    setPerfil(atual => ({
      ...atual,

      cursos: [
        ...atual.cursos,

        {
          nome: "",

          instituicao: "",

          ano: ""
        }
      ]
    }))
  }

  function alterarCurso(
    indice: number,

    campo: keyof CursoProfissional,

    valor: string
  ) {
    setErro(null)

    setPerfil(atual => ({
      ...atual,

      cursos: atual.cursos.map((curso, posicao) =>
        posicao === indice
          ? {
              ...curso,

              [campo]: valor
            }
          : curso
      )
    }))
  }

  function removerCurso(indice: number) {
    setErro(null)

    setPerfil(atual => ({
      ...atual,

      cursos: atual.cursos.filter((_curso, posicao) => posicao !== indice)
    }))
  }

  function alternarSelecaoResumo() {
    setSelecaoImportacao(atual => {
      if (!atual) {
        return atual
      }

      return {
        ...atual,

        resumoProfissional: !atual.resumoProfissional
      }
    })
  }

  function alternarSelecaoItem(
    campo: CampoListaImportacao,

    indice: number
  ) {
    setSelecaoImportacao(atual => {
      if (!atual) {
        return atual
      }

      return {
        ...atual,

        [campo]: atual[campo].map((selecionado, posicao) =>
          posicao === indice ? !selecionado : selecionado
        )
      }
    })
  }

  async function importarCurriculo(arquivo: File) {
    setErro(null)

    setMensagemImportacao(null)

    setResultadoImportacao(null)

    setSelecaoImportacao(null)

    const extensao = extensaoArquivo(arquivo.name)

    if (!EXTENSOES_CURRICULO.has(extensao)) {
      setErro("Envie um currículo em PDF, DOCX ou TXT.")

      return
    }

    if (arquivo.size > LIMITE_ARQUIVO_CURRICULO) {
      setErro("O currículo deve ter no máximo 5 MB.")

      return
    }

    setImportandoCurriculo(true)

    try {
      const dados = new FormData()

      dados.append("arquivo", arquivo)

      const resposta = await fetch("/api/perfil/importar", {
        method: "POST",

        body: dados
      })

      const retorno = await resposta.json()

      if (!resposta.ok) {
        throw new Error(retorno.mensagem ?? "Não foi possível analisar o currículo.")
      }

      const resultado = retorno as ResultadoImportacaoCurriculo

      setResultadoImportacao(resultado)

      setSelecaoImportacao(criarSelecaoInicial(resultado, perfil))
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível analisar o currículo.")
    } finally {
      setImportandoCurriculo(false)
    }
  }

  function aplicarImportacao() {
    if (!resultadoImportacao || !selecaoImportacao) {
      return
    }

    const sugestoes = resultadoImportacao.sugestoes

    const competenciasSelecionadas = sugestoes.competencias.filter(
      (_competencia, indice) => selecaoImportacao.competencias[indice] === true
    )

    const experienciasSelecionadas = sugestoes.experiencias.filter(
      (_experiencia, indice) => selecaoImportacao.experiencias[indice] === true
    )

    const formacoesSelecionadas = sugestoes.formacoes.filter(
      (_formacao, indice) => selecaoImportacao.formacoes[indice] === true
    )

    const cursosSelecionados = sugestoes.cursos.filter(
      (_curso, indice) => selecaoImportacao.cursos[indice] === true
    )

    setCompetencias(atuais => mesclarCompetencias(atuais, competenciasSelecionadas))

    setPerfil(atual => ({
      ...atual,

      resumoProfissional:
        selecaoImportacao.resumoProfissional && sugestoes.resumoProfissional.trim()
          ? sugestoes.resumoProfissional
          : atual.resumoProfissional,

      experiencias: mesclarExperiencias(atual.experiencias, experienciasSelecionadas),

      formacoes: mesclarFormacoes(atual.formacoes, formacoesSelecionadas),

      cursos: mesclarCursos(atual.cursos, cursosSelecionados)
    }))

    if (competenciasSelecionadas.length > LIMITE_COMPETENCIAS) {
      setExibirTodasCompetencias(true)
    }

    setResultadoImportacao(null)

    setSelecaoImportacao(null)

    setMensagemImportacao(
      "Informações aplicadas ao editor. Revise os campos e clique em Salvar alterações para confirmar."
    )
  }

  function cancelarImportacao() {
    setResultadoImportacao(null)

    setSelecaoImportacao(null)

    setMensagemImportacao(null)
  }

  async function salvarPerfil() {
    if (!possuiAlteracoes || salvando) {
      return
    }

    setSalvando(true)

    setErro(null)

    try {
      const resposta = await fetch("/api/perfil", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(perfilParaSalvar)
      })

      const retorno = await resposta.json()

      if (!resposta.ok) {
        throw new Error(retorno.mensagem ?? "Não foi possível salvar o perfil.")
      }

      /**
       * Eu sincronizo o editor com a versão normalizada que voltou do
       * backend.
       */
      const perfilSalvo: PerfilProfissional = retorno.perfil

      const novasCompetencias = criarCompetenciasEditaveis(perfilSalvo)

      const novasListas = criarListasTexto(perfilSalvo)

      const assinatura = JSON.stringify(montarPerfil(perfilSalvo, novasListas, novasCompetencias))

      setPerfil(perfilSalvo)

      setCompetencias(novasCompetencias)

      setListasTexto(novasListas)

      setAssinaturaSalva(assinatura)

      setMensagemImportacao("Perfil profissional salvo e vagas existentes reavaliadas.")
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar o perfil.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <section className="rounded-3xl border border-indigo-200 bg-indigo-50/50 p-6 shadow-sm dark:border-indigo-900 dark:bg-indigo-950/20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white">
              <FileText size={20} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                Importar currículo
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Importe um currículo para identificar resumo, competências, experiências, formação e
                cursos. Nada será salvo sem sua revisão.
              </p>

              <p className="mt-1 text-xs text-slate-400">PDF, DOCX ou TXT • máximo 5 MB</p>
            </div>
          </div>

          <label
            className={[
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition",
              importandoCurriculo
                ? "cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-800"
                : "cursor-pointer bg-indigo-600 text-white shadow-lg shadow-indigo-600/15 hover:bg-indigo-700"
            ].join(" ")}
          >
            {importandoCurriculo ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Upload size={17} />
            )}

            {importandoCurriculo ? "Analisando..." : "Selecionar currículo"}

            <input
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              disabled={importandoCurriculo}
              className="hidden"
              onChange={evento => {
                const arquivo = evento.currentTarget.files?.[0]

                evento.currentTarget.value = ""

                if (!arquivo) {
                  return
                }

                void importarCurriculo(arquivo)
              }}
            />
          </label>
        </div>

        {mensagemImportacao && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />

            <span>{mensagemImportacao}</span>
          </div>
        )}

        {resultadoImportacao && selecaoImportacao && (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-900">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <CheckCircle2 size={17} className="text-emerald-500" />
                  Currículo analisado
                </div>

                <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {resultadoImportacao.arquivo.nome}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  {formatarTamanhoArquivo(resultadoImportacao.arquivo.tamanho)}
                </div>
              </div>

              <button
                type="button"
                onClick={cancelarImportacao}
                className="cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-900 dark:hover:text-white"
              >
                Cancelar revisão
              </button>
            </div>

            <div className="mt-5 space-y-6">
              {resultadoImportacao.sugestoes.resumoProfissional && (
                <div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-300 dark:border-slate-800">
                    <input
                      type="checkbox"
                      checked={selecaoImportacao.resumoProfissional}
                      onChange={alternarSelecaoResumo}
                      className="mt-1 h-4 w-4 accent-indigo-600"
                    />

                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        Resumo profissional
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {resultadoImportacao.sugestoes.resumoProfissional}
                      </p>

                      {perfil.resumoProfissional.trim() &&
                        !selecaoImportacao.resumoProfissional && (
                          <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                            Seu resumo atual será mantido. Marque esta opção apenas se quiser
                            substituí-lo.
                          </p>
                        )}
                    </div>
                  </label>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Competências
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {resultadoImportacao.sugestoes.competencias.length} encontrada(s)
                  </span>
                </h3>

                {resultadoImportacao.sugestoes.competencias.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {resultadoImportacao.sugestoes.competencias.map((competencia, indice) => (
                      <label
                        key={`${competencia.nome}-${indice}`}
                        className={[
                          "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                          selecaoImportacao.competencias[indice]
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
                            : "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900"
                        ].join(" ")}
                      >
                        <input
                          type="checkbox"
                          checked={selecaoImportacao.competencias[indice] ?? false}
                          onChange={() => alternarSelecaoItem("competencias", indice)}
                          className="h-4 w-4 accent-indigo-600"
                        />

                        {competencia.nome}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Nenhuma competência foi reconhecida.
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Experiências profissionais
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {resultadoImportacao.sugestoes.experiencias.length} encontrada(s)
                  </span>
                </h3>

                <div className="mt-3 space-y-2">
                  {resultadoImportacao.sugestoes.experiencias.map((experiencia, indice) => (
                    <label
                      key={`${experiencia.cargo}-${experiencia.empresa}-${indice}`}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={selecaoImportacao.experiencias[indice] ?? false}
                        onChange={() => alternarSelecaoItem("experiencias", indice)}
                        className="mt-1 h-4 w-4 accent-indigo-600"
                      />

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {experiencia.cargo || "Cargo não identificado"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {[experiencia.empresa, experiencia.periodo].filter(Boolean).join(" • ")}
                        </div>

                        {experiencia.descricao && (
                          <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">
                            {experiencia.descricao}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}

                  {resultadoImportacao.sugestoes.experiencias.length === 0 && (
                    <p className="text-sm text-slate-500">
                      Nenhuma experiência foi estruturada automaticamente.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Formação acadêmica
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {resultadoImportacao.sugestoes.formacoes.length} encontrada(s)
                  </span>
                </h3>

                <div className="mt-3 space-y-2">
                  {resultadoImportacao.sugestoes.formacoes.map((formacao, indice) => (
                    <label
                      key={`${formacao.curso}-${formacao.instituicao}-${indice}`}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={selecaoImportacao.formacoes[indice] ?? false}
                        onChange={() => alternarSelecaoItem("formacoes", indice)}
                        className="mt-1 h-4 w-4 accent-indigo-600"
                      />

                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {formacao.curso || "Curso não identificado"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {[formacao.nivel, formacao.instituicao, formacao.periodo]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      </div>
                    </label>
                  ))}

                  {resultadoImportacao.sugestoes.formacoes.length === 0 && (
                    <p className="text-sm text-slate-500">
                      Nenhuma formação foi estruturada automaticamente.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Cursos e certificações
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {resultadoImportacao.sugestoes.cursos.length} encontrado(s)
                  </span>
                </h3>

                <div className="mt-3 space-y-2">
                  {resultadoImportacao.sugestoes.cursos.map((curso, indice) => (
                    <label
                      key={`${curso.nome}-${curso.instituicao}-${indice}`}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={selecaoImportacao.cursos[indice] ?? false}
                        onChange={() => alternarSelecaoItem("cursos", indice)}
                        className="mt-1 h-4 w-4 accent-indigo-600"
                      />

                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {curso.nome}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {[curso.instituicao, curso.ano].filter(Boolean).join(" • ")}
                        </div>
                      </div>
                    </label>
                  ))}

                  {resultadoImportacao.sugestoes.cursos.length === 0 && (
                    <p className="text-sm text-slate-500">
                      Nenhum curso ou certificação foi estruturado automaticamente.
                    </p>
                  )}
                </div>
              </div>

              {resultadoImportacao.avisos.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                    <AlertTriangle size={17} />
                    Pontos para revisar
                  </div>

                  <div className="mt-3 space-y-1">
                    {resultadoImportacao.avisos.map((aviso, indice) => (
                      <p
                        key={indice}
                        className="text-xs leading-5 text-amber-700 dark:text-amber-400"
                      >
                        {aviso}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end dark:border-slate-900">
                <button
                  type="button"
                  onClick={cancelarImportacao}
                  className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={!possuiSelecaoImportacao}
                  onClick={aplicarImportacao}
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 size={17} />
                  Aplicar ao meu perfil
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <UserRound size={20} />
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">
              Resumo profissional
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Descreva de forma curta sua experiência e objetivo profissional.
            </p>
          </div>
        </div>

        <textarea
          value={perfil.resumoProfissional}
          onChange={evento => {
            setErro(null)

            setPerfil(atual => ({
              ...atual,

              resumoProfissional: evento.target.value
            }))
          }}
          rows={6}
          placeholder="Ex.: Profissional de TI com experiência em suporte, sistemas hospitalares, infraestrutura, análise de incidentes..."
          className="mt-5 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-950"
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <BriefcaseBusiness size={20} />
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">
              Cargos buscados
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Coloque um cargo por linha. Os cargos principais recebem maior peso no matcher.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Cargos principais
            </label>

            <textarea
              value={listasTexto.cargosPrincipais}
              onChange={evento => alterarListaTexto("cargosPrincipais", evento.target.value)}
              rows={12}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:ring-indigo-950"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Cargos relacionados
            </label>

            <textarea
              value={listasTexto.cargosRelacionados}
              onChange={evento => alterarListaTexto("cargosRelacionados", evento.target.value)}
              rows={12}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:ring-indigo-950"
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <Wrench size={20} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                Competências e tecnologias
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Os termos ajudam o sistema a reconhecer diferentes formas de escrever a mesma
                competência.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={adicionarCompetencia}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {competenciasVisiveis.map((competencia, indice) => (
            <div
              key={indice}
              className="grid gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 lg:grid-cols-[minmax(180px,0.35fr)_1fr_auto]"
            >
              <input
                value={competencia.nome}
                onChange={evento => alterarNomeCompetencia(indice, evento.target.value)}
                placeholder="Competência"
                className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:ring-indigo-950"
              />

              <input
                value={competencia.termosTexto}
                onChange={evento => alterarTermosCompetencia(indice, evento.target.value)}
                placeholder="Termos relacionados separados por vírgula"
                className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:ring-indigo-950"
              />

              <button
                type="button"
                onClick={() => removerCompetencia(indice)}
                aria-label="Remover competência"
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>

        {possuiCompetenciasOcultas && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setExibirTodasCompetencias(atual => !atual)}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-indigo-600 transition hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {exibirTodasCompetencias ? (
                <>
                  Exibir menos
                  <ChevronUp size={14} />
                </>
              ) : (
                <>
                  Exibir mais
                  <ChevronDown size={14} />
                </>
              )}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <BriefcaseBusiness size={20} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                Experiência profissional
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Registre suas experiências profissionais e principais responsabilidades.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={adicionarExperiencia}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <Plus size={16} />
            Adicionar experiência
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {perfil.experiencias.map((experiencia, indice) => (
            <div
              key={indice}
              className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={experiencia.empresa}
                  onChange={evento => alterarExperiencia(indice, "empresa", evento.target.value)}
                  placeholder="Empresa"
                  className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
                />

                <input
                  value={experiencia.cargo}
                  onChange={evento => alterarExperiencia(indice, "cargo", evento.target.value)}
                  placeholder="Cargo"
                  className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
                />

                <input
                  value={experiencia.periodo}
                  onChange={evento => alterarExperiencia(indice, "periodo", evento.target.value)}
                  placeholder="Período — ex.: jun/2025 até o momento"
                  className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900 md:col-span-2"
                />
              </div>

              <textarea
                value={experiencia.descricao}
                onChange={evento => alterarExperiencia(indice, "descricao", evento.target.value)}
                rows={5}
                placeholder="Principais responsabilidades, atividades, projetos e tecnologias utilizadas..."
                className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
              />

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => removerExperiencia(indice)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 size={14} />
                  Remover
                </button>
              </div>
            </div>
          ))}

          {perfil.experiencias.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
              Nenhuma experiência cadastrada.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <GraduationCap size={20} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                Formação acadêmica
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Cadastre graduação, tecnólogo, especializações e demais formações.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={adicionarFormacao}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {perfil.formacoes.map((formacao, indice) => (
            <div
              key={indice}
              className="grid gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 md:grid-cols-2"
            >
              <input
                value={formacao.instituicao}
                onChange={evento => alterarFormacao(indice, "instituicao", evento.target.value)}
                placeholder="Instituição"
                className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
              />

              <input
                value={formacao.curso}
                onChange={evento => alterarFormacao(indice, "curso", evento.target.value)}
                placeholder="Curso"
                className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
              />

              <select
                value={formacao.nivel}
                onChange={evento => alterarFormacao(indice, "nivel", evento.target.value)}
                className="min-h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-950"
              >
                <option value="">Selecione o nível</option>

                {NIVEIS_FORMACAO.map(nivel => (
                  <option key={nivel} value={nivel}>
                    {nivel}
                  </option>
                ))}

                {formacao.nivel && !NIVEIS_FORMACAO.includes(formacao.nivel) && (
                  <option value={formacao.nivel}>{formacao.nivel}</option>
                )}
              </select>

              <div className="flex gap-2">
                <input
                  value={formacao.periodo}
                  onChange={evento => alterarFormacao(indice, "periodo", evento.target.value)}
                  placeholder="Período"
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
                />

                <button
                  type="button"
                  onClick={() => removerFormacao(indice)}
                  aria-label="Remover formação"
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {perfil.formacoes.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
              Nenhuma formação cadastrada.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">
              Cursos e certificações
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Inclua cursos complementares e certificações relevantes para sua atuação.
            </p>
          </div>

          <button
            type="button"
            onClick={adicionarCurso}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {perfil.cursos.map((curso, indice) => (
            <div
              key={indice}
              className="grid gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 md:grid-cols-[1fr_1fr_140px_auto]"
            >
              <input
                value={curso.nome}
                onChange={evento => alterarCurso(indice, "nome", evento.target.value)}
                placeholder="Curso ou certificação"
                className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
              />

              <input
                value={curso.instituicao}
                onChange={evento => alterarCurso(indice, "instituicao", evento.target.value)}
                placeholder="Instituição"
                className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
              />

              <input
                value={curso.ano}
                onChange={evento => alterarCurso(indice, "ano", evento.target.value)}
                placeholder="Ano"
                className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
              />

              <button
                type="button"
                onClick={() => removerCurso(indice)}
                aria-label="Remover curso"
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {perfil.cursos.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
              Nenhum curso ou certificação cadastrado.
            </div>
          )}
        </div>
      </section>

      <details className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-6">
          <SlidersHorizontal size={19} className="text-slate-500" />

          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Configurações avançadas do matcher
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Cargos de desvio, localizações aceitas e títulos excluídos.
            </div>
          </div>
        </summary>

        <div className="grid gap-5 border-t border-slate-100 p-6 dark:border-slate-900 lg:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Cargos de outra trilha</label>

            <textarea
              value={listasTexto.cargosDesvio}
              onChange={evento => alterarListaTexto("cargosDesvio", evento.target.value)}
              rows={10}
              className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Localizações aceitas</label>

            <textarea
              value={listasTexto.localizacoesAceitas}
              onChange={evento => alterarListaTexto("localizacoesAceitas", evento.target.value)}
              rows={10}
              className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Títulos excluídos</label>

            <textarea
              value={listasTexto.titulosExcluidos}
              onChange={evento => alterarListaTexto("titulosExcluidos", evento.target.value)}
              rows={10}
              className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>
        </div>
      </details>

      {erro && (
        <div className="fixed bottom-20 right-5 z-50 max-w-sm rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-medium text-rose-600 shadow-lg dark:border-rose-900 dark:bg-slate-950">
          {erro}
        </div>
      )}

      <div
        className={[
          "fixed bottom-5 right-5 z-50 transition-all duration-300 ease-out",

          possuiAlteracoes || salvando
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        ].join(" ")}
      >
        <button
          type="button"
          disabled={salvando || !possuiAlteracoes}
          onClick={salvarPerfil}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/15 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {salvando ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />}

          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  )
}
