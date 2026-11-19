import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import RoomMap2D from "@/components/staff/RoomMap2D";
import { FOLDER_COLORS } from "@/lib/constants";

test("the room map highlights only the located drawer and clears it when focus is removed", () => {
  const cabinet = { rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.4 }, drawerIds: [2, 7] };
  const cabinets = [
    { ...cabinet, cab: "A", isTarget: true },
    { ...cabinet, cab: "B", rect: { ...cabinet.rect, x: 0.6 } },
  ];
  const { rerender } = render(
    <RoomMap2D
      kind="drawers"
      cabinets={cabinets}
      selectedCabinetId="A"
      drawerSlots={[{ drawer: 2 }, { drawer: "7", isTarget: true }]}
    />
  );

  const drawer = within(screen.getByTitle("Cabinet A")).getByText("Drawer 7");
  expect(drawer.parentElement).toHaveStyle({ backgroundColor: FOLDER_COLORS.yellow.frontStart });
  expect(screen.getAllByText("Drawer 7")).toHaveLength(1);
  expect(screen.queryByText("Drawer 2")).not.toBeInTheDocument();

  rerender(
    <RoomMap2D
      kind="drawers"
      cabinets={[{ ...cabinets[0], isTarget: false }, cabinets[1]]}
      selectedCabinetId="A"
      drawerSlots={[{ drawer: 2 }, { drawer: "7" }]}
    />
  );
  expect(screen.queryByText("Drawer 7")).not.toBeInTheDocument();
});
