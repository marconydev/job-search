import type { JobCollector } from "../types/collector.js"

import { gupyCollector } from "./gupy.js"

import { solidesCollector } from "./solides.js"

import { vagasComCollector } from "./vagas-com.js"

import { geekHunterCollector } from "./geekhunter.js"

import { getOnBoardCollector } from "./getonboard.js"

import { arbeitnowCollector } from "./arbeitnow.js"

import { jobicyCollector } from "./jobicy.js"

import { remotiveCollector } from "./remotive.js"

import { remoteOkCollector } from "./remote-ok.js"

/**
 * Fontes consultadas diretamente sem depender da Brave.
 *
 * Ordem:
 *
 * 1. grandes portais brasileiros;
 * 2. fontes tech relevantes para Brasil;
 * 3. fontes internacionais/remotas complementares.
 *
 * Cada coletor implementa o mesmo contrato JobCollector, portanto uma
 * integração pode ser adicionada, desativada ou substituída sem alterar
 * matcher, persistência ou dashboard.
 */
export const collectors: JobCollector[] = [
  gupyCollector,

  solidesCollector,

  vagasComCollector,

  geekHunterCollector,

  getOnBoardCollector,

  remotiveCollector,

  remoteOkCollector,

  jobicyCollector,

  arbeitnowCollector
]
