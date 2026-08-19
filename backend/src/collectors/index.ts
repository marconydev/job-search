import type { JobCollector } from "../types/collector.js"

import { gupyCollector } from "./gupy.js"

import { solidesCollector } from "./solides.js"

import { arbeitnowCollector } from "./arbeitnow.js"

import { jobicyCollector } from "./jobicy.js"

import { remotiveCollector } from "./remotive.js"

import { remoteOkCollector } from "./remote-ok.js"

/**
 * Estas fontes podem ser consultadas diretamente sem depender da Brave.
 *
 * Gupy e Sólides ficam primeiro porque são duas das principais fontes
 * brasileiras utilizadas pela aplicação e possuem busca nativa por cargo.
 *
 * ATS baseados em empresas, como Lever e Greenhouse, continuam sendo
 * tratados separadamente porque primeiro precisamos descobrir qual
 * organização ou job board deve ser consultado.
 */
export const collectors: JobCollector[] = [
  gupyCollector,
  solidesCollector,
  remotiveCollector,
  remoteOkCollector,
  jobicyCollector,
  arbeitnowCollector
]