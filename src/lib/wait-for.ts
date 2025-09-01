/* eslint-disable no-use-before-define */
/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable promise/prefer-await-to-callbacks */
/**
 * Execute a callback every <code>interval</code>ms and if it will not return
 * a truthy value in the <code>timeout<code>ms then throw a Timeout exception.
 * This is a very useful utility that will allow you to specify how often
 * a particular expression should be evaluated and how long will it take to end
 * the execution without success. Great for time-sensitive operations.
 *
 * @param cb callback to call every <code>interval</code>ms. Waiting stops if the callback returns a truthy value.
 * @param timeout number of milliseconds that need to pass before the Timeout exception is thrown
 * @param interval number of milliseconds before re-running the callback
 * @returns value returned by the callback
 */
export async function waitFor<T>(cb: () => T, timeout = 10000, interval = 100): Promise<Exclude<T, null | undefined>> {
  return new Promise((resolve, reject) => {
    const timeoutTimer = setTimeout(() => {
      cleanup()
      reject(new Error('Timeout'))
    }, timeout)

    const intervalTimer = setInterval(() => {
      try {
        const result = cb()
        if (result !== null) {
          cleanup()
          // @ts-ignore xxx
          resolve(result)
        }
      } catch (error) {
        cleanup()
        reject(error)
      }
    }, interval)

    const cleanup = () => {
      clearTimeout(timeoutTimer)
      clearInterval(intervalTimer)
    }
  })
}
