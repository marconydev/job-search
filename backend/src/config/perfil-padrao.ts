import type { PerfilProfissional } from "../types/perfil-profissional.js"

/**
 * Mantenho aqui somente o perfil usado quando ainda não existe um perfil
 * profissional salvo no banco.
 *
 * Depois que o perfil é persistido, a aplicação passa a utilizar os
 * dados armazenados normalmente.
 */
export function criarPerfilProfissionalPadrao(): PerfilProfissional {
  return {
    resumoProfissional: "",

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

    competencias: [
      {
        nome: "SQL",
        termos: ["sql"]
      },
      {
        nome: "PostgreSQL",
        termos: ["postgresql", "postgres"]
      },
      {
        nome: "SQLite",
        termos: ["sqlite"]
      },
      {
        nome: "MongoDB",
        termos: ["mongodb", "mongo db"]
      },
      {
        nome: "DBeaver",
        termos: ["dbeaver"]
      },
      {
        nome: "Análise de dados",
        termos: ["analise de dados", "data analysis", "data analytics"]
      },
      {
        nome: "Power BI",
        termos: ["power bi", "powerbi"]
      },
      {
        nome: "Linux",
        termos: ["linux"]
      },
      {
        nome: "Windows",
        termos: ["windows"]
      },
      {
        nome: "Windows Server",
        termos: ["windows server"]
      },
      {
        nome: "Active Directory",
        termos: ["active directory", "azure ad", "entra id"]
      },
      {
        nome: "APIs REST",
        termos: ["rest api", "restful api", "api rest", "api restful", "api"]
      },
      {
        nome: "Postman",
        termos: ["postman"]
      },
      {
        nome: "Zabbix",
        termos: ["zabbix"]
      },
      {
        nome: "Grafana",
        termos: ["grafana"]
      },
      {
        nome: "Elastic / Elasticsearch",
        termos: ["elasticsearch", "elastic stack", "elk stack", "elastic"]
      },
      {
        nome: "Análise de logs",
        termos: [
          "analise de logs",
          "log analysis",
          "logs analysis",
          "log monitoring",
          "troubleshooting de logs"
        ]
      },
      {
        nome: "JavaScript",
        termos: ["javascript", "java script"]
      },
      {
        nome: "TypeScript",
        termos: ["typescript", "type script"]
      },
      {
        nome: "Node.js",
        termos: ["node.js", "nodejs", "node js"]
      },
      {
        nome: "React",
        termos: ["react", "react.js", "reactjs"]
      },
      {
        nome: "Next.js",
        termos: ["next.js", "nextjs", "next js"]
      },
      {
        nome: "HTML5",
        termos: ["html5", "html"]
      },
      {
        nome: "CSS",
        termos: ["css", "css3"]
      },
      {
        nome: "Git",
        termos: ["git"]
      },
      {
        nome: "GitHub",
        termos: ["github"]
      },
      {
        nome: "Jira",
        termos: ["jira", "atlassian jira"]
      },
      {
        nome: "Redes",
        termos: ["network", "networking", "redes", "rede de computadores"]
      },
      {
        nome: "TCP/IP",
        termos: ["tcp/ip", "tcp ip"]
      },
      {
        nome: "VLAN",
        termos: ["vlan", "vlans", "virtual lan"]
      },
      {
        nome: "Switches",
        termos: [
          "network switch",
          "network switches",
          "switch de rede",
          "switches de rede",
          "switch gerenciavel",
          "switch gerenciável"
        ]
      },
      {
        nome: "Access Points",
        termos: [
          "access point",
          "access points",
          "wireless access point",
          "ponto de acesso",
          "pontos de acesso",
          "unifi"
        ]
      },
      {
        nome: "Firewall",
        termos: ["firewall", "firewalls"]
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
        termos: ["technical support", "suporte tecnico"]
      },
      {
        nome: "Suporte N1/N2/N3",
        termos: [
          "suporte n1",
          "suporte n2",
          "suporte n3",
          "nivel 1",
          "nivel 2",
          "nivel 3",
          "level 1 support",
          "level 2 support",
          "level 3 support",
          "l1 support",
          "l2 support",
          "l3 support"
        ]
      },
      {
        nome: "Suporte ao cliente",
        termos: ["customer support", "suporte ao cliente"]
      },
      {
        nome: "Gestão de incidentes",
        termos: ["incident management", "gestao de incidentes"]
      },
      {
        nome: "Service Desk",
        termos: ["service desk"]
      },
      {
        nome: "Gestão de demandas",
        termos: [
          "gestao de demandas",
          "demand management",
          "gestao de chamados",
          "ticket management"
        ]
      },
      {
        nome: "SLA / KPI",
        termos: [
          "sla",
          "slas",
          "kpi",
          "kpis",
          "indicadores de desempenho",
          "service level agreement"
        ]
      },
      {
        nome: "BPM / Automação de processos",
        termos: [
          "bpm",
          "business process management",
          "automacao de processos",
          "process automation",
          "workflow automation"
        ]
      },
      {
        nome: "Análise de processos",
        termos: [
          "analise de processos",
          "process analysis",
          "process improvement",
          "melhoria de processos"
        ]
      },
      {
        nome: "Análise de requisitos",
        termos: [
          "analise de requisitos",
          "requirements analysis",
          "levantamento de requisitos",
          "requirements gathering"
        ]
      },
      {
        nome: "Implantação de sistemas",
        termos: [
          "implantacao de sistemas",
          "implementacao de sistemas",
          "system implementation",
          "software implementation",
          "implementation"
        ]
      },
      {
        nome: "Documentação técnica",
        termos: [
          "documentacao tecnica",
          "technical documentation",
          "documentacao de sistemas",
          "procedimentos tecnicos"
        ]
      },
      {
        nome: "Sistemas hospitalares",
        termos: [
          "sistema hospitalar",
          "sistemas hospitalares",
          "sistema de gestao hospitalar",
          "sistema de gestão hospitalar",
          "hospital information system",
          "hospital information systems",
          "healthcare information system",
          "healthcare it",
          "his",
          "wareline"
        ]
      },
      {
        nome: "SaaS",
        termos: ["saas"]
      }
    ],

    experiencias: [],

    formacoes: [],

    cursos: [],

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
}
