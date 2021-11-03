import PlannerError from './PlannerError'

export const assertOptions = <O>(opt: O, methodName: string, fields?: (keyof O)[]) => {
  PlannerError.assert(opt && typeof opt === 'object', PlannerError.CODES.MISSING_ARGUMENTS, `${methodName} options are required`)

  if (opt && fields) {
    for (const field of fields) {
      PlannerError.assert(opt[field], PlannerError.CODES.INCORRECT_ARGUMENTS, `${field} is mandatory field`)
    }
  }
}

export const assertConstructorOptions = <O>(opt: O, fields?: (keyof O)[]) => assertOptions(opt, 'Constructor', fields)

export const assertInstance = <P>(opt: P, Inst: { new (..._args: any[]): P }) =>
  PlannerError.assert(
    opt instanceof Inst,
    PlannerError.CODES.INCORRECT_ARGUMENTS,
    `incorrect instance of the class ${Inst?.constructor?.name}`,
  )

export const assertContructorOptionsIntance = <O>(opt: O, Inst: { new (..._args: any[]): O }, fields?: (keyof O)[]): void => {
  assertConstructorOptions(opt, fields)
  assertInstance(opt, Inst)
}

export const assertMethodArgument = (value: unknown, typeOfValue?: string, methodName?: string) => {
  PlannerError.assert(
    value,
    PlannerError.CODES.INCORRECT_ARGUMENTS,
    `${typeOfValue ? `${typeOfValue} ` : ''}is a mandatory argument${methodName ? `in the method ${methodName}` : ''}`,
  )
}
