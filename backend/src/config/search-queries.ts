/**
 * Eu mantenho exatamente 30 estratégias principais de descoberta.
 *
 * Com o orçamento atual da Brave consigo executar este conjunto completo
 * uma vez por dia sem depender de uma rotação de vários dias.
 *
 * Priorizo primeiro os portais e ATS onde encontro mais vagas brasileiras
 * e depois complemento com buscas abertas por cargo e especialidade.
 */
export const consultasBuscaVagas = [
  // Gupy
  'site:gupy.io "Analista de Suporte" Brasil',
  'site:gupy.io "Analista de Sistemas" Brasil',
  'site:gupy.io "Analista de Infraestrutura" Brasil',
  'site:gupy.io ("Analista de Implantação" OR "Analista de Sustentação") Brasil',

  // LinkedIn
  'site:br.linkedin.com/jobs/view "Analista de Suporte"',
  'site:br.linkedin.com/jobs/view "Analista de Sistemas"',
  'site:br.linkedin.com/jobs/view ("Application Support" OR "Technical Support") Brazil',
  'site:br.linkedin.com/jobs/view ("NOC" OR "Infraestrutura" OR "Service Desk") Brasil',

  // Indeed
  'site:br.indeed.com/viewjob "Analista de Suporte"',
  'site:br.indeed.com/viewjob "Analista de Sistemas"',
  'site:br.indeed.com/viewjob ("Infraestrutura" OR "Service Desk" OR "NOC") Brasil',

  // Workday
  'site:myworkdayjobs.com ("Analista de Suporte" OR "Technical Support") Brazil',
  'site:myworkdayjobs.com ("Analista de Sistemas" OR "Application Support" OR "Implementation") Brazil',

  // Sólides
  'site:vagas.solides.com.br "Analista de Suporte"',
  'site:vagas.solides.com.br ("Analista de Sistemas" OR "Infraestrutura" OR "Implantação")',

  // Pandapé
  'site:pandape.infojobs.com.br ("Analista de Suporte" OR "Analista de Sistemas")',

  // Portais nacionais
  'site:vagas.com.br ("Analista de Suporte" OR "Analista de Sistemas" OR "Infraestrutura")',
  'site:infojobs.com.br ("Analista de Suporte" OR "Analista de Sistemas" OR "Service Desk")',
  'site:catho.com.br ("Analista de Suporte" OR "Analista de Sistemas" OR "Infraestrutura")',

  // ATS internacionais com vagas no Brasil
  'site:jobs.lever.co (Brazil OR Brasil) ("Technical Support" OR "Application Support" OR "Implementation")',
  'site:job-boards.greenhouse.io (Brazil OR Brasil) ("Technical Support" OR "Application Support" OR "Implementation")',
  'site:apply.workable.com (Brazil OR Brasil) ("Technical Support" OR "Application Support" OR "Implementation")',
  'site:jobs.smartrecruiters.com (Brazil OR Brasil) ("Technical Support" OR "Service Desk" OR "Implementation")',

  // Busca ampla na web
  '("Analista de Suporte" OR "Application Support" OR "Technical Support") Brasil',
  '("Analista de Sistemas" OR "Analista de Sustentação" OR "Analista de Aplicações") Brasil',
  '("Analista de Infraestrutura" OR "NOC" OR "Service Desk" OR "Monitoramento") Brasil',
  '("Analista de Implantação" OR "Customer Onboarding" OR "Implementation Analyst") Brasil',

  // Trilhas complementares compatíveis
  '("Power BI" OR "SQL") ("Analista de Dados" OR "Analista de BI" OR "Data Analyst") Brasil',
  '("Sistema Hospitalar" OR "Sistemas Hospitalares" OR "Healthcare IT" OR "ERP") (suporte OR implantação OR sistemas) Brasil',

  // Remoto
  '("Technical Support" OR "Application Support" OR "Customer Support Engineer") (remote OR remoto) Brazil'
]
