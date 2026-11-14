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

function middleNameMatch(tokens, student) {
  const first = student.firstName || student.first_name;
  const last = student.lastName || student.last_name;
  let given = tokenizeName(first);
  let surname = tokenizeName(last);
  let middle = tokenizeName(student.middleName || student.middle_name);
  if (!given.length || !surname.length) {
    const [family, rest] = String(student.name || student.Name || "").split(",");
    if (!rest) return false;
    const parts = tokenizeName(rest);
    // Legacy display names only identify the middle part reliably when it is an initial.
    if (parts.at(-1)?.length !== 1) return false;
    given = parts.slice(0, -1);
    middle = parts.slice(-1);
    surname = tokenizeName(family);
  }
  if (!given.length || !surname.length || !middle.length) return false;
  const remaining = [...tokens];
  for (const part of [...given, ...surname]) {
    const index = remaining.indexOf(part);
    if (index < 0) return false;
    remaining.splice(index, 1);
  }
  if (remaining.length !== middle.length || !middle.every((part, index) => {
    const observed = remaining[index];
    return part === observed || ((part.length === 1 || observed.length === 1) && part[0] === observed[0]);
  })) return false;
  return middle.every((part, index) => part.length > 1 && part === remaining[index])
    ? "exact-full" : "middle-initial";
}

const candidateRank = (candidate) => candidate.matchKind === "exact-full" ? 0
  : candidate.matchKind === "middle-initial" ? 1
  : candidate.mismatchRatio === 0 ? (tokenizeName(candidate.name).some((part) => part.length === 1) ? 1 : 0) : 2;

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
      const compatible = middleNameMatch(tokenizeName(extractedName), student);
      const actualDistance = boundedEditDistance(normalizedOcrName, normalizedStudentName, cutoff);
      const distance = compatible ? 0 : actualDistance;
      if (distance > cutoff) return null;
      return {
        studentNo,
        name: student.name || student.Name || "",
        student,
        matchKind: compatible || (actualDistance === 0 ? "exact" : "approximate"),
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

      let compatible = false;
      for (let start = 0; start <= tokens.length - nameTokens.length; start += 1) {
        const matchKind = middleNameMatch(tokens.slice(start, start + nameTokens.length), student);
        if (matchKind) {
          compatible = matchKind;
          if (matchKind === "exact-full") break;
        }
      }
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

      if (!Number.isFinite(bestDistance) && !compatible) return null;
      const exact = bestDistance === 0;
      if (compatible) bestDistance = 0;
      return {
        studentNo,
        name: student.name || student.Name || "",
        student,
        matchKind: compatible === "exact-full" ? compatible : exact ? "exact" : compatible || "approximate",
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
    if (!existing || candidateRank(candidate) < candidateRank(existing) ||
      (candidateRank(candidate) === candidateRank(existing) && candidate.mismatchRatio < existing.mismatchRatio)) bestByStudentNo.set(key, candidate);
  }
  const candidates = [...bestByStudentNo.values()];
  const bestRank = Math.min(...candidates.map(candidateRank));
  return candidates.filter((candidate) => candidateRank(candidate) === bestRank)
    .sort((left, right) => left.mismatchRatio - right.mismatchRatio || String(left.studentNo).localeCompare(String(right.studentNo)));
}

export function prepareOcrStudentRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((student) => ({
    ...student,
    _ocrNormalizedName: normalizeName(student?.name || student?.Name),
    _ocrNameTokens: tokenizeName(student?.name || student?.Name),
  }));
}

export function matchOcrStudents(extractedName, ocrText, students) {
  return mergeStudentMatchCandidates(
    extractedName ? matchStudentsByConfiguredOcrName(extractedName, students) : [],
    ocrText ? matchStudentsByOcrText(ocrText, students) : [],
  );
}

export function uniqueOcrStudentMatch(candidates) {
  return candidates.length === 1 ? candidates[0] : null;
}
