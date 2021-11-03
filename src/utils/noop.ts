export const noopThen = async (): Promise<void> => {}

export const noopCatch = async (err: Error): Promise<never> => {
  throw err
}

export default () => {}
