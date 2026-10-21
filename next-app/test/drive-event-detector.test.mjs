import test from "node:test";
import assert from "node:assert/strict";
import { evaluateDriveStateTransition } from "../src/lib/driveEventDetector.js";

test("evaluateDriveStateTransition: baseline initial poll establishes state without firing events", () => {
  const result = evaluateDriveStateTransition({
    prev: null,
    current: {
      connected: false,
      isEmulated: false,
      label: null,
      path: null,
      freeFormatted: null,
      totalFormatted: null,
    },
    lastRealDrive: null,
    currentView: "directory",
  });

  assert.equal(result.event, null);
  assert.equal(result.nextState.connected, false);
  assert.equal(result.nextLastRealDrive, null);
});

test("evaluateDriveStateTransition: baseline initial poll with already connected drive fires no event", () => {
  const result = evaluateDriveStateTransition({
    prev: null,
    current: {
      connected: true,
      isEmulated: false,
      label: "PUPSJ_BACKUP",
      path: "/media/usb",
      freeFormatted: "50 GB",
      totalFormatted: "128 GB",
    },
    lastRealDrive: null,
    currentView: "backup",
  });

  assert.equal(result.event, null);
  assert.equal(result.nextState.connected, true);
  assert.equal(result.nextLastRealDrive.label, "PUPSJ_BACKUP");
});

test("evaluateDriveStateTransition: enabling demo simulation does not trigger physical drive modal or toast", () => {
  const prevState = {
    connected: false,
    isEmulated: false,
    label: null,
    path: null,
  };
  const currentState = {
    connected: true,
    isEmulated: true,
    label: "Simulated External Media (Dev Node)",
    path: "/tmp/fake_backup",
  };

  const result = evaluateDriveStateTransition({
    prev: prevState,
    current: currentState,
    lastRealDrive: null,
    currentView: "backup",
  });

  assert.equal(result.event, null);
  assert.equal(result.nextState.isEmulated, true);
  assert.equal(result.nextLastRealDrive, null);
});

test("evaluateDriveStateTransition: disabling demo simulation does NOT trigger disconnect modal or toast", () => {
  const prevState = {
    connected: true,
    isEmulated: true,
    label: "Simulated External Media (Dev Node)",
    path: "/tmp/fake_backup",
  };
  const currentState = {
    connected: false,
    isEmulated: false,
    label: null,
    path: null,
  };

  const result = evaluateDriveStateTransition({
    prev: prevState,
    current: currentState,
    lastRealDrive: null,
    currentView: "backup",
  });

  // CRITICAL FIX: Turning off simulation should NEVER emit a disconnect event
  assert.equal(result.event, null);
  assert.equal(result.nextState.connected, false);
});

test("evaluateDriveStateTransition: real physical drive connection opens modal when in backup view", () => {
  const prevState = {
    connected: false,
    isEmulated: false,
    label: null,
    path: null,
  };
  const currentState = {
    connected: true,
    isEmulated: false,
    label: "PUPSJ_BACKUP",
    path: "/mnt/external",
    freeFormatted: "64 GB",
    totalFormatted: "128 GB",
  };

  const result = evaluateDriveStateTransition({
    prev: prevState,
    current: currentState,
    lastRealDrive: null,
    currentView: "backup",
  });

  assert.notEqual(result.event, null);
  assert.equal(result.event.type, "connected");
  assert.equal(result.event.channel, "modal");
  assert.equal(result.event.label, "PUPSJ_BACKUP");
  assert.equal(result.event.path, "/mnt/external");
  assert.equal(result.nextLastRealDrive.label, "PUPSJ_BACKUP");
});

test("evaluateDriveStateTransition: real physical drive connection shows toast when in other views", () => {
  const prevState = {
    connected: false,
    isEmulated: false,
    label: null,
    path: null,
  };
  const currentState = {
    connected: true,
    isEmulated: false,
    label: "PUPSJ_BACKUP",
    path: "/mnt/external",
  };

  const result = evaluateDriveStateTransition({
    prev: prevState,
    current: currentState,
    lastRealDrive: null,
    currentView: "directory", // admin is viewing student directory
  });

  assert.notEqual(result.event, null);
  assert.equal(result.event.type, "connected");
  assert.equal(result.event.channel, "toast");
});

test("evaluateDriveStateTransition: real physical drive disconnection preserves label/path and opens modal in backup view", () => {
  const prevState = {
    connected: true,
    isEmulated: false,
    label: "PUPSJ_BACKUP",
    path: "/mnt/external",
    freeFormatted: "64 GB",
    totalFormatted: "128 GB",
  };
  const currentState = {
    connected: false,
    isEmulated: false,
    label: null,
    path: null,
    freeFormatted: null,
    totalFormatted: null,
  };
  const lastRealDrive = {
    label: "PUPSJ_BACKUP",
    path: "/mnt/external",
    freeFormatted: "64 GB",
    totalFormatted: "128 GB",
  };

  const result = evaluateDriveStateTransition({
    prev: prevState,
    current: currentState,
    lastRealDrive,
    currentView: "backup",
  });

  assert.notEqual(result.event, null);
  assert.equal(result.event.type, "disconnected");
  assert.equal(result.event.channel, "modal");
  assert.equal(result.event.label, "PUPSJ_BACKUP");
  assert.equal(result.event.path, "/mnt/external");
  assert.equal(result.event.freeFormatted, "64 GB");
});

test("evaluateDriveStateTransition: real physical drive disconnection shows toast when on another tab", () => {
  const prevState = {
    connected: true,
    isEmulated: false,
    label: "PUPSJ_BACKUP",
    path: "/mnt/external",
  };
  const currentState = {
    connected: false,
    isEmulated: false,
    label: null,
    path: null,
  };
  const lastRealDrive = {
    label: "PUPSJ_BACKUP",
    path: "/mnt/external",
  };

  const result = evaluateDriveStateTransition({
    prev: prevState,
    current: currentState,
    lastRealDrive,
    currentView: "review", // admin is reviewing records
  });

  assert.notEqual(result.event, null);
  assert.equal(result.event.type, "disconnected");
  assert.equal(result.event.channel, "toast");
  assert.equal(result.event.label, "PUPSJ_BACKUP");
  assert.equal(result.event.path, "/mnt/external");
});
