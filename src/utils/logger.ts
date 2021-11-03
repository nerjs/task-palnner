import debug from 'debug'
import History from '../lib/History'
import Manager from '../lib/Manager'
import Task from '../lib/Task'

export interface ILogger {
  info(...msgs: unknown[]): unknown
  debug(...msgs: unknown[]): unknown
  warn(...msgs: unknown[]): unknown
  error(...msgs: unknown[]): unknown
}

export enum LOGGER_TYPES {
  MANAGER = 'MANAGER',
  RUNNER = 'RUNNER',
  HISTORY = 'HISTORY',
  PLANNER = 'PLANNER',
  TASK = 'TASK',
  UNKNOWN = 'UNKNOWN',
}

export interface ILoggerConfig {
  type: LOGGER_TYPES
  traceId?: string
  taskName?: string | symbol
  task?: Task
  params?: any
  history?: History
  manager: Manager
}

export type LoggerCreatorFunction = (cfg: ILoggerConfig) => ILogger

export type LoggerCreator = ILogger | LoggerCreatorFunction | false | undefined

const defaultLogger = (cfg: ILoggerConfig): ILogger => {
  let logger = debug(`${cfg.type}`.toLowerCase())

  if (cfg.taskName) logger = logger.extend(`<${cfg.taskName.toString()}>`)

  if (cfg?.task) logger = logger.extend(`${cfg.task?.name?.toString()}`)

  return {
    info: logger.extend('[info]'),
    debug: logger.extend('[debug]'),
    warn: logger.extend('[warn]'),
    error: logger.extend('[error]'),
  }
}

const mockLogger: ILogger = {
  info: () => {},
  debug: () => {},
  warn: () => {},
  error: debug('error'),
}

export default (logCfg: LoggerCreator, cfg: ILoggerConfig): ILogger => {
  if (logCfg && typeof logCfg === 'object') return logCfg
  if (typeof logCfg === 'function') return logCfg(cfg)

  return logCfg === false ? mockLogger : defaultLogger(cfg)
}
