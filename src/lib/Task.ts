import { assertConstructorOptions, assertMethodArgument } from '../utils/errorHelpers'
import { DEFAULT_PROBABILITY } from '../constants'
import { noopCatch } from '../utils/noop'
import PlannerError from '../utils/PlannerError'
import Planner from './Planner'
import type { TaskName } from '../utils/types'
import type { RunnerContext } from './Context'

export type RunFn<TN extends TaskName, Params> = (params: Params, planner: Planner, ctx: RunnerContext<TN, Params>) => void | Promise<void>

export type CatchFn<TN extends TaskName, Params> = (
  err: Error | PlannerError<any>,
  planner: Planner,
  ctx: RunnerContext<TN, Params>,
) => void | Promise<void>

export interface TaskOptions<TN extends TaskName, Params> {
  name: TN
  probability?: number
  run: RunFn<TN, Params>
  catch?: CatchFn<TN, Params>
}

export default class Task<TN extends TaskName = TaskName, Params = any> {
  readonly name: TN
  readonly probability: number = DEFAULT_PROBABILITY
  private readonly processRun: RunFn<TN, Params>
  private readonly processCatch: CatchFn<TN, Params> = noopCatch

  constructor(name: TN, run: RunFn<TN, Params>, catchFn?: CatchFn<TN, Params>)
  constructor(name: TN, probability: number, run: RunFn<TN, Params>, catchFn?: CatchFn<TN, Params>)
  constructor(options: TaskOptions<TN, Params>)
  constructor(
    nameOrOptions: TN | TaskOptions<TN, Params>,
    probOrRunFn?: number | RunFn<TN, Params>,
    runOrCatchFn?: RunFn<TN, Params> | CatchFn<TN, Params>,
    catchFn?: CatchFn<TN, Params>,
  ) {
    if (typeof nameOrOptions === 'object') {
      assertConstructorOptions(nameOrOptions, ['run', 'name'])
      this.name = nameOrOptions.name
      this.probability = nameOrOptions.probability || DEFAULT_PROBABILITY
      this.processRun = nameOrOptions.run

      if (nameOrOptions.catch) this.processCatch = nameOrOptions.catch
    } else {
      this.name = nameOrOptions
      if (typeof probOrRunFn === 'number') this.probability = probOrRunFn

      if (typeof probOrRunFn === 'function') {
        this.processRun = probOrRunFn
        if (typeof runOrCatchFn === 'function') this.processCatch = runOrCatchFn as CatchFn<TN, Params>
      } else if (typeof runOrCatchFn === 'function') {
        this.processRun = runOrCatchFn as RunFn<TN, Params>
        if (typeof catchFn === 'function') this.processCatch = catchFn
      }

      assertMethodArgument(this.name, 'task name', 'Constructor')
      assertMethodArgument(this.processRun && typeof this.processRun === 'function', 'run function', 'Constructor')
    }

    if (typeof this.probability !== 'number') this.probability = DEFAULT_PROBABILITY
  }

  get nameStr(): string {
    return `${this.name.toString()}`
  }

  async run(params: Params, ctx: RunnerContext<TN, Params>): Promise<Planner> {
    ctx.logger.debug(`Run task ${this.nameStr}`)
    let planner = new Planner(ctx)

    try {
      await ctx.manager.beforeEach(ctx, planner)
      await this.processRun(params, planner, ctx)
      ctx.logger.debug(`Task ${this.nameStr} successfully completed`)
    } catch (err) {
      ctx.logger.warn(`Task ${this.nameStr} ended with an error="${err.message}"`)
      ctx.current.error = err
      planner = new Planner(ctx)
      await this.processCatch(err, planner, ctx)
      ctx.logger.debug('Error handling completed successfully')
    } finally {
      await ctx.manager.afterEach(ctx, planner)
    }

    return planner
  }
}
