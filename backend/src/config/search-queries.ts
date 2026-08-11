/**
 * Mantenho as consultas nacionais como base da descoberta.
 *
 * As buscas por cidades são complementares e nunca substituem a
 * cobertura de oportunidades disponíveis em qualquer região do Brasil.
 */
const consultasGerais = [
  '("Technical Support" OR "Application Support" OR "Product Support") (Brazil OR Brasil OR LATAM) -salary -salaries -course -curso',

  '("IT Support" OR "Support Analyst" OR "Support Engineer") (Brazil OR Brasil) -salary -salaries',

  '("Analista de Suporte" OR "Suporte Técnico" OR "Analista de Sistemas") Brasil -curso -salário',

  '("Analista de Implantação" OR "Implementation Analyst" OR "Implementation Specialist") (Brazil OR Brasil)',

  '("NOC Analyst" OR "Analista NOC" OR "Monitoring Analyst" OR "Observability Analyst") (Brazil OR Brasil)',

  '("Analista de Infraestrutura" OR "IT Operations" OR "Service Desk") Brasil',

  '("Technical Customer Success" OR "Customer Onboarding" OR "Customer Support Engineer") (Brazil OR Brasil)'
]

/**
 * Agrupo polos de tecnologia para ampliar a cobertura presencial e
 * híbrida sem criar uma consulta separada para cada cidade.
 */
const gruposPolos = [
  [
    '"São Paulo"',
    "Campinas",
    "Barueri",
    "Osasco",
    '"São José dos Campos"'
  ],

  [
    '"Rio de Janeiro"',
    '"Belo Horizonte"',
    "Uberlândia",
    "Vitória"
  ],

  [
    "Curitiba",
    "Florianópolis",
    "Joinville",
    '"Porto Alegre"'
  ],

  [
    "Recife",
    "Fortaleza",
    "Salvador",
    '"João Pessoa"',
    '"Campina Grande"'
  ],

  [
    "Brasília",
    "Goiânia"
  ]
]

const cargosParaPolos = [
  '"Analista de Suporte"',
  '"Suporte Técnico"',
  '"Help Desk"',
  '"Service Desk"',
  '"Analista de Sistemas"',
  '"Analista de Implantação"',
  '"Analista de Infraestrutura"',
  '"NOC Analyst"',
  '"IT Support"'
].join(" OR ")

const consultasPolos =
  gruposPolos.map(
    (cidades) =>
      `(${cargosParaPolos}) (${cidades.join(" OR ")})`
  )

/**
 * Busco especificamente páginas individuais do LinkedIn.
 *
 * Evito páginas genéricas de pesquisa porque meu objetivo aqui é
 * descobrir oportunidades concretas que depois possam ser relacionadas
 * à publicação oficial da empresa ou do ATS.
 */
const consultasLinkedIn = [
  'site:linkedin.com/jobs/view ("Technical Support" OR "Application Support" OR "Product Support") (Brazil OR Brasil)',

  'site:linkedin.com/jobs/view ("IT Support" OR "Service Desk" OR "NOC") (Brazil OR Brasil)',

  'site:br.linkedin.com/jobs/view ("Analista de Suporte" OR "Suporte Técnico" OR "Analista de Sistemas")',

  'site:br.linkedin.com/jobs/view ("Analista de Implantação" OR "Analista de Infraestrutura" OR "Service Desk")'
]

/**
 * No Indeed também busco somente páginas viewjob.
 *
 * Isso reduz resultados como páginas de salário, pesquisa por cargo
 * e listagens com dezenas de vagas.
 */
const consultasIndeed = [
  'site:br.indeed.com/viewjob ("Analista de Suporte" OR "Suporte Técnico" OR "Help Desk")',

  'site:br.indeed.com/viewjob ("Analista de Sistemas" OR "Analista de Implantação" OR "Analista de Infraestrutura")',

  'site:br.indeed.com/viewjob ("Technical Support" OR "Application Support" OR "IT Support")',

  'site:br.indeed.com/viewjob ("Service Desk" OR "NOC" OR "Customer Support Engineer")'
]

/**
 * Faço buscas específicas nos ATS que já consigo processar.
 *
 * Evito termos excessivamente genéricos como apenas "IT", que estavam
 * trazendo vagas sem relação com meu objetivo profissional.
 */
const consultasAts = [
  'site:gupy.io ("Analista de Suporte" OR "Suporte Técnico" OR "Help Desk")',

  'site:gupy.io ("Analista de Sistemas" OR "Analista de Implantação" OR "Analista de Infraestrutura" OR "NOC")',

  'site:jobs.lever.co (Brazil OR Brasil) ("Technical Support" OR "Application Support" OR "Support Engineer" OR "Implementation")',

  'site:boards.greenhouse.io (Brazil OR Brasil) ("Technical Support" OR "Application Support" OR "Support Engineer" OR "Implementation")',

  'site:job-boards.greenhouse.io (Brazil OR Brasil) ("Technical Support" OR "Application Support" OR "Support Engineer" OR "Implementation")',

  'site:apply.workable.com (Brazil OR Brasil) ("Technical Support" OR "Application Support" OR "Support Engineer" OR "Implementation Consultant")',

  'site:jobs.smartrecruiters.com (Brazil OR Brasil) ("Technical Support" OR "Application Support" OR "Service Desk" OR "Implementation")'
]

/**
 * Mantenho portais brasileiros como fontes complementares de descoberta.
 */
const consultasPortais = [
  'site:vagas.com.br ("Analista de Suporte" OR "Suporte Técnico" OR "Analista de Sistemas")',

  'site:infojobs.com.br ("Analista de Suporte" OR "Suporte Técnico" OR "Analista de Sistemas")',

  'site:catho.com.br ("Analista de Suporte" OR "Suporte Técnico" OR "Analista de Sistemas")'
]

/**
 * Remotive já possui coletor próprio, mas os resultados encontrados
 * aqui continuam úteis para medir a cobertura da descoberta.
 */
const consultasRemotas = [
  'site:remoteok.com/remote-jobs ("Technical Support" OR "Customer Support" OR "IT Support") Brazil',

  'site:remotive.com/remote/jobs ("Technical Support" OR "Application Support" OR "Customer Support") Brazil'
]

/**
 * Uso Set para nunca enviar a mesma consulta duas vezes por engano.
 */
export const consultasBuscaVagas = [
  ...new Set([
    ...consultasGerais,
    ...consultasPolos,
    ...consultasLinkedIn,
    ...consultasIndeed,
    ...consultasAts,
    ...consultasPortais,
    ...consultasRemotas
  ])
]