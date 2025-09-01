/**
 * Wait until a selector is present in the DOM
 *
 * @param root root element to search for elements
 * @param selector selector to observe
 * @param params additional parameters
 * @param params.count number of elements to be present (default: 1)
 * @param params.timeout timeout after which to abort the wait
 * @returns a promise that resolves when the selector is present
 */
export function waitUntilSelectorExist(root: HTMLElement, selector: string, {
  count = 1,
  timeout = 1000,
} = {}) {
  const promise = new Promise((resolve, reject) => {
    const cleanup = () => {
      // eslint-disable-next-line no-use-before-define
      clearTimeout(timer)
      // eslint-disable-next-line no-use-before-define
      observer.disconnect()
    }

    const observer = new MutationObserver(() => {
      const elements = root.querySelectorAll(selector)
      if (elements.length === count) {
        cleanup()
        resolve(true)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('timeout'))
    }, timeout)
  })

  return promise
}
