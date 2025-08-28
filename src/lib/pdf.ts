import type { PageViewport, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import { getDocument, TextLayer } from 'pdfjs-dist'

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
  /** Styles (width and height) of the page  */
  style: Partial<Record<keyof CSSStyleDeclaration, any>>
}

const canvas = document.createElement('canvas')

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function renderPageImage(page: PDFPageProxy, viewport: PageViewport) {
  canvas.width = viewport.width
  canvas.height = viewport.height
  const canvasContext = canvas.getContext('2d')!
  await page.render({ canvas, canvasContext, viewport }).promise

  return canvas.toDataURL()
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

  return container.innerHTML
}

async function renderPage(page: PDFPageProxy, scale = 1): Promise<Page> {
  const viewport = page.getViewport({ scale })

  return {
    // eslint-disable-next-line no-underscore-dangle
    index: page._pageIndex,
    image: '', // await renderPageImage(page, viewport),
    content: await renderPageText(page, viewport),
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
 * @returns list of rendered pages
 */
export async function renderPdfPages(doc: PDFDocumentProxy, scale = 1) {
  const pages: Page[] = []

  for (let i = 0; i < doc.numPages; i++) {
    // eslint-disable-next-line no-await-in-loop
    const page = await doc.getPage(i + 1)
    // eslint-disable-next-line no-await-in-loop
    pages.push(await renderPage(page, scale))
  }

  return pages
}

/**
 * Render document specified by URL
 *
 * @param src document source
 * @param scale scale to render
 * @returns list of rendered pages
 */
export async function renderPdf(src: string, scale = 1) {
  const doc = await getDocument(src).promise

  return renderPdfPages(doc, scale)
}
