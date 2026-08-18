import type { PerfilProfissional } from "../types/perfil-profissional.js"

/**
 * Eu mantenho aqui somente um perfil inicial genérico.
 *
 * Ele é utilizado quando ainda não existe um perfil profissional salvo
 * no banco. Depois que o usuário personaliza e salva o perfil, a
 * aplicação passa a utilizar exclusivamente os dados persistidos.
 */
export function criarPerfilProfissionalPadrao(): PerfilProfissional {
  return {
    resumoProfissional: "",

    cargosPrincipais: [
      "analista de suporte",
      "technical support",
      "support analyst",
      "it support",
      "application support",
      "analista de sistemas",
      "analista de infraestrutura",
      "analista de implantacao"
    ],

    cargosRelacionados: [
      "service desk analyst",
      "help desk analyst",
      "noc analyst",
      "analista noc",
      "monitoring analyst",
      "analista de monitoramento",
      "implementation analyst",
      "customer onboarding",
      "data analyst",
      "analista de dados",
      "bi analyst",
      "analista de bi"
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
      "machine learning engineer",
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
        nome: "Windows",
        termos: ["windows"]
      },
      {
        nome: "Windows Server",
        termos: ["windows server"]
      },
      {
        nome: "Linux",
        termos: ["linux"]
      },
      {
        nome: "Active Directory",
        termos: ["active directory", "entra id", "azure ad"]
      },
      {
        nome: "APIs REST",
        termos: ["rest api", "restful api", "api rest", "api restful"]
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
        nome: "Análise de logs",
        termos: ["analise de logs", "log analysis", "log monitoring", "troubleshooting de logs"]
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
        nome: "Service Desk",
        termos: ["service desk"]
      },
      {
        nome: "Gestão de incidentes",
        termos: ["incident management", "gestao de incidentes"]
      },
      {
        nome: "SLA / KPI",
        termos: [
          "sla",
          "slas",
          "kpi",
          "kpis",
          "service level agreement",
          "indicadores de desempenho"
        ]
      },
      {
        nome: "Implantação de sistemas",
        termos: [
          "implantacao de sistemas",
          "implementacao de sistemas",
          "system implementation",
          "software implementation"
        ]
      },
      {
        nome: "Análise de dados",
        termos: ["analise de dados", "data analysis", "data analytics"]
      },
      {
        nome: "Power BI",
        termos: ["power bi", "powerbi"]
      }
    ],

    experiencias: [],

    formacoes: [],

    cursos: [],

    localizacoesAceitas: [
      "Brasil",
      "Brazil",
      "LATAM",
      "Latin America",
      "South America",
      "Americas",
      "Worldwide",
      "Anywhere",
      "Global"
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
