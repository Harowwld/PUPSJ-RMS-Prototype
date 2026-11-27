import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import EditStudentModal from "@/components/staff/EditStudentModal";

const student = {
  studentNo: "2024-00123-SJ-0",
  name: "REYES, ANA",
  courseCode: "BSIT",
  yearLevel: 2024,
  section: "1",
  room: 1,
  cabinet: "A",
  drawer: 1,
  odrsEmail: "ana@example.com",
};

afterEach(() => vi.unstubAllGlobals());

it.each([
  ["ANA.REYES@example.com", "ana.reyes@example.com"],
  ["", ""],
  ["ana@example.com", undefined],
])("submits only a changed ODRS email (%s)", async (draft, expected) => {
  const user = userEvent.setup();
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
  vi.stubGlobal("fetch", fetchMock);

  render(<EditStudentModal open onOpenChange={vi.fn()} student={student} collectOdrsEmail />);
  const input = screen.getByRole("textbox", { name: "Email for ODRS (optional)" });
  await vi.waitFor(() => expect(input).toHaveValue(student.odrsEmail));
  await user.clear(input);
  if (draft) await user.type(input, draft);
  await user.click(screen.getByRole("button", { name: "Save Student Profile" }));

  expect(fetchMock).toHaveBeenCalledOnce();
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).odrsEmail).toBe(expected);
});

it("hides the ODRS email field outside Registrar", () => {
  render(<EditStudentModal open onOpenChange={vi.fn()} student={student} />);
  expect(screen.queryByRole("textbox", { name: "Email for ODRS (optional)" })).toBeNull();
});
