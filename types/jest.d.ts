declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveValue(value: string | number): R;
      toHaveTextContent(text: string | RegExp): R;
      toBeChecked(): R;
      toBe(value: any): R;
      toEqual(value: any): R;
      toHaveProperty(prop: string, value?: any): R;
      toHaveBeenCalled(): R;
      toHaveBeenCalledTimes(count: number): R;
      toHaveBeenCalledWith(...args: any[]): R;
      toThrow(message?: string | RegExp): R;
      toBeNull(): R;
      toBeUndefined(): R;
      toBeDefined(): R;
      toBeTruthy(): R;
      toBeFalsy(): R;
      toBeGreaterThan(number: number): R;
      toBeLessThan(number: number): R;
      toContain(item: any): R;
      toMatch(pattern: string | RegExp): R;
      toBeInstanceOf(constructor: Function): R;
      resolves: Matchers<R>;
      rejects: Matchers<R>;
      not: Matchers<R>;
    }
  }

  var jest: {
    fn(): jest.Mock;
    fn<T extends (...args: any[]) => any>(implementation: T): jest.MockedFunction<T>;
    mock<T>(moduleName: string): jest.Mocked<T>;
    spyOn(object: any, method: string): jest.SpyInstance;
    clearAllMocks(): void;
    resetAllMocks(): void;
    restoreAllMocks(): void;
    useFakeTimers(): void;
    useRealTimers(): void;
    runAllTimers(): void;
    runOnlyPendingTimers(): void;
    advanceTimersByTime(msToRun: number): void;
  };

  var describe: {
    (name: string, fn: () => void): void;
    only(name: string, fn: () => void): void;
    skip(name: string, fn: () => void): void;
  };

  var it: {
    (name: string, fn: () => void | Promise<void>): void;
    only(name: string, fn: () => void | Promise<void>): void;
    skip(name: string, fn: () => void | Promise<void>): void;
    concurrent(name: string, fn: () => void | Promise<void>): void;
  };

  var test: {
    (name: string, fn: () => void | Promise<void>): void;
    only(name: string, fn: () => void | Promise<void>): void;
    skip(name: string, fn: () => void | Promise<void>): void;
    concurrent(name: string, fn: () => void | Promise<void>): void;
  };

  var expect: {
    <T = any>(actual: T): jest.Matchers<T>;
    any(constructor: Function): jest.Any;
    anything(): jest.Anything;
    arrayContaining<T>(array: Array<T>): jest.ArrayContaining<T>;
    objectContaining<T>(object: T): jest.ObjectContaining<T>;
    stringMatching(pattern: string | RegExp): jest.StringMatching;
    stringMatching(pattern: string | RegExp): jest.AsymmetricMatcher;
    extend(matchers: jest.MatchersObject): void;
    addSnapshotSerializer(serializer: jest.SnapshotSerializerPlugin): void;
    assertions(expectedAssertions: number): void;
    hasAssertions(): void;
  };

  var beforeAll: (fn: () => void | Promise<void>) => void;
  var afterAll: (fn: () => void | Promise<void>) => void;
  var beforeEach: (fn: () => void | Promise<void>) => void;
  var afterEach: (fn: () => void | Promise<void>) => void;
}

export {};