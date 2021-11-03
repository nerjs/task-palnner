import Context from './Context'
import { TaskName } from '../utils/types'
import Planner, { PlannerInfo } from './Planner'

export type MetricsOptions = any

export default class Metrics {
  constructor(_opt: MetricsOptions) {}

  history(_type: string): void {}
  managerHook(_hook: string, _ctx: Context) {
    return () => {}
  }

  plannerMoveIn(_name: TaskName, ..._args: unknown[]): void {}

  plannerNextResult(_planner: Planner): (_info?: PlannerInfo, _chance?: number) => void {
    return () => {}
  }

  startProcess(_ctx: Context) {
    return (_err?: Error) => {}
  }
}
