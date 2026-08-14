/**
 * Centralizo aqui todas as estratégias de descoberta de vagas.
 *
 * Mantenho cada consulta como uma string simples porque o controle de
 * cache, rotação e limite diário de chamadas fica no serviço de
 * descoberta.
 *
 * Dessa forma evito espalhar regras de consumo da Brave pela aplicação.
 */

/**
 * Buscas nacionais mais amplas.
 *
 * Uso diferentes nomenclaturas porque empresas podem anunciar funções
 * muito semelhantes com títulos diferentes.
 */
const consultasGerais = [
  '("Technical Support" OR "Application Support" OR "Product Support" OR "Support Engineer") (Brazil OR Brasil)',

  '("Analista de Suporte" OR "Suporte Técnico" OR "Analista de Sustentação" OR "Analista de Aplicações" OR "Analista de Sistemas") Brasil',

  '("Service Desk" OR "Help Desk" OR "Desktop Support" OR "Field Service" OR "IT Support") Brasil',

  '("Analista de Infraestrutura" OR "Analista NOC" OR "NOC Analyst" OR "Monitoring Analyst" OR "Analista de Monitoramento") Brasil',

  '("Analista de Implantação" OR "Implementation Analyst" OR "Implementation Specialist" OR "Customer Onboarding") (Brazil OR Brasil)',

  '("Technical Customer Success" OR "Customer Support Engineer" OR "Production Support" OR "Application Analyst") (Brazil OR Brasil)'
]

/**
 * Também uso algumas competências fortes como entrada.
 *
 * Isso ajuda a encontrar oportunidades cujo título não segue exatamente
 * as nomenclaturas tradicionais de suporte ou infraestrutura.
 */
const consultasCompetencias = [
  '("Zabbix" OR "Grafana" OR "Active Directory" OR "Windows Server") (suporte OR analista OR NOC) Brasil',

  '("SQL" OR "PostgreSQL" OR "Postman") ("Application Support" OR "Technical Support" OR "Analista de Suporte") Brazil',

  '("Jira" OR "Elasticsearch" OR "Análise de Logs") ("Analista de Suporte" OR "Application Support" OR "Sustentação") Brasil',

  '("Power BI" OR "Análise de Dados") ("Analista de Dados" OR "Analista de BI" OR "Data Analyst") Brasil',

  '("Sistema Hospitalar" OR "Sistemas Hospitalares" OR "Healthcare IT") (suporte OR sistemas OR implantação OR application) Brasil'
]

/**
 * Busco páginas individuais do LinkedIn.
 *
 * Não uso páginas genéricas de pesquisa porque quero preservar
 * oportunidades concretas que possam ser apresentadas diretamente.
 */
const consultasLinkedIn = [
  'site:linkedin.com/jobs/view ("Technical Support" OR "Application Support" OR "Support Engineer") Brazil',

  'site:br.linkedin.com/jobs/view ("Analista de Suporte" OR "Suporte Técnico" OR "Service Desk" OR "Help Desk")',

  'site:br.linkedin.com/jobs/view ("Analista de Sistemas" OR "Analista de Sustentação" OR "Analista de Aplicações" OR "Analista de Implantação" OR "Analista de Infraestrutura")',

  'site:br.linkedin.com/jobs/view ("NOC" OR "Monitoramento" OR "Field Service" OR "Desktop Support")'
]

/**
 * No Indeed também priorizo páginas individuais.
 */
const consultasIndeed = [
  'site:br.indeed.com/viewjob ("Analista de Suporte" OR "Suporte Técnico" OR "Service Desk" OR "Help Desk")',

  'site:br.indeed.com/viewjob ("Analista de Sistemas" OR "Analista de Sustentação" OR "Analista de Aplicações" OR "Analista de Implantação")',

  'site:br.indeed.com/viewjob ("Analista de Infraestrutura" OR "NOC" OR "Field Service" OR "Monitoramento")',

  'site:br.indeed.com/viewjob ("Technical Support" OR "Application Support" OR "IT Support" OR "Support Engineer")'
]

/**
 * Consulto diretamente os ATS que já possuo capacidade de reconhecer
 * e, em alguns casos, extrair de forma estruturada.
 */
const consultasAts = [
  'site:gupy.io ("Analista de Suporte" OR "Suporte Técnico" OR "Service Desk" OR "Help Desk")',

  'site:gupy.io ("Analista de Sistemas" OR "Analista de Sustentação" OR "Analista de Implantação" OR "Analista de Infraestrutura" OR "NOC")',

  'site:jobs.lever.co (Brazil OR Brasil) ("Technical Support" OR "Application Support" OR "Support Engineer" OR "Implementation")',

  'site:boards.greenhouse.io (Brazil OR Brasil) ("Technical Support" OR "Application Support" OR "Support Engineer" OR "Implementation")',

  'site:job-boards.greenhouse.io (Brazil OR Brasil) ("Technical Support" OR "Application Support" OR "Support Engineer" OR "Implementation")',

  'site:apply.workable.com (Brazil OR Brasil) ("Technical Support" OR "Application Support" OR "Support Engineer" OR "Implementation")',

  'site:jobs.smartrecruiters.com (Brazil OR Brasil) ("Technical Support" OR "Application Support" OR "Service Desk" OR "Implementation")'
]

/**
 * Acrescento ATS relevantes no mercado brasileiro como fontes de
 * descoberta.
 *
 * Nesta primeira versão não crio coletores específicos para eles.
 * Utilizo a descoberta web existente e mantenho o fluxo de candidatura
 * manual no site original.
 */
const consultasAtsComplementares = [
  'site:vagas.solides.com.br ("Analista de Suporte" OR "Suporte Técnico" OR "Analista de Sistemas" OR "Analista de Infraestrutura" OR "Analista de Implantação")',

  'site:pandape.infojobs.com.br ("Analista de Suporte" OR "Suporte Técnico" OR "Analista de Sistemas" OR "Analista de Infraestrutura" OR "Service Desk")',

  'site:pandape.catho.com.br ("Analista de Suporte" OR "Suporte Técnico" OR "Analista de Sistemas" OR "Analista de Infraestrutura")',

  'site:myworkdayjobs.com ("Analista de Suporte" OR "Technical Support" OR "Application Support" OR "IT Support") Brazil',

  'site:myworkdayjobs.com ("Analista de Sistemas" OR "Analista de Infraestrutura" OR "Implementation Analyst" OR "Support Engineer") Brazil',

  'site:myworkdaysite.com ("Technical Support" OR "Application Support" OR "IT Support" OR "Analista de Suporte") Brazil'
]

/**
 * Reforço alguns polos tecnológicos sem transformar cidade em filtro.
 *
 * As buscas nacionais continuam sendo a principal cobertura e qualquer
 * oportunidade brasileira continua sendo elegível.
 */
const consultasPolos = [
  '("Analista de Suporte" OR "Service Desk" OR "IT Support") ("São Paulo" OR Campinas OR Barueri OR Osasco OR "São José dos Campos")',

  '("Analista de Suporte" OR "Analista de Sistemas" OR "IT Support") (Curitiba OR Florianópolis OR Joinville OR "Porto Alegre")',

  '("Analista de Suporte" OR "Service Desk" OR "Analista de Sistemas") (Recife OR Fortaleza OR Salvador OR "João Pessoa" OR "Campina Grande")',

  '("Analista de Suporte" OR "Analista de Infraestrutura" OR "Service Desk") ("Belo Horizonte" OR Uberlândia OR Brasília OR Goiânia)'
]

/**
 * Mantenho portais brasileiros como fontes complementares.
 */
const consultasPortais = [
  'site:vagas.com.br ("Analista de Suporte" OR "Suporte Técnico" OR "Analista de Sistemas" OR "Analista de Infraestrutura")',

  'site:infojobs.com.br ("Analista de Suporte" OR "Suporte Técnico" OR "Analista de Sistemas" OR "Analista de Infraestrutura")',

  'site:catho.com.br ("Analista de Suporte" OR "Suporte Técnico" OR "Analista de Sistemas")'
]

/**
 * Fontes voltadas a trabalho remoto continuam complementando a busca.
 */
const consultasRemotas = [
  'site:remoteok.com/remote-jobs ("Technical Support" OR "Customer Support" OR "IT Support") Brazil',

  'site:remotive.com/remote/jobs ("Technical Support" OR "Application Support" OR "Customer Support") Brazil'
]

/**
 * Uso Set para impedir consultas duplicadas.
 *
 * A rotação e o limite diário são controlados posteriormente pelo
 * job-discovery.ts, então esta lista pode ser maior sem significar que
 * todas as consultas serão executadas no mesmo dia.
 */
export const consultasBuscaVagas = [
  ...new Set([
    ...consultasGerais,
    ...consultasCompetencias,
    ...consultasLinkedIn,
    ...consultasIndeed,
    ...consultasAts,
    ...consultasAtsComplementares,
    ...consultasPolos,
    ...consultasPortais,
    ...consultasRemotas
  ])
]