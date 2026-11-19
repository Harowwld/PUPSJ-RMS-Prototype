import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import StorageExplorerTab from "@/components/staff/StorageExplorerTab";

vi.mock("@/hooks/useUrlPage", () => ({ default: () => [1, () => {}] }));
vi.mock("@/hooks/useOsasViewPreference", () => ({ default: () => [10, () => {}] }));

test("room cards open cabinets and expanded drawer rows can preview documents", () => {
  const previewDocument = vi.fn();
  const cabinets = [{ cab: "2026", rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.4 }, drawerIds: [7] }];
  const student = {
    studentNo: "2026-001",
    name: "Sample Student",
    documents: [{ id: 11, docType: "Birth Certificate", approvalStatus: "Approved" }],
  };

  function Explorer() {
    const [selectedCabinet, setSelectedCabinet] = useState(null);
    const [level, setLevel] = useState("rooms");
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [activeStudent, setActiveStudent] = useState(null);
    return (
      <StorageExplorerTab
        locatorModel={{
          kind: level,
          cabinets,
          rooms: level === "rooms" ? [{ room: 1, name: "Registrar Archive", cabinetsCount: 1, occupiedCount: 1, cabinets }] : undefined,
          drawers: level === "drawers" ? [{ drawer: 7, count: 1, students: [student], isTarget: Boolean(activeStudent) }] : undefined,
        }}
        selectedRoom={selectedRoom}
        setSelectedRoom={setSelectedRoom}
        selectedCabinet={selectedCabinet}
        setSelectedCabinet={setSelectedCabinet}
        currentLocatorLevel={level}
        setCurrentLocatorLevel={setLevel}
        onPreviewDocument={previewDocument}
        activeStudent={activeStudent}
        onLocateStudent={setActiveStudent}
        onUnfocusStudent={() => setActiveStudent(null)}
      />
    );
  }

  render(<Explorer />);
  fireEvent.click(screen.getByRole("button", { name: "Open Registrar Archive" }));
  fireEvent.click(screen.getByRole("button", { name: /2026.*drawer/i }));

  const drawer = screen.getByRole("button", { name: /drawer 7.*1 record/i });
  expect(drawer).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(drawer);
  expect(drawer).toHaveAttribute("aria-expanded", "true");
  fireEvent.click(screen.getByRole("button", { name: /birth certificate.*approved/i }));
  expect(previewDocument).toHaveBeenCalledWith("Birth Certificate", student.name, student.studentNo, 11, undefined);

  const recordCard = screen.getByText(student.name).closest('[data-slot="card"]');
  const focusButton = within(recordCard).getByRole("button", { name: "Focus", exact: true });
  fireEvent.click(screen.getByText(student.name));
  expect(focusButton).toHaveTextContent("Unfocus");
  expect(recordCard).toHaveAttribute("data-focused", "true");
  fireEvent.click(focusButton);
  expect(focusButton).toHaveTextContent(/^Focus$/);
  expect(recordCard).not.toHaveAttribute("data-focused");
  expect(drawer).toHaveAttribute("aria-expanded", "true");

  fireEvent.click(screen.getByRole("button", { name: "Back to cabinets" }));
  expect(screen.getByRole("button", { name: /2026.*drawer/i })).toBeInTheDocument();
});

test("a located drawer appears in the breadcrumb and scrolls into view after opening", async () => {
  const activeStudent = { studentNo: "2026-001", name: "Sample Student", room: 1, cabinet: "2026", drawer: 7 };
  const scrollIntoView = vi.fn();
  render(
    <StorageExplorerTab
      locatorModel={{
        kind: "drawers",
        roomName: "Registrar Archive",
        drawers: [
          { drawer: 1, count: 0 },
          { drawer: 7, count: 1, isTarget: true, students: [activeStudent] },
        ],
      }}
      selectedRoom={1}
      selectedCabinet="2026"
      activeStudent={activeStudent}
    />
  );

  expect(screen.getByRole("heading", { name: "Room Plan" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Cabinet Front" })).toBeInTheDocument();
  const drawer = screen.getByRole("button", { name: /drawer 7.*located/i });
  drawer.scrollIntoView = scrollIntoView;
  expect(screen.getByRole("navigation", { name: "Storage location" })).toHaveTextContent(/Registrar Archive.*Cabinet 2026.*Drawer 7/);
  await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest", behavior: "instant" }));
  expect(drawer).toHaveAttribute("aria-expanded", "true");
});
