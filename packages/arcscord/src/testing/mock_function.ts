export type MockFunctionFactory = <Args extends unknown[], Return>(
  implementation: (...args: Args) => Return,
) => (...args: Args) => Return;

export function createMockHandler<Args extends unknown[], Return>(
  implementation: (...args: Args) => Return,
  mockFunction: MockFunctionFactory | undefined,
): (...args: Args) => Return {
  return mockFunction ? mockFunction(implementation) : implementation;
}
