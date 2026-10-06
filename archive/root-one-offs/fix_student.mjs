import fs from 'fs';
const file = 'next-app/src/lib/studentsRepo.js';
let code = fs.readFileSync(file, 'utf8');

const listStudentsStart = code.indexOf('export async function listStudents');
const getStudentByIdStart = code.indexOf('export async function getStudentById');

const before = code.substring(0, listStudentsStart);
const after = code.substring(getStudentByIdStart);
let listFunc = code.substring(listStudentsStart, getStudentByIdStart);

listFunc = listFunc.replace(/}\s*$/, '');

const fix = `
  let decryptedRows = (rows || []).map(decryptStudentRow);
  if (q) {
    const search = q.toLowerCase();
    decryptedRows = decryptedRows.filter(r => 
      (r.student_no && r.student_no.toLowerCase().includes(search)) ||
      (r.name && r.name.toLowerCase().includes(search)) ||
      (r.email && r.email.toLowerCase().includes(search))
    );
  }
  const lim = Math.min(Math.max(parseInt(limit) || 200, 1), 500);
  const off = Math.max(parseInt(offset) || 0, 0);
  return decryptedRows.slice(off, off + lim);
}
`;

fs.writeFileSync(file, before + listFunc + fix + '\n' + after);
