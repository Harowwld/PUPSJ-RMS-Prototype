import { describe, expect, it } from "vitest";
import { normalizeStudentRecordName, studentRecordNameParts } from "../../../src/lib/studentRecordName.js";

describe("student record names", () => {
  it("retains the full middle name while formatting the registrar display", () => {
    expect(normalizeStudentRecordName({ firstName: "  Juan   Carlos ", middleName: "Élias Santos", lastName: "dela Peña" })).toEqual({
      firstName: "JUAN CARLOS", middleName: "ÉLIAS SANTOS", lastName: "DELA PEÑA", name: "DELA PEÑA, JUAN CARLOS É.",
    });
  });

  it("allows an absent middle name and rejects missing required parts", () => {
    expect(normalizeStudentRecordName({ firstName: "Maria", lastName: "Santos" }).name).toBe("SANTOS, MARIA");
    expect(() => normalizeStudentRecordName({ firstName: "Maria" })).toThrow("Last name");
    expect(() => normalizeStudentRecordName({ lastName: "Santos" })).toThrow("First name");
    expect(() => normalizeStudentRecordName({ firstName: "Maria, Ana", lastName: "Santos" })).toThrow("commas");
  });

  it("prefers stored full parts over the abbreviated display name", () => {
    expect(studentRecordNameParts({ name: "SANTOS, MARIA E.", first_name: "MARIA", middle_name: "ELENA", last_name: "SANTOS" })).toEqual({
      firstName: "MARIA", middleName: "ELENA", lastName: "SANTOS",
    });
  });

  it("keeps compound given names and only recovers a recorded legacy initial", () => {
    expect(studentRecordNameParts({ name: "DELA CRUZ, JUAN CARLOS S." })).toEqual({ firstName: "JUAN CARLOS", middleName: "S.", lastName: "DELA CRUZ" });
    expect(studentRecordNameParts({ name: "DELA CRUZ, JUAN CARLOS" })).toEqual({ firstName: "JUAN CARLOS", middleName: "", lastName: "DELA CRUZ" });
    expect(normalizeStudentRecordName({ firstName: "Juan", middleName: "S", lastName: "Cruz" }).middleName).toBe("S");
  });
});
