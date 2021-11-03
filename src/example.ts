import Task, { RunFn } from './lib/Task'
import Manager from './lib/Manager'
import { TaskName } from './utils/types'
import sleep from './utils/sleep'

const manager = new Manager()

const run: RunFn<TaskName, number> = async (p, planner, ctx) => {
  console.log(ctx.current.task.name, p)
  ;['test1', 'test2', 'test3'].forEach(key => {
    planner.add(key, Math.floor(Math.random() * 100), key === ctx.current.task.name ? 1 : 5)
  })
  if (ctx.history.prev) planner.back(1)
  if (ctx.history.next) planner.forward(1)
  planner.quit(1)
  await sleep(3000)
}

manager.add(new Task('test1', run))
manager.add(new Task('test2', run))
manager.add(new Task('test3', run))

console.log(manager)

manager.run('test1', 0)
