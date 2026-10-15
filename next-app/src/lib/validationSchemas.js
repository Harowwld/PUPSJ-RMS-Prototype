import { z } from "zod";

// ============================================================================
// 1. Regular Expression Patterns
// ============================================================================

/**
 * Standard PUP Student Number formats:
 * - 2024-00123-SJ-0 (Full branch campus format)
 * - 2024-00123 (Short format)
 * - ALUM-2019-001 (Legacy or Alumni reference)
 * - TEST-123456-SJ-0 (Automated test suites)
 */
export const PUP_STUDENT_NO_REGEX =
  /^(\d{4}-\d{4,6}-[A-Z]{2}-\d|\d{4}-\d{4,6}|ALUM-\d+.*|ALUMNI-\d+.*|TEST-\d+.*|[A-Z]{3,6}-\d{3,6}.*)$/i;

/**
 * PUP Staff / Personnel IDs:
 * - PUPREGISTRAR-001
 * - PUPOSAS-001
 * - PUPSUPERADMIN-001
 * - SYSADMIN-001
 * - STAFF-001
 */
export const PUP_STAFF_ID_REGEX =
  /^(PUP[A-Z0-9]+-\d{2,4}|[A-Z]{3,15}-\d{2,4})$/i;

/**
 * Philippine Mobile Phone numbers:
 * - 09171234567
 * - +639171234567
 * - 639171234567
 * - Landline with area code e.g. 02-81234567 or 049-5123456
 */
export const PH_PHONE_REGEX =
  /^((\+?63|0)9\d{9}|(0\d{1,2}-?\d{7,8})|\d{7,11})$/;

/**
 * Human Names:
 * Must contain letters, allows accents, spaces, hyphens, apostrophes, and periods.
 * Strictly disallows strings consisting only of digits, punctuation, or dummy code.
 */
export const HUMAN_NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s.'-]+$/;

// ============================================================================
// 2. Field Primitives
// ============================================================================

export const StudentNoSchema = z
  .string({ required_error: "Student Number is required" })
  .trim()
  .min(4, "Student Number must be at least 4 characters")
  .max(30, "Student Number cannot exceed 30 characters")
  .regex(
    PUP_STUDENT_NO_REGEX,
    "Invalid Student Number format (e.g. 2024-00123-SJ-0 or 2024-00123)"
  );

export const PersonNameSchema = (fieldLabel = "Name") =>
  z
    .string({ required_error: `${fieldLabel} is required` })
    .trim()
    .min(2, `${fieldLabel} must be at least 2 characters`)
    .max(60, `${fieldLabel} cannot exceed 60 characters`)
    .regex(
      HUMAN_NAME_REGEX,
      `${fieldLabel} can only contain letters, spaces, hyphens, apostrophes, and periods`
    )
    .refine(
      (val) => /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(val),
      `${fieldLabel} must contain at least one letter`
    );

export const PhoneSchema = z
  .string()
  .trim()
  .regex(
    PH_PHONE_REGEX,
    "Must be a valid contact number (e.g., 09171234567 or +639171234567)"
  );

export const LoginIdentifierSchema = z
  .string({ required_error: "Identifier is required" })
  .trim()
  .min(3, "Identifier must be at least 3 characters")
  .max(100, "Identifier is too long")
  .refine(
    (val) => {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      const isStudentNo = PUP_STUDENT_NO_REGEX.test(val);
      const isStaffId = PUP_STAFF_ID_REGEX.test(val);
      const isDemo = /^(superadmin|admin|staff)$/i.test(val);
      return isEmail || isStudentNo || isStaffId || isDemo;
    },
    "Please enter a valid institutional email, Student Number (e.g. 2024-00123-SJ-0), or Staff ID (e.g. PUPREGISTRAR-001)"
  );

// ============================================================================
// 3. Composite Schemas
// ============================================================================

export const LoginSchema = z.object({
  username: LoginIdentifierSchema,
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

export const ForgotPasswordIdentifySchema = z.object({
  identifier: LoginIdentifierSchema,
});

export const StudentRegistrationSchema = z.object({
  studentNo: StudentNoSchema,
  name: PersonNameSchema("Student Name"),
  courseCode: z
    .string({ required_error: "Course code is required" })
    .trim()
    .min(2, "Course code must be at least 2 characters")
    .max(15, "Course code cannot exceed 15 characters")
    .toUpperCase(),
  yearLevel: z.coerce
    .number({ required_error: "Academic entry year is required" })
    .int("Academic entry year must be an integer")
    .min(2000, "Year must be at least 2000")
    .max(2100, "Year cannot exceed 2100"),
  section: z
    .string({ required_error: "Section is required" })
    .trim()
    .min(1, "Section is required")
    .max(20, "Section cannot exceed 20 characters"),
  room: z.coerce
    .number({ required_error: "Archive Room is required" })
    .int()
    .positive("Archive Room must be a positive number"),
  cabinet: z
    .string({ required_error: "Archive Cabinet is required" })
    .trim()
    .min(1, "Archive Cabinet is required")
    .max(10, "Archive Cabinet cannot exceed 10 characters"),
  drawer: z.coerce
    .number({ required_error: "Archive Drawer is required" })
    .int()
    .min(1, "Drawer must be at least 1")
    .max(20, "Drawer cannot exceed 20"),
  status: z.enum(["Active", "Inactive", "Archived", "Graduated"]).default("Active"),
  officeId: z.string().trim().optional(),
  office_id: z.string().trim().optional(),
});

export const StudentUpdateSchema = z.object({
  name: PersonNameSchema("Student Name").optional(),
  courseCode: z.string().trim().min(2).max(15).toUpperCase().optional(),
  yearLevel: z.coerce.number().int().min(2000).max(2100).optional(),
  section: z.string().trim().min(1).max(20).optional(),
  room: z.coerce.number().int().positive().optional(),
  cabinet: z.string().trim().min(1).max(10).optional(),
  drawer: z.coerce.number().int().min(1).max(20).optional(),
  status: z.enum(["Active", "Inactive", "Archived", "Graduated"]).optional(),
  officeId: z.string().trim().optional(),
  office_id: z.string().trim().optional(),
});

export const StaffRegistrationSchema = z.object({
  id: z.string().trim().optional(),
  fname: PersonNameSchema("First Name"),
  lname: PersonNameSchema("Last Name"),
  role: z
    .string({ required_error: "Role is required" })
    .trim()
    .min(2, "Role must be at least 2 characters")
    .max(30),
  section: z
    .string({ required_error: "Section/Office unit is required" })
    .trim()
    .min(1, "Section is required")
    .max(50),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("A valid email address is required.")
    .toLowerCase(),
  password: z.string().optional(),
  status: z.enum(["Active", "Inactive", "Archived"]).default("Active"),
  officeId: z.string().trim().optional(),
  office_id: z.string().trim().optional(),
});

export const StaffUpdateSchema = z.object({
  fname: PersonNameSchema("First Name").optional(),
  lname: PersonNameSchema("Last Name").optional(),
  role: z.string().trim().min(2).max(30).optional(),
  section: z.string().trim().min(1).max(50).optional(),
  email: z.string().trim().email("A valid email address is required.").toLowerCase().optional(),
  status: z.enum(["Active", "Inactive", "Archived"]).optional(),
  officeId: z.string().trim().optional(),
  office_id: z.string().trim().optional(),
  lastActive: z.string().trim().optional(),
});

export const UpdateProfileSchema = z.object({
  fname: PersonNameSchema("First Name"),
  lname: PersonNameSchema("Last Name"),
  mname: z.string().trim().max(50).optional().nullable(),
  email: z.string().trim().email("A valid email address is required.").toLowerCase().optional(),
  client_type: z.enum(["Student", "Alumni"]).optional(),
  student_no: z.string().trim().optional().nullable(),
});

export const StudentDocumentRequestSchema = z
  .object({
    clientType: z.enum(["Student", "Alumni", "Parent", "Faculty", "External"]).default("Student"),
    studentNo: z.string().trim().optional().nullable(),
    docType: z
      .string({ required_error: "Document type is required" })
      .trim()
      .min(1, "Document type is required"),
    notes: z
      .string({ required_error: "Purpose description is required" })
      .trim()
      .min(5, "Please provide a meaningful purpose description (at least 5 characters)")
      .max(1000, "Description cannot exceed 1000 characters"),
    courseCode: z.string().trim().optional().nullable(),
    requesterName: z.string().trim().max(100).optional().nullable(),
    requesterRelationship: z.string().trim().max(50).optional().nullable(),
    requesterContact: z.string().trim().max(30).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.requesterContact) {
        return PH_PHONE_REGEX.test(data.requesterContact);
      }
      return true;
    },
    {
      message: "Contact number must be a valid phone number (e.g. 09171234567 or +639171234567)",
      path: ["requesterContact"],
    }
  )
  .refine(
    (data) => {
      if (data.studentNo) {
        return PUP_STUDENT_NO_REGEX.test(data.studentNo);
      }
      return true;
    },
    {
      message: "Student Number format is invalid (e.g. 2024-00123-SJ-0)",
      path: ["studentNo"],
    }
  )
  .refine(
    (data) => {
      if (data.requesterName) {
        return HUMAN_NAME_REGEX.test(data.requesterName) && /[A-Za-z]/.test(data.requesterName);
      }
      return true;
    },
    {
      message: "Requester name can only contain letters, spaces, hyphens, and periods",
      path: ["requesterName"],
    }
  );
