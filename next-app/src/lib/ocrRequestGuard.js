export function createOcrRequestGuard() {
  let activeFile = null;
  let requestId = 0;

  return {
    begin(file) {
      activeFile = file;
      requestId += 1;
      return requestId;
    },
    invalidate(file = null) {
      activeFile = file;
      requestId += 1;
      return requestId;
    },
    isCurrent(id, file) {
      return id === requestId && file === activeFile;
    },
  };
}
