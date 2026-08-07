import { describe, it, expect } from "vitest";
import {
  calculateOutsourcerPayment,
  calcTax,
  calcTransferFee,
  calcNetUsd,
  calcToPkr,
  toCents,
  fromCents,
  roundMoney,
} from "./payments";

describe("calculateOutsourcerPayment", () => {
  it("computes the golden case (defaults) exactly", () => {
    const result = calculateOutsourcerPayment(1000, {
      taxRate: 5,
      transferFeeRate: 2,
      exchangeRate: 284.5,
      payPercentage: 70,
    });

    expect(result).toEqual({
      grossUsd: 1000,
      taxUsd: 50,
      transferFeeUsd: 19,
      netUsd: 931,
      netPkr: 264869.5,
      payAmountPkr: 185408.65,
    });
  });

  it("returns all zeros for zero gross", () => {
    const result = calculateOutsourcerPayment(0, {
      taxRate: 5,
      transferFeeRate: 2,
      exchangeRate: 284.5,
      payPercentage: 70,
    });

    expect(result).toEqual({
      grossUsd: 0,
      taxUsd: 0,
      transferFeeUsd: 0,
      netUsd: 0,
      netPkr: 0,
      payAmountPkr: 0,
    });
  });

  it("passes gross straight through when tax and fee rates are zero", () => {
    const result = calculateOutsourcerPayment(1000, {
      taxRate: 0,
      transferFeeRate: 0,
      exchangeRate: 284.5,
      payPercentage: 70,
    });

    expect(result).toEqual({
      grossUsd: 1000,
      taxUsd: 0,
      transferFeeUsd: 0,
      netUsd: 1000,
      netPkr: 284500,
      payAmountPkr: 199150,
    });
  });

  it("pays out the full netPkr at 100% pay percentage", () => {
    const result = calculateOutsourcerPayment(1000, {
      taxRate: 5,
      transferFeeRate: 2,
      exchangeRate: 284.5,
      payPercentage: 100,
    });

    expect(result.payAmountPkr).toBe(result.netPkr);
    expect(result.payAmountPkr).toBe(264869.5);
  });

  it("pays out zero at 0% pay percentage", () => {
    const result = calculateOutsourcerPayment(1000, {
      taxRate: 5,
      transferFeeRate: 2,
      exchangeRate: 284.5,
      payPercentage: 0,
    });

    expect(result.payAmountPkr).toBe(0);
  });

  it("handles fractional-cents inputs with exact rounding", () => {
    const result = calculateOutsourcerPayment(333.33, {
      taxRate: 7.5,
      transferFeeRate: 3.25,
      exchangeRate: 279.135,
      payPercentage: 63.5,
    });

    expect(result).toEqual({
      grossUsd: 333.33,
      taxUsd: 25,
      transferFeeUsd: 10.02,
      netUsd: 298.31,
      netPkr: 83268.76,
      payAmountPkr: 52875.66,
    });
  });

  describe("invalid input validation", () => {
    const validInput = {
      taxRate: 5,
      transferFeeRate: 2,
      exchangeRate: 284.5,
      payPercentage: 70,
    };

    it("throws RangeError for negative grossUsd", () => {
      expect(() => calculateOutsourcerPayment(-1, validInput)).toThrow(RangeError);
    });

    it("throws RangeError for negative taxRate", () => {
      expect(() =>
        calculateOutsourcerPayment(1000, { ...validInput, taxRate: -1 }),
      ).toThrow(RangeError);
    });

    it("throws RangeError for taxRate above 100", () => {
      expect(() =>
        calculateOutsourcerPayment(1000, { ...validInput, taxRate: 101 }),
      ).toThrow(RangeError);
    });

    it("throws RangeError for negative transferFeeRate", () => {
      expect(() =>
        calculateOutsourcerPayment(1000, { ...validInput, transferFeeRate: -1 }),
      ).toThrow(RangeError);
    });

    it("throws RangeError for transferFeeRate above 100", () => {
      expect(() =>
        calculateOutsourcerPayment(1000, { ...validInput, transferFeeRate: 101 }),
      ).toThrow(RangeError);
    });

    it("throws RangeError for zero exchangeRate", () => {
      expect(() =>
        calculateOutsourcerPayment(1000, { ...validInput, exchangeRate: 0 }),
      ).toThrow(RangeError);
    });

    it("throws RangeError for negative exchangeRate", () => {
      expect(() =>
        calculateOutsourcerPayment(1000, { ...validInput, exchangeRate: -5 }),
      ).toThrow(RangeError);
    });

    it("throws RangeError for negative payPercentage", () => {
      expect(() =>
        calculateOutsourcerPayment(1000, { ...validInput, payPercentage: -1 }),
      ).toThrow(RangeError);
    });

    it("throws RangeError for payPercentage above 100", () => {
      expect(() =>
        calculateOutsourcerPayment(1000, { ...validInput, payPercentage: 101 }),
      ).toThrow(RangeError);
    });
  });
});

describe("rounding helpers", () => {
  it("toCents rounds floating point drift up to the nearest cent", () => {
    expect(toCents(19.999999999999996)).toBe(2000);
  });

  it("fromCents converts cents back to a decimal amount", () => {
    expect(fromCents(2000)).toBe(20);
  });

  it("roundMoney avoids classic binary floating point drift", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});

describe("calculation building blocks", () => {
  it("calcTax computes tax on gross at the given rate", () => {
    expect(calcTax(1000, 5)).toBe(50);
  });

  it("calcTransferFee computes fee on the post-tax amount", () => {
    expect(calcTransferFee(1000, 5, 2)).toBe(19);
  });

  it("calcNetUsd subtracts tax and transfer fee from gross", () => {
    expect(calcNetUsd(1000, 5, 2)).toBe(931);
  });

  it("calcToPkr converts a USD amount using the exchange rate", () => {
    expect(calcToPkr(931, 284.5)).toBe(264869.5);
  });
});
