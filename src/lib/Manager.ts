import Metrics from './Metrics'
import { isPreset, nextPreset, PRESET_TASKS } from '../utils/presets'
import { assertInstance, assertMethodArgument } from '../utils/errorHelpers'
import Context from './Context'
import createLogger, { LOGGER_TYPES, ILogger, LoggerCreator } from '../utils/logger'
import noop from '../utils/noop'
import PlannerError from '../utils/PlannerError'
import copyManagerHooks from '../utils/copyManagerHooks'
import History from './History'
import { v4 as uuid } from 'uuid'
import sleep from '../utils/sleep'
import Task from './Task'
import type Planner from './Planner'
import type { TaskName, SomeRequired } from '../utils/types'
import type { RunnerContext } from './Context'
import type { MetricsOptions } from './Metrics'

export type BeforeAllCb = (ctx: Context) => void | Promise<void>
export type AfterAllCb = (ctx: SomeRequired<Context, 'previos'>, err?: Error) => void | Promise<void>
export type BeforeEachCb = (ctx: RunnerContext<TaskName, any>, planner: Planner) => void | Promise<void>
export type AfterEachCb = (ctx: RunnerContext<TaskName, any>, planner: Planner, err?: Error) => void | Promise<void>

export interface IManagerOptions {
  logger?: LoggerCreator
  metrics: MetricsOptions
  delay: number
  beforeAll: BeforeAllCb
  afterAll: AfterAllCb
  beforeEach: BeforeEachCb
  afterEach: AfterEachCb
}

interface ITaskInfo {
  name: TaskName
  params?: unknown
}

export default class Manager {
  readonly options: IManagerOptions
  readonly metrics: Metrics
  readonly logger: ILogger
  readonly tasks: Map<TaskName, Task>
  readonly beforeAll: BeforeAllCb
  readonly afterAll: AfterAllCb
  readonly beforeEach: BeforeEachCb
  readonly afterEach: AfterEachCb

  constructor(opt?: Partial<IManagerOptions>) {
    this.options = Object.assign<IManagerOptions, Partial<IManagerOptions> | undefined>(
      {
        metrics: true,
        delay: 100,
        beforeAll: noop,
        afterAll: noop,
        beforeEach: noop,
        afterEach: noop,
      },
      opt,
    )

    this.metrics = new Metrics(this.options.metrics)
    this.tasks = new Map()
    this.logger = createLogger(this.options.logger, { type: LOGGER_TYPES.MANAGER, manager: this })

    copyManagerHooks(this)
  }

  get size(): number {
    return this.tasks.size
  }

  has(name: TaskName): boolean {
    assertMethodArgument(name, 'task name', 'has')
    return this.tasks.has(name) || (typeof name === 'symbol' && Object.values(PRESET_TASKS).includes(name))
  }

  get(name: TaskName): Task | null {
    assertMethodArgument(name, 'task name', 'get')
    return this.tasks.get(name) || null
  }

  add(task: Task): Manager {
    assertInstance(task, Task)
    PlannerError.assert(
      !this.has(task.name),
      PlannerError.CODES.TASK_DUPLICATE,
      `The task ${task.name.toString()} has already been set before`,
    )

    this.tasks.set(task.name, task)
    this.logger.debug(`[Manager] task ${task.name.toString()} was added`)
    return this
  }

  async run<N extends string | symbol, P>(name: N, params?: P) {
    const traceId = uuid()
    const history = new History({
      logger: createLogger(this.options.logger, { type: LOGGER_TYPES.HISTORY, manager: this }),
      metrics: this.metrics,
    })
    const context = new Context({
      traceId,
      taskName: name,
      manager: this,
      history,
    })
    const logger = context.createLogger(LOGGER_TYPES.MANAGER)

    logger.info(`Run process. task=${name?.toString()}, params=${JSON.stringify(params)}, traceId=${traceId}`)
    const endProcess = this.metrics.startProcess(context)

    try {
      let info: ITaskInfo = {
        name,
        params,
      }

      await this.options.beforeAll(context)

      loop: while (true) {
        PlannerError.assert(info.name && this.has(info.name), PlannerError.CODES.UNKNOWN_TASK, `Task ${info.name?.toString()} not found`)
        const task = this.get(info.name) as Task
        history.push(task.name, info.params)
        const ctx = context.toTask(task, info.params)
        const planner = await task.run(info.params, ctx)

        const nextTask = planner.next()
        if (!nextTask) break loop

        if (isPreset(nextTask)) {
          const nextPresetInfo = nextPreset(nextTask, ctx, { logger })

          if (!nextPresetInfo) break loop
          info = nextPresetInfo
        } else {
          info = nextTask
        }

        if (this.options.delay) {
          await sleep(this.options.delay)
        }
      }

      logger.info(`The task ${name?.toString()} process is completed successfully`)
      await this.options.afterAll(context.toEnd())
      endProcess()
    } catch (err) {
      logger.error(err)
      logger.warn(`The task ${name?.toString()} process is not completed successfully`)
      await this.options.afterAll(context.toEnd(), err)
      endProcess(err)
    }
  }
}
