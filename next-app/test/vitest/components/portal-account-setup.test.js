import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import PortalAccountSetupDialog from "@/components/student/PortalAccountSetupDialog";
import { DEFAULT_AVATARS } from "@/lib/defaultAvatars";

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, ...props }) => <select {...props}>{children}</select>,
}));

const account = { fname: "Ana", lname: "Reyes", client_type: "Student" };

it("saves security answers and preferences before completing first-time portal setup", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const fetchMock = vi.fn(async (_url, options) => ({
    ok: true,
    json: async () => ({
      ok: true,
      ...(options.method === "GET" && {
        data: { questions: [{ id: 1, question: "What was your first pet's name?", is_required: true }] },
      }),
    }),
  }));
  vi.stubGlobal("fetch", fetchMock);

  render(<PortalAccountSetupDialog user={account} required onSave={onSave} />);
  await user.selectOptions(screen.getByLabelText("Affiliation"), "Student");
  const studentNumber = screen.getByLabelText("Student Number");
  expect(studentNumber.required).toBe(true);
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(fetchMock).not.toHaveBeenCalled();
  await user.type(studentNumber, "invalid number");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(fetchMock).not.toHaveBeenCalled();
  await user.clear(studentNumber);
  await user.type(studentNumber, "2024-00123-SJ-0");
  await user.click(screen.getByRole("button", { name: "Continue" }));

  const answer = await screen.findByLabelText(/What was your first pet's name/);
  expect(answer.type).toBe("text");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(onSave).not.toHaveBeenCalled();

  await user.type(answer, "Blueberry");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(await screen.findByRole("button", { name: /Beam Gradients/ }));
  await user.click(screen.getByRole("button", { name: DEFAULT_AVATARS[0].name }));
  await user.selectOptions(screen.getByLabelText("Display Name Format"), "first_only");
  await user.click(screen.getByRole("button", { name: "Save Preferences" }));

  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    "/api/staff/security",
    "/api/staff/security",
    "/api/auth/preferences",
    "/api/account/avatar",
    "/api/auth/update-profile",
  ]);
  expect(JSON.parse(fetchMock.mock.calls.at(-1)[1].body).checklist_student_no).toBe("2024-00123-SJ-0");
  expect(onSave).toHaveBeenCalledOnce();
});

it("keeps later profile edits to the affiliation and student number step", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
  vi.stubGlobal("fetch", fetchMock);

  render(<PortalAccountSetupDialog user={account} required={false} onSave={onSave} />);
  await user.type(screen.getByLabelText(/Student Number/), "2024-00123-SJ-0");
  await user.click(screen.getByRole("button", { name: "Save Account Setup" }));

  expect(fetchMock).toHaveBeenCalledOnce();
  const [url, request] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/auth/update-profile");
  expect(JSON.parse(request.body).checklist_student_no).toBe("2024-00123-SJ-0");
  expect(onSave).toHaveBeenCalledOnce();
});
