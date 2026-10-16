const MAX_MISMATCH_RATIO = 0.10;

function normalizeName(value) {
  const source = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\b(?:MS|MR|MRS|MISS|DR|ENGR|ATTY|PROF|HON|REV)\.?\s+/g, "")
    .replace(/[\]\[{}|\\<>]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,]+$/g, "")
    .trim();

  // OCR templates can capture name parts in different reading orders. Sort
  // whole name tokens so order does not affect the existing letter-distance
  // threshold, while keeping spelling differences measurable.
  return source
    .split(/[^A-Z]+/)
    .filter(Boolean)
    .sort()
    .join("");
}

function tokenizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\b(?:MS|MR|MRS|MISS|DR|ENGR|ATTY|PROF|HON|REV)\.?\s+/g, " ")
    .split(/[^A-Z]+/)
    .filter(Boolean);
}

function boundedEditDistance(left, right, cutoff) {
  if (Math.abs(left.length - right.length) > cutoff) return cutoff + 1;
  if (left.length > right.length) return boundedEditDistance(right, left, cutoff);

  const width = right.length + 1;
  let previous = new Uint16Array(width);
  let current = new Uint16Array(width);
  previous.fill(cutoff + 1);
  for (let column = 0; column <= Math.min(right.length, cutoff); column += 1) previous[column] = column;

  for (let row = 1; row <= left.length; row += 1) {
    current.fill(cutoff + 1);
    if (row <= cutoff) current[0] = row;
    const start = Math.max(1, row - cutoff);
    const end = Math.min(right.length, row + cutoff);
    let rowMinimum = current[0];

    for (let column = start; column <= end; column += 1) {
      current[column] = left[row - 1] === right[column - 1]
        ? previous[column - 1]
        : Math.min(previous[column - 1] + 1, previous[column] + 1, current[column - 1] + 1);
      if (current[column] < rowMinimum) rowMinimum = current[column];
    }
    if (rowMinimum > cutoff) return cutoff + 1;
    [previous, current] = [current, previous];
  }
  return previous[right.length];
}

export function matchStudentsByConfiguredOcrName(extractedName, students) {
  const normalizedOcrName = normalizeName(extractedName);
  if (normalizedOcrName.length < 8 || !Array.isArray(students)) return [];

  return students
    .map((student) => {
      const studentNo = student?.studentNo || student?.student_no;
      const normalizedStudentName = student?._ocrNormalizedName || normalizeName(student?.name || student?.Name);
      if (!studentNo || normalizedStudentName.length < 8) return null;
      const cutoff = Math.floor(MAX_MISMATCH_RATIO * Math.max(normalizedOcrName.length, normalizedStudentName.length));
      const distance = boundedEditDistance(normalizedOcrName, normalizedStudentName, cutoff);
      if (distance > cutoff) return null;
      return {
        studentNo,
        name: student.name || student.Name || "",
        student,
        mismatchRatio: distance / Math.max(normalizedOcrName.length, normalizedStudentName.length),
        mismatchPercent: Math.round((distance / Math.max(normalizedOcrName.length, normalizedStudentName.length)) * 100),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.mismatchPercent - right.mismatchPercent || String(left.studentNo).localeCompare(String(right.studentNo)));
}

export function matchStudentsByOcrText(ocrText, students) {
  const tokens = tokenizeName(ocrText);
  if (tokens.length < 2 || !Array.isArray(students)) return [];
  const windowsBySize = new Map();
  const getWindows = (size) => {
    if (windowsBySize.has(size)) return windowsBySize.get(size);
    const uniqueWindows = new Set();
    for (let start = 0; start <= tokens.length - size; start += 1) {
      uniqueWindows.add(tokens.slice(start, start + size).sort().join(""));
    }
    const windows = new Map();
    for (const value of uniqueWindows) {
      if (value.length < 8) continue;
      if (!windows.has(value.length)) windows.set(value.length, []);
      windows.get(value.length).push(value);
    }
    windowsBySize.set(size, windows);
    return windows;
  };

  return students
    .map((student) => {
      const studentNo = student?.studentNo || student?.student_no;
      const nameTokens = student?._ocrNameTokens || tokenizeName(student?.name || student?.Name);
      const normalizedStudentName = student?._ocrNormalizedName || normalizeName(student?.name || student?.Name);
      if (!studentNo || nameTokens.length < 2 || normalizedStudentName.length < 8) return null;

      let bestDistance = Infinity;
      let bestLength = normalizedStudentName.length;
      const minWindowSize = Math.max(2, nameTokens.length - 1);
      const maxWindowSize = Math.min(tokens.length, nameTokens.length + 1);
      const minLength = Math.max(8, Math.ceil(normalizedStudentName.length * 0.9));
      const maxLength = Math.floor(normalizedStudentName.length / 0.9);

      for (let windowSize = minWindowSize; windowSize <= maxWindowSize; windowSize += 1) {
        const windows = getWindows(windowSize);
        for (let windowLength = minLength; windowLength <= maxLength; windowLength += 1) {
          for (const normalizedWindow of windows.get(windowLength) || []) {
            const cutoff = Math.floor(0.10 * Math.max(normalizedWindow.length, normalizedStudentName.length));
            const distance = boundedEditDistance(normalizedWindow, normalizedStudentName, cutoff);
            if (distance > cutoff) continue;
            if (distance < bestDistance) {
              bestDistance = distance;
              bestLength = Math.max(normalizedWindow.length, normalizedStudentName.length);
              if (distance === 0) break;
            }
          }
        }
        if (bestDistance === 0) break;
      }

      if (!Number.isFinite(bestDistance)) return null;
      return {
        studentNo,
        name: student.name || student.Name || "",
        student,
        mismatchRatio: bestDistance / bestLength,
        mismatchPercent: Math.round((bestDistance / bestLength) * 100),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.mismatchPercent - right.mismatchPercent || String(left.studentNo).localeCompare(String(right.studentNo)));
}

export function mergeStudentMatchCandidates(...candidateGroups) {
  const bestByStudentNo = new Map();
  for (const candidate of candidateGroups.flat()) {
    const key = String(candidate?.studentNo || candidate?.student_no || "");
    if (!key) continue;
    const existing = bestByStudentNo.get(key);
    if (!existing || candidate.mismatchRatio < existing.mismatchRatio) bestByStudentNo.set(key, candidate);
  }
  const candidates = [...bestByStudentNo.values()];
  // Exact roster matches outrank approximate matches. If an exact candidate
  // exists, don't surface unrelated near matches as competing assignments.
  const exactCandidates = candidates.filter((candidate) => candidate.mismatchRatio === 0);
  return (exactCandidates.length ? exactCandidates : candidates)
    .sort((left, right) => left.mismatchRatio - right.mismatchRatio || String(left.studentNo).localeCompare(String(right.studentNo)));
}

export function prepareOcrStudentRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((student) => ({
    ...student,
    _ocrNormalizedName: normalizeName(student?.name || student?.Name),
    _ocrNameTokens: tokenizeName(student?.name || student?.Name),
  }));
}
