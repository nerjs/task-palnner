import Context from '../lib/Context'
import { TaskName } from './types'
import { ILogger } from './logger'
import PlannerError from './PlannerError'

export const PRESET_TASKS = {
  QUIT: Symbol('quit'),
  BACK: Symbol('back'),
  FORWARD: Symbol('forward'),
}

interface ITaskInfo {
  name: TaskName
  params?: unknown
}

interface IPresetInstruments {
  logger: ILogger
}

export const isPreset = (info: ITaskInfo | TaskName): boolean => {
  const name = typeof info === 'object' ? info.name : info
  return typeof name === 'symbol' && Object.values(PRESET_TASKS).includes(name)
}

export const nextPreset = (
  { name, params }: ITaskInfo,
  { traceId, history }: Context,
  { logger }: IPresetInstruments,
): ITaskInfo | null => {
  switch (name) {
    case PRESET_TASKS.QUIT:
      logger.debug(`Exit from the task process. task=${name?.toString()}, params=${JSON.stringify(params)}, traceId=${traceId}`)
      return null
    case PRESET_TASKS.BACK:
      if (history.back() && history.current) return { name: history.current.name, params: history.current.params }
      throw new PlannerError(PlannerError.CODES.INCORRECT_OPERATION, 'History.back()')
    case PRESET_TASKS.FORWARD:
      if (history.forward() && history.current) return { name: history.current.name, params: history.current.params }
      throw new PlannerError(PlannerError.CODES.INCORRECT_OPERATION, 'History.forward()')
  }

  throw new PlannerError(PlannerError.CODES.INCORRECT_RESULT, `Unknown task ${name.toString()}`)
}
