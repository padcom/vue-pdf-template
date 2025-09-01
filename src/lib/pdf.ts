import type { PageViewport, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import { getDocument, TextLayer } from 'pdfjs-dist'

import { Pool } from './pool'

const pool = new Pool<HTMLCanvasElement>({
  create() {
    return document.createElement('canvas')
  },
  destroy(canvas) {
    canvas.width = 0
    canvas.height = 0
  },
}, { max: 2, maxAge: 30000, cleanupInterval: 10000, maxWait: 5000 })

pool.start()

/**
 * A block of text in the PDF
 */
export interface TextBlock {
  /** Page this block belongs to */
  // eslint-disable-next-line no-use-before-define
  page: Page
  /** Text layer container this element belongs to */
  container: HTMLElement | null
  /** Span containing the text */
  span: HTMLSpanElement
  /** The text in question */
  text: string
  /** Rectangle of the text */
  r: {
    left: number
    right: number
    top: number
    bottom: number
    width: number
    height: number
  }
}

/**
 * Page definition
 */
export interface Page {
  /** Page index */
  index: number
  /** Data URL with the rendered image */
  image: string
  /** HTML content to be used for text layer */
  content: string
  /** Blocks of text on the page */
  blocks: TextBlock[]
  /** Lines of text on the page */
  text: string[]
  /** Styles (width and height) of the page  */
  style: Partial<Record<keyof CSSStyleDeclaration, any>>
}

async function renderPageImage(page: PDFPageProxy, viewport: PageViewport) {
  const canvas = await pool.acquire()
  try {
    canvas.width = viewport.width
    canvas.height = viewport.height
    const canvasContext = canvas.getContext('2d')!
    await page.render({ canvas, canvasContext, viewport }).promise

    return canvas.toDataURL()
  } finally {
    pool.release(canvas)
  }
}

async function renderPageText(page: PDFPageProxy, viewport: PageViewport) {
  const container = document.createElement('div')
  const textContentSource = await page.getTextContent()
  const layer = new TextLayer({
    textContentSource,
    container,
    viewport,
  })
  await layer.render()

  return `${container.innerHTML}<span class="end-of-page"></span>`
}

// eslint-disable-next-line complexity
async function renderPage(page: PDFPageProxy, scale = 1, {
  renderBitmap = true,
  renderText = true,
} = {}): Promise<Page> {
  const viewport = page.getViewport({ scale })

  return {
    index: page.pageNumber,
    image: renderBitmap ? await renderPageImage(page, viewport) : '',
    content: renderText ? await renderPageText(page, viewport) : '<span class="end-of-page"></span>',
    blocks: [],
    text: [],
    style: {
      width: `${viewport.width}px`,
      height: `${viewport.height}px`,
    },
  }
}

/**
 * Render pages of the given document
 *
 * @param doc document to render
 * @param scale scale to render
 * @param params additional parameters
 * @param params.renderBitmap do render the PDF's bitmap representation
 * @param params.renderText do render the PDF's text representation
 * @returns list of rendered pages
 */
// eslint-disable-next-line complexity
export async function renderPdfPages(doc: PDFDocumentProxy, scale = 1, {
  renderBitmap = true,
  renderText = true,
} = {}): Promise<Page[]> {
  const pages: Page[] = []

  for (let i = 0; i < doc.numPages; i++) {
    // eslint-disable-next-line no-await-in-loop
    const page = await doc.getPage(i + 1)
    // eslint-disable-next-line no-await-in-loop
    pages.push(await renderPage(page, scale, { renderBitmap, renderText }))
  }

  return pages
}

/**
 * Render document specified by URL
 *
 * @param src document source
 * @param scale scale to render
 * @param params additional parameters
 * @param params.renderBitmap do render the PDF's bitmap representation
 * @param params.renderText do render the PDF's text representation
 * @returns list of rendered pages
 */
// eslint-disable-next-line complexity
export async function renderPdf(src: string, scale = 1, {
  renderBitmap = true,
  renderText = true,
} = {}): Promise<Page[]> {
  const doc = await getDocument(src).promise

  return renderPdfPages(doc, scale, { renderBitmap, renderText })
}

function isJustASpace(chunks: string[]) {
  return chunks.length === 2 && chunks[0] === '' && chunks[1] === ''
}

/**
 * Split a span containing multiple words into a set of single-word spans
 *
 * @param span span to split
 */
export function splitSpanIntoWords(span: HTMLSpanElement) {
  const chunks = span.innerText.split(' ')
  if (chunks.length > 1 && !isJustASpace(chunks)) {
    span.innerHTML = chunks
      .map(text => `<span role="presentation" dir="ltr">${text}</span>`)
      .join('<span role="presentation"> </span>')
    span.role = 'grouping'
  }
}

function delta(x1: number, x2: number) {
  return Math.abs(x1 - x2)
}

/**
 * Sort blocks by their position.
 * The text content of PDF doesn't have to be rendered top to bottom.
 * To be able to collect the text one needs to first arrange the list
 * of blocks so that they flow from top-left to bottom-right
 *
 * @param blocks blocks to sort
 * @returns sorted list of blocks
 */
function sortTextBlocksByPosition(blocks: TextBlock[]) {
  // eslint-disable-next-line complexity
  return [...blocks].sort((i1, i2) => {
    if (delta(i1.r.top, i2.r.top) < i1.r.height / 2) {
      if (i1.r.left < i2.r.left) {
        return -1
      } else if (i1.r.left > i2.r.left) {
        return 1
      } else {
        return 0
      }
    } else if (i1.r.top < i2.r.top) {
      return -1
    } else {
      return 1
    }
  })
}

/**
 * Collect text blocks
 *
 * @param content top-level element containing spans and brs
 * @returns list of TextBlocks
 */
// eslint-disable-next-line max-lines-per-function
export function collectTextBlocks(content: HTMLElement | null | undefined) {
  const result = [] as TextBlock[]

  if (content) {
    const contentRect = content.getBoundingClientRect()

    content?.querySelectorAll('.text-layer span[role="presentation"]').forEach(span => {
      if (span instanceof HTMLSpanElement) {
        const r = span.getBoundingClientRect()
        result.push({
          page: null!,
          container: span.closest('.text-layer'),
          span,
          text: span.innerText,
          r: {
            left: r.left - contentRect.left,
            right: r.right - contentRect.left,
            top: r.top - contentRect.top,
            bottom: r.bottom - contentRect.top,
            width: r.width,
            height: r.height,
          },
        })
      }
    })
  }

  // Since we're collecting the lines per page, the last line must also
  // end with a new line character
  if (result.length > 0) result[result.length - 1].text += '\n'

  return result
}

/**
 * Range
 */
export interface Range {
  /** Top position */
  y1: number
  /** Bottom position */
  y2: number
}

function lineToRange(line: TextBlock): Range {
  return { y1: line.r.top, y2: line.r.bottom }
}

/**
 * xx
 *
 * @param blocks blocks to convert to text
 * @returns data
 */
export function convertTextBlocksToLines(blocks: TextBlock[]) {
  const text = sortTextBlocksByPosition(blocks)

  const offsets: Range[] = text.length > 0 ? [lineToRange(text[0])] : []

  for (let i = 1; i < text.length; i++) {
    const prev = text.at(i - 1)!
    const next = text.at(i)!
    if (next.r.top - prev.r.top > prev.r.height / 4) {
      prev.text += '\n'
      offsets.push(lineToRange(next))
    }
  }

  return { text, offsets }
}

type Preprocessor = (s: string) => string

function convertDots(s: string) {
  if (s === '') return '*'
  if (s === '•') return '*'

  return s
}

function preprocessTextBlocks(blocks: TextBlock[], ...pipeline: Preprocessor[]) {
  return blocks.map(block => {
    let result = block.text
    for (let i = 0; i < pipeline.length; i++) {
      result = pipeline[i](result)
    }

    return result
  })
}

/**
 * From the given list of blocks gather plain text
 *
 * @param blocks list of blocks
 * @returns text
 */
export function getText(blocks: TextBlock[]) {
  const pipeline = [convertDots]

  return preprocessTextBlocks(blocks, ...pipeline).join('')
}

/**
 * Returns a block at the given text position
 *
 * @param pages list of pages to search
 * @param line line of the block to find
 * @param word index of word to return
 * @returns TextBlock under the given coordinates or `null`
 */
// eslint-disable-next-line complexity
export function getBlockForWordInLine(pages: Page[], line: number, word: number) {
  let lineIdx = 0, wordIdx = 0
  for (const page of pages) {
    for (const block of page.blocks) {
      // eslint-disable-next-line max-depth
      if (lineIdx === line && wordIdx === word && block.text.trim().length > 0) {
        return block
      } else if (block.text.endsWith('\n')) {
        wordIdx = 0
        lineIdx++
      } else if (block.text.trim().length > 0) {
        wordIdx++
      }
    }
  }

  return null
}

/**
 * Returns a block at the given text position
 *
 * @param pages list of pages to search
 * @param line line of the block to find
 * @param character character to find the block in line
 * @returns TextBlock under the given coordinates or `null`
 */
// eslint-disable-next-line complexity
export function getBlockAt(pages: Page[], line: number, character: number) {
  let lineIdx = 0, charIdx = 0
  for (const page of pages) {
    for (const block of page.blocks) {
      // eslint-disable-next-line max-depth
      for (const char of block.text) {
        // eslint-disable-next-line max-depth
        if (lineIdx === line && charIdx === character) {
          return block
        } else if (char === '\n') {
          charIdx = 0
          lineIdx++
        } else {
          charIdx++
        }
      }
    }
  }

  return null
}
