import { assertConstructorOptions, assertInstance, assertMethodArgument } from '../utils/errorHelpers'
import createLogger, { ILogger, LOGGER_TYPES } from '../utils/logger'
import Task from './Task'
import type History from './History'
import type Manager from './Manager'
import type Metrics from './Metrics'
import type { TaskName, SomeRequired } from '../utils/types'

export interface ContextOptions {
  readonly traceId: string
  readonly taskName: TaskName
  readonly manager: Manager
  readonly history: History
}

interface ContextTaskInfo<T extends Task, P> {
  task: T
  params?: P
  error?: Error
}

export type TaskContext<T extends Task, P> = SomeRequired<Context<T, P>, 'current'>
export type RunnerContext<TN extends TaskName = TaskName, Params = unknown> = TaskContext<Task<TN, Params>, Params>

export default class Context<CurrentTask extends Task = Task, CurrentParams = unknown> {
  readonly traceId: string
  readonly taskName: TaskName
  readonly manager: Manager
  readonly history: History
  readonly metrics: Metrics
  logger: ILogger

  current?: ContextTaskInfo<CurrentTask, CurrentParams>
  previos?: ContextTaskInfo<CurrentTask, CurrentParams>

  constructor(opt: ContextOptions) {
    assertConstructorOptions(opt, ['manager'])
    const { traceId, taskName, manager, history } = opt

    this.traceId = traceId
    this.taskName = taskName
    this.manager = manager
    this.history = history
    this.metrics = manager.metrics

    this.logger = this.createLogger(LOGGER_TYPES.RUNNER)
  }

  toTask<T extends Task, P>(task: T, params: P): SomeRequired<Context<T, P>, 'current'> {
    assertMethodArgument(task, 'task', 'toTask')
    assertInstance(task, Task)

    Object.assign(this, {
      previos: this.current,
      current: { task, params },
    })

    this.logger = this.createLogger(LOGGER_TYPES.TASK)

    return this as SomeRequired<Context<T, P>, 'current'>
  }

  toEnd(): SomeRequired<Context, 'previos'> {
    if (this.current) {
      this.previos = this.current
      delete this.current
      this.logger = this.createLogger(LOGGER_TYPES.RUNNER)
    }
    return this as SomeRequired<Context, 'previos'>
  }

  createLogger(type: LOGGER_TYPES): ILogger {
    assertMethodArgument(type, 'logger type', 'createLogger')
    return createLogger(this.manager.options.logger, {
      type,
      manager: this.manager,
      traceId: this.traceId,
      taskName: this.taskName,
      history: this.history,
      ...this.current,
    })
  }
}
