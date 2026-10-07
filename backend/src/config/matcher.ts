/**
 * Incremento esta versão sempre que uma mudança de regra exigir
 * reanálise das oportunidades já classificadas.
 *
 * Versão 2:
 * - modalidade da Gupy baseada em dados estruturados;
 * - vagas não remotas somente em João Pessoa/PB.
 *
 * Versão 3:
 * - removida a trava geográfica de João Pessoa/PB (M3);
 * - títulos fora do foco em português passam a descontar score (M4).
 */
export const MATCHER_VERSION = 3

/**
 * Corte único de relevância.
 *
 * Centralizado aqui para eliminar os números hardcoded em
 * job-analysis.ts, filtragem-vagas.ts e processamento-vagas-web.ts.
 */
export const MIN_SCORE_RELEVANT = 60

/**
 * Desconto aplicado quando o título não contém marcador brasileiro,
 * mas a vaga é permitida porque a localização/descrição indica Brasil.
 *
 * Valor escolhido para exigir mais de um sinal positivo antes do corte.
 */
export const PENALIDADE_TITULO_FORA_FOCO = 15
