type DadosVaga = {
  title: string

  location: string | null

  remote: boolean
}

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function contemExpressao(texto: string, termo: string) {
  const normalizado = ` ${normalizarTexto(texto)} `

  const termoNormalizado = normalizarTexto(termo)

  return normalizado.includes(` ${termoNormalizado} `)
}

/**
 * O projeto prioriza títulos apresentados em português.
 *
 * Termos técnicos em inglês continuam permitidos quando fazem parte
 * de um título brasileiro, por exemplo:
 *
 * Analista de Service Desk
 * Analista NOC
 * Analista de Power BI
 */
const MARCADORES_TITULO_BRASIL = [
  "analista",
  "suporte",
  "tecnico",
  "tecnica",
  "sistemas",
  "infraestrutura",
  "implantacao",
  "implementacao",
  "processos",
  "dados",
  "negocios",
  "redes",
  "monitoramento",
  "administrador",
  "administradora",
  "consultor",
  "consultora",
  "especialista",
  "coordenador",
  "coordenadora",
  "assistente",
  "atendimento",
  "operacoes",
  "operacao"
]

export function tituloEstaNoFocoBrasil(titulo: string) {
  return MARCADORES_TITULO_BRASIL.some(marcador => contemExpressao(titulo, marcador))
}

/**
 * Para oportunidades que não são remotas, João Pessoa é a única
 * localização aceita nesta fase do projeto.
 *
 * Utilizo somente o campo estruturado de localização da vaga.
 *
 * Não procuro "João Pessoa" na descrição porque uma descrição pode
 * mencionar filiais, clientes, viagens ou outras localidades sem que
 * aquele seja o local real da vaga.
 */
export function vagaEstaEmJoaoPessoa(vaga: Pick<DadosVaga, "location">) {
  return contemExpressao(vaga.location ?? "", "joao pessoa")
}

/**
 * Regra geográfica atual:
 *
 * REMOTA:
 * pode seguir desde que a camada anterior tenha considerado a vaga
 * compatível ou potencialmente compatível com o Brasil.
 *
 * NÃO REMOTA:
 * presencial, híbrida ou modalidade não confirmada somente pode seguir
 * quando a localização indicar João Pessoa.
 *
 * Brasil x exterior continua sendo validado pela camada específica de
 * elegibilidade geográfica.
 */
export function avaliarPoliticaVagaBrasil(vaga: DadosVaga) {
  if (!tituloEstaNoFocoBrasil(vaga.title)) {
    return {
      permitida: false,

      motivo: "Título da vaga fora do foco brasileiro em português."
    }
  }

  if (vaga.remote) {
    return {
      permitida: true,

      motivo: null
    }
  }

  if (!vagaEstaEmJoaoPessoa(vaga)) {
    return {
      permitida: false,

      motivo: "Vaga presencial, híbrida ou sem modalidade remota confirmada fora de João Pessoa/PB."
    }
  }

  return {
    permitida: true,

    motivo: null
  }
}
