/**
 * Mantenho neste perfil os cargos e competências que realmente fazem
 * sentido para a minha busca profissional atual.
 *
 * Separo cargos principais de cargos relacionados porque uma vaga de
 * suporte deve ter mais peso que uma oportunidade apenas próxima da área.
 */
export const perfilBusca = {
  cargosPrincipais: [
    "technical support",
    "technical support analyst",
    "technical support specialist",
    "support analyst",
    "support specialist",
    "support engineer",
    "application support",
    "application support analyst",
    "product support",
    "product support analyst",
    "software support",
    "customer support engineer",
    "it support",
    "it support analyst",
    "help desk",
    "help desk analyst",
    "service desk analyst",
    "service desk",
    "desktop support",
    "desktop support analyst",
    "field service",
    "field service analyst",
    "support technician",
    "it technician",
    "technical service analyst",

    "analista de suporte",
    "analista de suporte tecnico",
    "suporte tecnico",
    "analista de ti",
    "analista de sistemas",
    "analista de sustentacao",
    "analista de aplicacoes",
    "analista de application",
    "analista de service desk",
    "analista de help desk",
    "analista de field service",
    "tecnico de suporte",
    "tecnico de ti",
    "analista de infraestrutura",
    "analista de implantacao",

    "implementation analyst",
    "implementation specialist",
    "noc analyst",
    "analista noc",
    "analista de noc"
  ],

  /**
   * Considero estes cargos aderentes, mas com peso um pouco menor
   * porque podem variar bastante de empresa para empresa.
   */
  cargosRelacionados: [
    "it analyst",
    "customer onboarding",
    "onboarding specialist",
    "technical customer success",
    "customer success technical",
    "it operations",
    "application analyst",
    "systems support analyst",
    "production support",
    "production support analyst",
    "application operations",
    "ams analyst",
    "support operations",
    "technical operations",
    "monitoring analyst",
    "observability analyst",
    "analista de monitoramento",
    "analista de observabilidade",

    "data analyst",
    "analista de dados",
    "bi analyst",
    "analista de bi",
    "business intelligence analyst"
  ],

  /**
   * Uso estes termos para reconhecer cargos tecnicamente próximos,
   * mas que representam outra trilha profissional.
   *
   * Não rejeito pela tecnologia encontrada na descrição; avalio
   * principalmente o cargo para evitar falsos positivos.
   */
  cargosDesvio: [
    "software engineer",
    "software developer",
    "developer",
    "desenvolvedor",
    "desenvolvedora",
    "full stack",
    "fullstack",
    "backend engineer",
    "backend developer",
    "frontend engineer",
    "frontend developer",
    "devops",
    "site reliability engineer",
    "sre",
    "data engineer",
    "analytics engineer",
    "ai engineer",
    "machine learning engineer",
    "security engineer",
    "tech lead"
  ],

  /**
   * Agrupo sinônimos da mesma competência para contabilizar o
   * conhecimento somente uma vez.
   *
   * Por exemplo, "API", "REST API" e "RESTful API" representam um
   * único conceito na pontuação.
   */
  competencias: [
    {
      nome: "SQL",
      termos: [
        "sql"
      ]
    },
    {
      nome: "PostgreSQL",
      termos: [
        "postgresql",
        "postgres"
      ]
    },
    {
      nome: "Linux",
      termos: [
        "linux"
      ]
    },
    {
      nome: "Windows",
      termos: [
        "windows"
      ]
    },
    {
      nome: "Windows Server",
      termos: [
        "windows server"
      ]
    },
    {
      nome: "Active Directory",
      termos: [
        "active directory"
      ]
    },
    {
      nome: "APIs REST",
      termos: [
        "rest api",
        "restful api",
        "api rest",
        "api restful",
        "api"
      ]
    },
    {
      nome: "Postman",
      termos: [
        "postman"
      ]
    },
    {
      nome: "Zabbix",
      termos: [
        "zabbix"
      ]
    },
    {
      nome: "Grafana",
      termos: [
        "grafana"
      ]
    },
    {
      nome: "JavaScript",
      termos: [
        "javascript"
      ]
    },
    {
      nome: "TypeScript",
      termos: [
        "typescript"
      ]
    },
    {
      nome: "Node.js",
      termos: [
        "node.js",
        "nodejs",
        "node js"
      ]
    },
    {
      nome: "React",
      termos: [
        "react",
        "react.js",
        "reactjs"
      ]
    },
    {
      nome: "Next.js",
      termos: [
        "next.js",
        "nextjs",
        "next js"
      ]
    },
    {
      nome: "Git",
      termos: [
        "git"
      ]
    },
    {
      nome: "GitHub",
      termos: [
        "github"
      ]
    },
    {
      nome: "Redes",
      termos: [
        "network",
        "networking",
        "redes",
        "rede de computadores"
      ]
    },
    {
      nome: "TCP/IP",
      termos: [
        "tcp/ip",
        "tcp ip"
      ]
    },
    {
      nome: "Troubleshooting",
      termos: [
        "troubleshooting",
        "troubleshoot",
        "diagnostico de problemas",
        "resolucao de problemas"
      ]
    },
    {
      nome: "Suporte técnico",
      termos: [
        "technical support",
        "suporte tecnico"
      ]
    },
    {
      nome: "Suporte ao cliente",
      termos: [
        "customer support",
        "suporte ao cliente"
      ]
    },
    {
      nome: "Gestão de incidentes",
      termos: [
        "incident management",
        "gestao de incidentes"
      ]
    },
    {
      nome: "Service Desk",
      termos: [
        "service desk"
      ]
    },
    {
      nome: "SaaS",
      termos: [
        "saas"
      ]
    }
  ],

  localizacoesAceitas: [
    "worldwide",
    "anywhere",
    "global",
    "brazil",
    "brasil",
    "latin america",
    "latam",
    "south america",
    "americas"
  ],

  /**
   * Estes títulos representam níveis ou tipos de vaga que não fazem
   * sentido para a minha busca atual.
   */
  titulosExcluidos: [
    "intern",
    "internship",
    "estagio",
    "estagiario",
    "trainee",
    "director",
    "diretor",
    "head of",
    "vice president",
    "principal engineer",
    "staff engineer"
  ]
}