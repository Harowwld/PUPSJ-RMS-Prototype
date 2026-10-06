import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const { areCabinetsEqual, findMatchingCabinet, canonicalizeCabinetId } =
  await import("../src/lib/storageLayoutUtils.js");
const { getStorageLayout } = await import("../src/lib/storageLayoutRepo.js");
const { listOrganizations } = await import("../src/lib/organizationsRepo.js");

test("Storage Layout: Locate, Unfocus, and Re-locate Navigation Suite", async (t) => {
  await t.test("1. areCabinetsEqual correctly handles exact, case-insensitive, and letter-to-year mapping", () => {
    // Exact & Case-insensitive
    assert.ok(areCabinetsEqual("A", "a"));
    assert.ok(areCabinetsEqual("CAB A", "A"));
    assert.ok(areCabinetsEqual("ACADEMIC ORGANIZATIONS", "academic organizations"));

    // Layout cabinets list comparison
    const regCabinets = [
      { id: "2020" },
      { id: "2021" },
      { id: "2022" },
      { id: "2023" },
      { id: "2024" },
    ];
    // "A" corresponds to index 0 -> "2020"
    assert.ok(areCabinetsEqual("A", "2020", regCabinets));
    // "B" corresponds to index 1 -> "2021"
    assert.ok(areCabinetsEqual("B", "2021", regCabinets));
    // "C" corresponds to index 2 -> "2022"
    assert.ok(areCabinetsEqual("C", "2022", regCabinets));
    // Mismatched
    assert.equal(areCabinetsEqual("A", "2022", regCabinets), false);
  });

  await t.test("2. findMatchingCabinet finds cabinet in room regardless of formatting or letter/year convention", () => {
    const cabinets = [
      { id: "ACADEMIC ORGANIZATIONS" },
      { id: "NON-ACADEMIC ORGANIZATIONS" },
    ];

    const matchAcademic = findMatchingCabinet(cabinets, "academic organizations");
    assert.ok(matchAcademic);
    assert.equal(matchAcademic.id, "ACADEMIC ORGANIZATIONS");

    const matchNonAcademic = findMatchingCabinet(cabinets, "NON-ACADEMIC ORGANIZATIONS");
    assert.ok(matchNonAcademic);
    assert.equal(matchNonAcademic.id, "NON-ACADEMIC ORGANIZATIONS");

    // Year layout
    const yearCabinets = [
      { id: "2020" },
      { id: "2021" },
      { id: "2022" },
      { id: "2023" },
    ];
    const matchLetter = findMatchingCabinet(yearCabinets, "CAB-B");
    assert.ok(matchLetter);
    assert.equal(matchLetter.id, "2021");
  });

  await t.test("3. OSAS Organization storage layout navigation flow simulation", async () => {
    const osasLayout = await getStorageLayout({ officeId: "osas" });
    const orgs = await listOrganizations({ status: "Active,Inactive,Archived" });

    const jpcs = orgs.find((o) => (o.acronym || "").toUpperCase() === "JPCS");
    const ssc = orgs.find((o) => (o.acronym || "").toUpperCase() === "SSC");
    assert.ok(jpcs, "JPCS must exist");
    assert.ok(ssc, "SSC must exist");

    // Simulation State
    let activeStudent = null;
    let selectedRoom = 1;
    let selectedCabinet = null;
    let currentLocatorLevel = "cabinets";
    let expandedDrawer = null;

    const locateStudent = (record) => {
      const rawRoom = record.storage_room ?? 1;
      const targetRoom = Number.isFinite(Number(rawRoom)) ? Number(rawRoom) : rawRoom;
      const rawCab = record.storage_cabinet;
      const roomDef = osasLayout.rooms.find((r) => String(r.id) === String(targetRoom));
      const matchedCab = findMatchingCabinet(roomDef?.cabinets, rawCab);
      const targetCab = matchedCab?.id || rawCab;

      activeStudent = {
        ...record,
        room: targetRoom,
        cabinet: targetCab,
      };
      selectedRoom = targetRoom;
      selectedCabinet = targetCab;
      currentLocatorLevel = "drawers";
      if (areCabinetsEqual(activeStudent.cabinet, selectedCabinet, roomDef?.cabinets)) {
        expandedDrawer = record.storage_drawer;
      }
    };

    const unfocusStudent = () => {
      activeStudent = null;
      expandedDrawer = null;
    };

    // Step 1: Locate JPCS (Academic, Cabinet "ACADEMIC ORGANIZATIONS", Drawer 1)
    locateStudent(jpcs);
    assert.equal(activeStudent.name, jpcs.name);
    assert.equal(selectedCabinet, "ACADEMIC ORGANIZATIONS");
    assert.equal(currentLocatorLevel, "drawers");
    assert.equal(expandedDrawer, "1");

    // Step 2: Unfocus JPCS
    unfocusStudent();
    assert.equal(activeStudent, null);
    assert.equal(expandedDrawer, null);
    // User is still viewing the room/cabinet smoothly
    assert.equal(currentLocatorLevel, "drawers");

    // Step 3: Choose another file / organization (SSC, Non-Academic, Drawer 2)
    locateStudent(ssc);
    assert.equal(activeStudent.name, ssc.name);
    assert.equal(selectedCabinet, "NON-ACADEMIC ORGANIZATIONS");
    assert.equal(currentLocatorLevel, "drawers");
    assert.equal(expandedDrawer, "2");
  });
  process.exit(0);
});
