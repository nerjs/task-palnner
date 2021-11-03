import type Context from '../lib/Context'
import type Manager from '../lib/Manager'

const hooks = ['beforeAll', 'afterAll', 'beforeEach', 'afterEach'] as const

type NoopHook = (ctx: Context, ...args: unknown[]) => void | Promise<void>

const wrap =
  (manager: Manager, hook: string, fn: NoopHook): NoopHook =>
  async (ctx: Context, ...args: unknown[]): Promise<void> => {
    const endHook = manager.metrics.managerHook(hook, ctx)

    try {
      await fn.apply(manager, [ctx, ...args])
    } finally {
      endHook()
    }
  }

export default (manager: Manager): void => {
  const res: {
    [key: string]: NoopHook
  } = {}

  for (const hook of hooks) {
    const fn = wrap(manager, hook, manager.options[hook] as NoopHook)
    res[hook] = fn
  }

  Object.assign(manager, res)
}
