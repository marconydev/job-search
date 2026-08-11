import type { JobCollector } from "../types/collector.js"

import { remotiveCollector } from "./remotive.js"

/**
 * Fontes que participam da sincronização geral.
 *
 * Para adicionar um novo coletor, basta implementá-lo e registrá-lo aqui.
 * O restante do processo não precisa conhecer a origem das vagas.
 */
export const collectors: JobCollector[] = [
  remotiveCollector
]