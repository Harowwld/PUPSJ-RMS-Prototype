import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import EditChecklistStudentNumberDialog from "@/components/student/EditChecklistStudentNumberDialog";

it("prefills the saved number and only offers a student number field", async () => {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
  vi.stubGlobal("fetch", fetchMock);

  render(<EditChecklistStudentNumberDialog
    user={{ fname: "Ana", lname: "Reyes", email: "ana.reyes@example.com", client_type: "Student", checklist_student_no: "2024-00123-SJ-9" }}
    onClose={vi.fn()}
    onSaved={onSaved}
  />);

  expect(screen.getByRole("dialog", { name: "Edit Student Number" })).toBeTruthy();
  const input = screen.getByRole("textbox", { name: "Student Number" });
  expect(screen.getAllByRole("textbox")).toHaveLength(1);
  expect(input.value).toBe("2024-00123-SJ-9");
  expect(screen.getByText("Verified Email")).toBeVisible();
  expect(screen.getByText("ana.reyes@example.com")).toBeVisible();

  await user.clear(input);
  await user.type(input, "2024-00123-sj-0");
  await user.click(screen.getByRole("button", { name: "Save Student Number" }));

  expect(fetchMock).toHaveBeenCalledOnce();
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).checklist_student_no).toBe("2024-00123-SJ-0");
  expect(onSaved).toHaveBeenCalledWith("2024-00123-SJ-0");
});
