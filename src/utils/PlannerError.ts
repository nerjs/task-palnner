export enum ERROR_CODES {
  INCORRECT_ARGUMENTS,
  MISSING_ARGUMENTS,
  INCORRECT_INSTANCE,
  UNKNOWN_TASK,
  INCORRECT_RESULT,
  INCORRECT_OPERATION,
  TASK_DUPLICATE,
}

export default class PlannerError<C extends ERROR_CODES> extends Error {
  readonly code: C

  constructor(code: C, message?: string) {
    super(`[${code}] ${message || ''}`)
    this.code = code
  }

  static CODES = ERROR_CODES

  static assert<C extends ERROR_CODES>(value: unknown, code: C, message?: string): void {
    if (!value) throw new PlannerError(code, message)
  }
}
