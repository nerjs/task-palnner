import { assertContructorOptionsIntance, assertMethodArgument } from '../utils/errorHelpers'
import { ILogger, LOGGER_TYPES } from '../utils/logger'
import PlannerError from '../utils/PlannerError'
import Context from './Context'
import { PRESET_TASKS } from '../utils/presets'
import type Manager from './Manager'
import type Metrics from './Metrics'
import type { NotRequired, TaskName } from '../utils/types'
import type { RunnerContext } from './Context'

export interface PlannerInfo<Params = unknown> {
  name: TaskName
  probability: number
  params?: Params
}

export default class Planner {
  private readonly logger: ILogger
  private readonly manager: Manager
  private readonly metrics: Metrics
  private tasks: Set<PlannerInfo>

  constructor(ctx: RunnerContext<TaskName, any>) {
    assertContructorOptionsIntance(ctx, Context)
    this.logger = ctx.createLogger(LOGGER_TYPES.PLANNER)
    this.manager = ctx.manager
    this.metrics = ctx.metrics
    this.tasks = new Set()
  }

  get size(): number {
    return this.tasks.size
  }

  get all(): PlannerInfo[] {
    return Array.from(this.tasks.values())
  }

  get sum(): number {
    return this.all.reduce((sum, { probability }) => sum + probability, 0)
  }

  get names(): TaskName[] {
    return this.all.map(({ name }) => name)
  }

  can(name: TaskName): boolean {
    assertMethodArgument(name, 'task name', 'can')
    return !this.manager.has(name)
  }

  add<Params>(name: TaskName, params?: Params, probability?: number): void
  add<Params>(cfg: NotRequired<PlannerInfo<Params>, 'probability'>): void
  add<Params>(cfgOrName: TaskName | NotRequired<PlannerInfo<Params>, 'probability'>, params?: Params, probability?: number): void {
    const name = typeof cfgOrName === 'object' ? cfgOrName.name : cfgOrName
    assertMethodArgument(name, 'task name', 'set')

    PlannerError.assert(!this.can(name), PlannerError.CODES.UNKNOWN_TASK, `The ${name.toString()} task was not found in the manager`)

    const info: PlannerInfo<Params> = {
      name,
      params: typeof cfgOrName === 'object' ? cfgOrName.params : params,
      probability:
        typeof probability === 'number'
          ? probability
          : typeof cfgOrName === 'object' && typeof cfgOrName.probability === 'number'
          ? cfgOrName.probability
          : this.manager.get(name)?.probability || -1,
    }

    this.tasks.add(info)

    this.metrics.plannerMoveIn(name, 'add')

    const logInfo = `name=${name.toString()}, probability=${info.probability}${
      info.params !== undefined ? `, params:${JSON.stringify(info.params)}` : ''
    }`
    this.logger.debug(`The ${name.toString()} task has been added. ${logInfo}`)
  }

  quit(probability?: number): void {
    return this.add(PRESET_TASKS.QUIT, null, probability)
  }

  back(probability?: number): void {
    return this.add(PRESET_TASKS.BACK, null, probability)
  }

  forward(probability?: number): void {
    return this.add(PRESET_TASKS.FORWARD, null, probability)
  }

  next(): PlannerInfo | null {
    const metricsNext = this.metrics.plannerNextResult(this)

    if (!this.size) {
      metricsNext()
      return null
    }

    const { sum } = this
    const random = Math.random()
    let prev: number = 0

    for (const info of this.all) {
      const chance = info.probability / sum
      const cur = chance + prev
      if (random > prev && random <= cur) {
        this.logger.debug(
          `Next task: name=${info.name.toString()}, probability=${info.probability}${
            info.params !== undefined ? `, params:${JSON.stringify(info.params)}` : ''
          }, tasks=${this.all.length} sum=${sum}, chance=${chance}, cur=${cur}, rand=${random}`,
        )
        metricsNext(info, chance)

        return info
      }
      prev = cur
    }

    this.logger.error('Probability was not obtained for an unknown reason')
    metricsNext()
    throw new PlannerError(PlannerError.CODES.INCORRECT_RESULT, 'Probability was not obtained for an unknown reason')
  }
}
