import React, { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StudentNameFields from "../../../src/components/shared/StudentNameFields.js";

function Form() {
  const [value, setValue] = useState({ firstName: "", middleName: "", lastName: "" });
  return <StudentNameFields idPrefix="student" value={value} onChange={setValue} />;
}

describe("student name entry", () => {
  it("edits independent name parts and automatically previews the registrar name", async () => {
    const user = userEvent.setup();
    render(<Form />);
    await user.type(screen.getByLabelText("First Name"), "Juan Carlos");
    await user.type(screen.getByLabelText("Middle Name (optional)"), "Santos");
    await user.type(screen.getByLabelText("Last Name"), "Dela Cruz");
    expect(screen.getByText("DELA CRUZ, JUAN CARLOS S.")).toBeInTheDocument();
    expect(screen.getByLabelText("Middle Name (optional)")).toHaveValue("Santos");
    expect(screen.getByLabelText("Middle Name (optional)")).not.toBeRequired();
    expect(screen.getByLabelText("First Name")).toBeRequired();
    expect(screen.getByLabelText("Last Name")).toBeRequired();
  });
});
