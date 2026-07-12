export type MockFunctionFactory = <Args extends unknown[], Return>(
  implementation: (...args: Args) => Return,
) => (...args: Args) => Return;

let mockFunctionFactory: MockFunctionFactory = implementation => implementation;

/**
 * Configures how testing helpers create observable mock functions.
 *
 * Arcscord stays test-runner agnostic by default. Pass `vi.fn`, `jest.fn`, or
 * another compatible factory when call tracking and mock controls are needed.
 *
 * @experimental This API may change without following semver.
 */
export function setMockFunctionFactory(factory: MockFunctionFactory): void {
  mockFunctionFactory = factory;
}

export function createMockFunction<Args extends unknown[] = unknown[], Return = unknown>(
  implementation: (...args: Args) => Return = (() => undefined) as (...args: Args) => Return,
): (...args: Args) => Return {
  return mockFunctionFactory(implementation);
}

export function createMockHandler<Args extends unknown[], Return>(
  implementation: (...args: Args) => Return,
  mockFunction: MockFunctionFactory = mockFunctionFactory,
): (...args: Args) => Return {
  return mockFunction(implementation);
}
