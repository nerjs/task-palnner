export default (time: number) => new Promise<void>(resolve => setTimeout(resolve, time))
