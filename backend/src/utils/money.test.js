const { parseAmount } = require('./money');

describe('parseAmount', () => {
  test('accepts positive amounts with up to two decimals', () => {
    expect(parseAmount('100')).toBe('100');
    expect(parseAmount('100.50')).toBe('100.50');
  });

  test('rejects zero, negative, and more than two decimals', () => {
    expect(() => parseAmount('0')).toThrow();
    expect(() => parseAmount('-10')).toThrow();
    expect(() => parseAmount('10.123')).toThrow();
  });

  test('rejects non-numeric values', () => {
    expect(() => parseAmount('abc')).toThrow();
    expect(() => parseAmount(null)).toThrow();
  });
});
