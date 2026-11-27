import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import OsasOrganizationSwitcher from "@/components/student/OsasOrganizationSwitcher";

const organization = {
  organization_id: "science",
  organization_name: "Science and Technology Society (STS)",
  acronym: "STS",
  officer_position: "President",
};

it("opens the authorized organization menu even when there is only one organization", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<OsasOrganizationSwitcher organizations={[organization]} selectedOrganization={organization} onChange={onChange} />);

  await user.click(screen.getByRole("button", { name: "Authorized organizations. Current organization: Science and Technology Society" }));
  const option = await screen.findByRole("menuitemradio");
  expect(option).toHaveTextContent("Science and Technology Society");
  expect(option).not.toHaveTextContent("(STS)");
  expect(option).toHaveAttribute("aria-checked", "true");
  await user.click(option);
  expect(onChange).not.toHaveBeenCalled();
});
