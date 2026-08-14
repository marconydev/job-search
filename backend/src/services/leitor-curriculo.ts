import { extname } from "node:path"

import mammoth from "mammoth"

import { PDFParse } from "pdf-parse"

/**
 * Eu limito os formatos porque são os que consigo interpretar de forma
 * confiável nesta primeira versão.
 */
const EXTENSOES_PERMITIDAS = new Set([".pdf", ".docx", ".txt"])

export function arquivoCurriculoEhPermitido(nomeArquivo: string) {
  const extensao = extname(nomeArquivo).toLowerCase()

  return EXTENSOES_PERMITIDAS.has(extensao)
}

function limparTextoExtraido(texto: string) {
  return texto
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
}

/**
 * Eu leio PDF diretamente do Buffer recebido pelo upload.
 *
 * O arquivo não precisa ser salvo no servidor.
 */
async function lerPdf(buffer: Buffer) {
  const parser = new PDFParse({
    data: buffer
  })

  try {
    const resultado = await parser.getText()

    return resultado.text
  } finally {
    /**
     * Libero os recursos utilizados internamente pelo parser depois da
     * leitura.
     */
    await parser.destroy()
  }
}

/**
 * Para DOCX eu quero somente o texto bruto.
 *
 * Formatação, imagens e estilos do currículo não são necessários para
 * montar o perfil profissional.
 */
async function lerDocx(buffer: Buffer) {
  const resultado = await mammoth.extractRawText({
    buffer
  })

  return resultado.value
}

function lerTxt(buffer: Buffer) {
  return buffer.toString("utf8")
}

export async function extrairTextoCurriculo(arquivo: Express.Multer.File) {
  const extensao = extname(arquivo.originalname).toLowerCase()

  let texto = ""

  switch (extensao) {
    case ".pdf":
      texto = await lerPdf(arquivo.buffer)

      break

    case ".docx":
      texto = await lerDocx(arquivo.buffer)

      break

    case ".txt":
      texto = lerTxt(arquivo.buffer)

      break

    default:
      throw new Error("Formato de currículo não suportado")
  }

  const textoLimpo = limparTextoExtraido(texto)

  /**
   * PDFs digitalizados como imagem normalmente retornam nenhum texto ou
   * uma quantidade muito pequena.
   *
   * Nesta versão prefiro informar isso claramente em vez de fingir que
   * consegui interpretar o documento.
   */
  if (textoLimpo.length < 50) {
    throw new Error(
      "Não consegui encontrar texto suficiente no arquivo. Se for um PDF digitalizado como imagem, será necessário OCR."
    )
  }

  return textoLimpo
}
