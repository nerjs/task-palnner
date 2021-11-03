import { assertConstructorOptions, assertMethodArgument } from '../utils/errorHelpers'
import PlannerError from '../utils/PlannerError'
import type { ILogger } from '../utils/logger'
import type Metrics from './Metrics'
import type { TaskName, TaskInfo } from '../utils/types'

export interface HistoryOptions {
  logger: ILogger
  metrics: Metrics
}

export default class History {
  private readonly tasks: TaskInfo[]
  private readonly logger: ILogger
  private readonly metrics: Metrics
  private currentTask: number = -1

  constructor(opt: HistoryOptions) {
    assertConstructorOptions(opt, ['logger', 'metrics'])
    this.logger = opt.logger
    this.metrics = opt.metrics
    this.tasks = []
  }

  get size(): number {
    return this.tasks.length
  }

  get current(): TaskInfo | null {
    return this.tasks[this.currentTask] || null
  }

  get next(): TaskInfo | null {
    return this.tasks[this.currentTask + 1] || null
  }

  get prev(): TaskInfo | null {
    return this.tasks[this.currentTask - 1] || null
  }

  get all(): TaskInfo[] {
    return [...this.tasks]
  }

  back(): boolean {
    if (this.prev) {
      this.logger.debug(`Back to ${this.prev.name.toString()} from ${this.current?.name.toString()}`)
      this.metrics.history('back')
      this.currentTask -= 1
      return true
    }
    return false
  }

  forward(): boolean {
    if (this.next) {
      this.logger.debug(`Forward to ${this.next.name.toString()} from ${this.current?.name.toString()}`)
      this.metrics.history('forward')
      this.currentTask += 1
      return true
    }
    return false
  }

  push(name: TaskName, params: any): void {
    assertMethodArgument(name, 'task name', 'push')
    PlannerError.assert(name, PlannerError.CODES.MISSING_ARGUMENTS, 'The task name is mandatory')
    this.logger.debug(`Push task ${name.toString()}`)
    this.metrics.history('push')
    this.tasks.splice(this.currentTask + 1)
    this.tasks.push({ name, params })
    this.currentTask += 1
  }

  pop(): void {
    this.logger.debug(`Pop task ${this.current?.name.toString()}`)
    this.metrics.history('pop')
    this.tasks.splice(this.currentTask)
    this.currentTask = this.tasks.length - 1
  }
}
