import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const { pool } = await import("../src/lib/postgres.js");
const {
  countOrganizations,
  getOrganizationArchiveSummary,
  getOrganizationById,
  listOrganizations,
} = await import("../src/lib/organizationsRepo.js");
const { listOsasArchiveDocuments } = await import("../src/lib/documentsRepo.js");

test.after(async () => pool.end());

test("OSAS Records & Archive supports read-only paged browsing", async (t) => {
  await t.test("organization summary and pages agree without assuming seeded names", async () => {
    const filters = { status: "Active,Inactive,Archived" };
    const [summary, total, firstPage, secondPage] = await Promise.all([
      getOrganizationArchiveSummary(),
      countOrganizations(filters),
      listOrganizations({ ...filters, limit: 2, offset: 0 }),
      listOrganizations({ ...filters, limit: 2, offset: 2 }),
    ]);

    assert.ok(Array.isArray(summary.categories));
    assert.equal(
      summary.categories.reduce((sum, row) => sum + Number(row.count), 0),
      total,
    );
    assert.ok(firstPage.length <= 2);
    assert.ok(secondPage.length <= 2);
    assert.ok(firstPage.every((org) => typeof org.active_officer_count === "number"));
    assert.ok(firstPage.every((org) => typeof org.proposal_count === "number"));
    assert.equal(
      new Set([...firstPage, ...secondPage].map((org) => org.id)).size,
      firstPage.length + secondPage.length,
    );
  });

  await t.test("organization details resolve from a paged archive result", async () => {
    const [org] = await listOrganizations({ status: "Active,Inactive,Archived", limit: 1 });
    if (!org) return;

    const detail = await getOrganizationById(org.id);
    assert.equal(detail?.id, org.id);
  });

  await t.test("OSAS document pages include proposals and can be scoped to one organization", async () => {
    const [org] = await listOrganizations({ status: "Active,Inactive,Archived", limit: 1 });
    const [firstPage, secondPage] = await Promise.all([
      listOsasArchiveDocuments({ page: 1, pageSize: 2 }),
      listOsasArchiveDocuments({ page: 2, pageSize: 2 }),
    ]);

    assert.ok(firstPage.rows.length <= 2);
    assert.ok(secondPage.rows.length <= 2);
    assert.equal(firstPage.total, secondPage.total);
    assert.equal(
      new Set([...firstPage.rows, ...secondPage.rows].map((doc) => doc.id)).size,
      firstPage.rows.length + secondPage.rows.length,
    );

    if (org) {
      const scoped = await listOsasArchiveDocuments({ organizationId: org.id, allForOrganization: true });
      assert.ok(scoped.rows.every((doc) => doc.organization_id === org.id));
      assert.equal(scoped.total, scoped.rows.length);
    }
  });
});
