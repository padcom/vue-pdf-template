/* eslint-disable no-await-in-loop */
import { EventEmitter } from 'events'
import { waitFor } from './wait-for'

/**
 * Factory for creating pool items
 */
export interface Factory<T> {
  /**
   * @returns either a promise or the actual object
   */
  create(): Promise<T> | T
  /**
   * Release resources allocated by `create`
   */
  destroy(resource: T): Promise<void> | void
}

/**
 * Options for creating the pool
 */
export interface CreatePoolOptions {
  /** Max number of elements in the pool */
  max?: number
  /** Timeout while getting an element from the pool */
  maxWait?: number
  /** Interval at which the elements will be attempted to be removed from the pool if not used */
  cleanupInterval?: number
  /** How long can an element be unused in the pool before it gets removed */
  maxAge?: number
}

interface Resource<T> {
  instance: T
  used: boolean
  timestamp: number
  stale: boolean
}

/**
 * Object pool
 */
export class Pool<T> extends EventEmitter {
  #resources = new Set<Resource<T>>()
  #cleanupTask = 0
  #factory: Factory<T>
  #max: number
  #maxWait: number
  #cleanupInterval: number
  #maxAge: number
  #gcInProgress = false

  // eslint-disable-next-line complexity
  constructor(
    factory: Factory<T>,
    { max = 3, maxWait = 1000, cleanupInterval = 3000, maxAge = 1000 }: CreatePoolOptions = {},
  ) {
    super()
    this.#factory = factory
    this.#max = max
    this.#maxWait = maxWait
    this.#cleanupInterval = cleanupInterval
    this.#maxAge = maxAge
  }

  #findFreeResource() {
    for (const resource of this.#resources) {
      if (!resource.used && !resource.stale) return resource
    }

    return null
  }

  #findResourceByInstance(instance: T) {
    for (const resource of this.#resources) {
      if (resource.instance === instance) return resource
    }

    return null
  }

  #canAllocateMoreResources() {
    return this.#resources.size < this.#max
  }

  async #allocate(): Promise<Resource<T>> {
    if (!this.#canAllocateMoreResources()) throw new Error('Pool is full!')

    const result: Resource<T> = {
      instance: await this.#factory.create(),
      used: false,
      timestamp: 0,
      stale: false,
    }

    this.#resources.add(result)

    return result
  }

  #markResourceAsUsed(resource: Resource<T>): T {
    if (resource.used) throw new Error('Resource was already used!')

    resource.used = true
    resource.timestamp = 0

    return resource.instance
  }

  #markResourceAsUnused(resource: Resource<T>): T {
    if (!resource.used) throw new Error('Resource was not used!')

    resource.used = false
    resource.timestamp = new Date().getTime()

    return resource.instance
  }

  async acquire(): Promise<T> {
    this.emit('beforeacquire')

    const free = this.#findFreeResource()
    if (free) {
      const result = this.#markResourceAsUsed(free)
      this.emit('acquire', { resource: result, method: 'existing' })

      return result
    }

    if (this.#canAllocateMoreResources()) {
      const resource = await this.#allocate()
      const result = this.#markResourceAsUsed(resource)
      this.emit('acquire', { resource: result, method: 'created' })

      return result
    }

    const resource = await waitFor(() => this.#findFreeResource(), this.#maxWait)
    if (!resource) throw new Error('Timeout waiting for resource to be free')

    const result = this.#markResourceAsUsed(resource)
    this.emit('acquire', { resource: result, method: 'awaited' })

    return result
  }

  release(instance: T): void {
    this.emit('beforerelease', instance)
    const resource = this.#findResourceByInstance(instance)
    if (!resource) throw new Error('Instance not in pool')
    if (!resource.used) throw new Error('Resource was not acquired!')

    this.#markResourceAsUnused(resource)

    this.emit('release', resource.instance)
  }

  async drain() {
    this.emit('beforedrain')

    for (const resource of this.#resources) {
      await waitFor(() => !resource.used)
      await this.#factory.destroy(resource.instance)
    }

    this.#resources.clear()

    this.emit('drain')
  }

  #getStaleResources() {
    const timestamp = new Date().getTime()
    const stale = new Set<Resource<T>>()

    for (const resource of this.#resources) {
      if (!resource.used && (timestamp - resource.timestamp) > this.#maxAge) {
        resource.stale = true
        stale.add(resource)
      }
    }

    return stale
  }

  async #disposeResources(stale: Set<Resource<T>>) {
    for (const resource of stale) {
      await this.#factory.destroy(resource.instance)
      this.#resources.delete(resource)
    }
  }

  async #gc() {
    if (this.#gcInProgress) return

    this.emit('beforegc')

    this.#gcInProgress = true

    try {
      const stale = this.#getStaleResources()
      await this.#disposeResources(stale)
      this.emit('gc', stale)
    } finally {
      this.#gcInProgress = false
    }
  }

  get started() {
    return this.#cleanupTask !== 0
  }

  start() {
    if (this.started) throw new Error('Pool already started!')
    this.#cleanupTask = setInterval(this.#gc.bind(this), this.#cleanupInterval)
    this.emit('start')
  }

  async stop() {
    if (!this.started) throw new Error('Pool not started')
    clearInterval(this.#cleanupTask)
    this.#cleanupTask = 0
    await this.drain()
    this.emit('stop')
  }

  get size() {
    return this.#resources.size
  }

  get used() {
    let result = 0
    for (const resource of this.#resources) if (resource.used) result++

    return result
  }
}

/**
 * Create a pool
 *
 * @param factory factory for items
 * @param options options
 * @returns pool instance
 */
export function createPool<T>(factory: Factory<T>, options: CreatePoolOptions = {}): Pool<T> {
  return new Pool<T>(factory, options)
}
