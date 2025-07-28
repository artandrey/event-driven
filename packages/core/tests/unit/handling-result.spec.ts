import { HandlingResult } from 'packages/core/lib/util';

describe.each([
  {
    passedValue: '',
    passedValueLabel: 'Empty string',
  },
  {
    passedValue: 0,
    passedValueLabel: 'Number 0',
  },
  {
    passedValue: null,
    passedValueLabel: 'Null',
  },
  {
    passedValue: undefined,
    passedValueLabel: 'Undefined',
  },
  {
    passedValue: false,
    passedValueLabel: 'Boolean false',
  },
  {
    passedValue: {},
    passedValueLabel: 'Object',
  },
])('Should create HandlingResult', ({ passedValue, passedValueLabel }) => {
  it(`should create a successful HandlingResult with ${passedValueLabel}`, () => {
    const result = HandlingResult.success(passedValue);
    expect(result.isSuccess()).toBe(true);
    expect(result.getValueOrNull()).toBe(passedValue);
    expect(result.getErrorOrNull()).toBeNull();
    expect(result.getValueOrThrow()).toBe(passedValue);
  });

  it(`should create a failed HandlingResult with ${passedValueLabel}`, () => {
    const result = HandlingResult.error(passedValue);
    expect(result.isSuccess()).toBe(false);
    expect(result.getValueOrNull()).toBeNull();
    expect(result.getErrorOrNull()).toBe(passedValue);
    expect(() => result.getValueOrThrow()).toThrow();
  });
});
