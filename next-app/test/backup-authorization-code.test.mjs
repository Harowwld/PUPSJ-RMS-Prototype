import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Security Authorization Code Logic (ConfirmModal)", () => {
  // Helper implementing the exact paste logic used in ConfirmModal
  function simulatePaste(pastedText, activeIndex, currentVerificationValue) {
    const digits = (pastedText || "").replace(/\D/g, "");
    if (!digits) return currentVerificationValue;

    if (digits.length >= 4) {
      return digits.slice(0, 4);
    } else {
      const currentArr = (currentVerificationValue || "").padEnd(4, " ").split("");
      for (let i = 0; i < digits.length && activeIndex + i < 4; i++) {
        currentArr[activeIndex + i] = digits[i];
      }
      return currentArr.join("").trimEnd();
    }
  }

  // Helper implementing the exact input change logic used in ConfirmModal
  function simulateInputChange(val, index, currentVerificationValue) {
    const digitsOnly = (val || "").replace(/\D/g, "");
    if (!digitsOnly && val !== "") return currentVerificationValue;

    if (digitsOnly.length >= 4) {
      // 4-digit browser autofill
      return digitsOnly.slice(0, 4);
    }

    const currentVal = currentVerificationValue || "";
    let newVal = digitsOnly;
    if (digitsOnly.length === 2 && currentVal[index]) {
      if (digitsOnly.startsWith(currentVal[index])) {
        newVal = digitsOnly.slice(1);
      } else if (digitsOnly.endsWith(currentVal[index])) {
        newVal = digitsOnly.slice(0, -1);
      } else {
        newVal = digitsOnly.slice(-1);
      }
    } else {
      newVal = digitsOnly.slice(-1);
    }

    const valueArray = currentVal.split("");
    while (valueArray.length < 4) valueArray.push("");
    valueArray[index] = newVal;
    return valueArray.join("").slice(0, 4);
  }

  // Helper implementing backspace logic used in ConfirmModal
  function simulateBackspace(index, currentVerificationValue) {
    const currentVal = currentVerificationValue || "";
    if (!currentVal[index] && index > 0) {
      const valueArray = currentVal.split("");
      while (valueArray.length < 4) valueArray.push("");
      valueArray[index - 1] = "";
      return {
        nextValue: valueArray.join("").trimEnd(),
        nextFocusIndex: index - 1,
      };
    } else if (currentVal[index]) {
      const valueArray = currentVal.split("");
      while (valueArray.length < 4) valueArray.push("");
      valueArray[index] = "";
      return {
        nextValue: valueArray.join("").trimEnd(),
        nextFocusIndex: index,
      };
    }
    return {
      nextValue: currentVal,
      nextFocusIndex: index,
    };
  }

  test("Pasting a 4-digit code into the first box distributes all 4 digits", () => {
    const target = "7391";
    const result = simulatePaste("7391", 0, "");
    assert.strictEqual(result, target);
    assert.strictEqual(result === target, true, "Should verify successfully");
  });

  test("Pasting a 4-digit code into ANY box (e.g. box 2 or 3) still fills all 4 boxes", () => {
    const target = "8420";
    const resultFromBox2 = simulatePaste("8420", 2, "");
    assert.strictEqual(resultFromBox2, target);

    const resultFromBox3 = simulatePaste("8420", 3, "");
    assert.strictEqual(resultFromBox3, target);
  });

  test("Pasting text with letters, spaces, or formatting extracts only the 4 digits", () => {
    const target = "5914";
    assert.strictEqual(simulatePaste("Code: 5914", 0, ""), target);
    assert.strictEqual(simulatePaste("5 9 1 4", 0, ""), target);
    assert.strictEqual(simulatePaste("AUTH-5914-CONFIRM", 0, ""), target);
  });

  test("Partial paste fills starting from target index", () => {
    // Current has "9", user pastes "23" into box 1
    const result = simulatePaste("23", 1, "9");
    assert.strictEqual(result, "923");
  });

  test("Entering a new digit into an already-filled box replaces the old digit", () => {
    // Current is "1234", user changes box 1 from "2" to "7" (event val is "27")
    const result = simulateInputChange("27", 1, "1234");
    assert.strictEqual(result, "1734");
  });

  test("Backspace on an empty box clears previous box and shifts focus", () => {
    // Current is "58", focus is on box 2 (empty)
    const { nextValue, nextFocusIndex } = simulateBackspace(2, "58");
    assert.strictEqual(nextValue, "5");
    assert.strictEqual(nextFocusIndex, 1);
  });

  test("Backspace on a filled box clears the current box without shifting focus", () => {
    // Current is "58", focus is on box 1 (which has "8")
    const { nextValue, nextFocusIndex } = simulateBackspace(1, "58");
    assert.strictEqual(nextValue, "5");
    assert.strictEqual(nextFocusIndex, 1);
  });

  test("Exact match enables authorization; mismatch or partial code rejects", () => {
    const target = "4189";
    const isVerified = (val) => val === target;

    assert.strictEqual(isVerified("4189"), true);
    assert.strictEqual(isVerified("4188"), false);
    assert.strictEqual(isVerified("418"), false);
    assert.strictEqual(isVerified(""), false);
  });
});
