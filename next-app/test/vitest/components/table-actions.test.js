import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { TableActions } from "@/components/shared/TableActions";
import { TooltipProvider } from "@/components/ui/tooltip";

test("the archive drawer navigation is neutral while archiving stays destructive", async () => {
  render(
    <TooltipProvider>
      <TableActions actions={[{ label: "Locate Archive Drawer" }, { label: "Archive Record", separatorBefore: true }]} />
    </TooltipProvider>
  );

  fireEvent.keyDown(screen.getByRole("button", { name: "Row actions" }), { key: "ArrowDown" });
  expect(await screen.findByRole("menuitem", { name: "Locate Archive Drawer" })).toHaveAttribute("data-variant", "default");
  const archiveItem = screen.getByRole("menuitem", { name: "Archive Record" });
  expect(archiveItem).toHaveAttribute("data-variant", "destructive");
  expect(archiveItem.previousElementSibling).toBe(screen.getByRole("separator"));
});
