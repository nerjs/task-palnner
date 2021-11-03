export type NotRequired<T, Keys extends keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
  [K in Keys]?: T[K]
}

export type SomeRequired<T, Keys extends keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
  [K in Keys]-?: T[K]
}

export type TaskName = string | symbol

export type TaskInfo<P = unknown> = {
  name: TaskName
  params: P
}
