import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import RoomMap2D from "@/components/staff/RoomMap2D";

test.each([
  [{ x: 0.975, y: 0.4, w: 0.025, h: 0.2, rotation: 90 }, ["97.5%", "50%"]],
  [{ x: 0, y: 0.4, w: 0.025, h: 0.2, rotation: 270 }, ["2.5%", "50%"]],
  [{ x: 0.4, y: 0, w: 0.2, h: 0.04, rotation: 0 }, ["50%", "4%"]],
  [{ x: 0.4, y: 0.96, w: 0.2, h: 0.04, rotation: 0 }, ["50%", "96%"]],
])("the route starts at the inner edge of the entrance (%j) and updates on selection", (roomDoor, origin) => {
  const cabinets = [
    { cab: "A", rect: { x: 0.15, y: 0.15, w: 0.15, h: 0.2 } },
    { cab: "B", rect: { x: 0.65, y: 0.65, w: 0.15, h: 0.2 } },
  ];
  const { container, rerender } = render(
    <RoomMap2D kind="drawers" selectedCabinetId="A" cabinets={cabinets} roomDoor={roomDoor} />
  );
  const getRoute = () => container.querySelector('[data-slot="storage-route"]');
  const position = (dot) => [dot.style.left, dot.style.top];
  expect(position(getRoute().firstElementChild)).toEqual(origin);
  const firstDestination = position(getRoute().lastElementChild);

  rerender(<RoomMap2D kind="drawers" selectedCabinetId="B" cabinets={cabinets} roomDoor={roomDoor} />);
  expect(position(getRoute().lastElementChild)).not.toEqual(firstDestination);
  expect(position(getRoute().firstElementChild)).toEqual(origin);

  rerender(<RoomMap2D kind="cabinets" cabinets={cabinets} roomDoor={roomDoor} />);
  expect(getRoute()).toBeNull();
});
