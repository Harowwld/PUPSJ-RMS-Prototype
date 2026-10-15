--
-- PostgreSQL database dump
--

\restrict 42Fw2vD5L3on1DNwvQ5HwWqxqisz8KMYTkakk6MQG6JM5rJOu1NFHdMf1IIf4zL

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: ensure_student_identity_profile(); Type: FUNCTION; Schema: public; Owner: pupsj_rms
--

CREATE FUNCTION public.ensure_student_identity_profile() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  existing_profile_id BIGINT;
BEGIN
  IF NEW.identity_profile_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'students' THEN
    SELECT identity_profile_id INTO existing_profile_id
      FROM students WHERE student_no = NEW.student_no;
    IF existing_profile_id IS NOT NULL THEN
      NEW.identity_profile_id := existing_profile_id;
    ELSE
      INSERT INTO student_identity_profiles (display_name)
      VALUES (NEW.name) RETURNING id INTO NEW.identity_profile_id;
    END IF;
    RETURN NEW;
  END IF;

  SELECT identity_profile_id INTO existing_profile_id
    FROM student_accounts WHERE email = NEW.email AND email IS NOT NULL;
  IF existing_profile_id IS NULL AND NEW.student_no IS NOT NULL THEN
    SELECT s.identity_profile_id INTO existing_profile_id
      FROM students s
     WHERE s.student_no = NEW.student_no
       AND NOT EXISTS (
         SELECT 1 FROM student_accounts linked
         WHERE linked.identity_profile_id = s.identity_profile_id
       );
  END IF;
  IF existing_profile_id IS NOT NULL THEN
    NEW.identity_profile_id := existing_profile_id;
  ELSE
    INSERT INTO student_identity_profiles (first_name, middle_name, last_name, email, client_type)
    VALUES (NEW.first_name, NEW.middle_name, NEW.last_name, NEW.email,
            COALESCE(NULLIF(NEW.client_type, ''), 'Student'))
    RETURNING id INTO NEW.identity_profile_id;
  END IF;
  UPDATE student_identity_profiles
     SET first_name = NEW.first_name,
         middle_name = NEW.middle_name,
         last_name = NEW.last_name,
         email = NEW.email,
         client_type = COALESCE(NULLIF(NEW.client_type, ''), 'Student'),
         updated_at = NOW()
   WHERE id = NEW.identity_profile_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.ensure_student_identity_profile() OWNER TO pupsj_rms;

--
-- Name: sync_student_identity_profile(); Type: FUNCTION; Schema: public; Owner: pupsj_rms
--

CREATE FUNCTION public.sync_student_identity_profile() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE student_identity_profiles
     SET first_name = NULL,
         middle_name = NULL,
         last_name = NULL,
         display_name = NEW.name,
         updated_at = NOW()
   WHERE id = NEW.identity_profile_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_student_identity_profile() OWNER TO pupsj_rms;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auth_refresh_tokens; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.auth_refresh_tokens (
    token_hash text NOT NULL,
    session_jti text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    CONSTRAINT auth_refresh_hash_format CHECK ((token_hash ~ '^[a-f0-9]{64}$'::text))
);


ALTER TABLE public.auth_refresh_tokens OWNER TO pupsj_rms;

--
-- Name: auth_session_revocations; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.auth_session_revocations (
    jti text NOT NULL,
    principal_id text,
    reason text DEFAULT 'revoked'::text NOT NULL,
    revoked_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.auth_session_revocations OWNER TO pupsj_rms;

--
-- Name: auth_session_versions; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.auth_session_versions (
    principal_id text NOT NULL,
    session_version integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT auth_session_versions_session_version_check CHECK ((session_version >= 0))
);


ALTER TABLE public.auth_session_versions OWNER TO pupsj_rms;

--
-- Name: auth_sessions; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.auth_sessions (
    jti text NOT NULL,
    principal_id text NOT NULL,
    principal_type text NOT NULL,
    role text NOT NULL,
    username text,
    auth_level text DEFAULT 'password'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_active_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    revoked_reason text,
    CONSTRAINT auth_sessions_principal_type_check CHECK ((principal_type = ANY (ARRAY['staff'::text, 'student'::text])))
);


ALTER TABLE public.auth_sessions OWNER TO pupsj_rms;

--
-- Name: backups; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.backups (
    id bigint NOT NULL,
    filename text NOT NULL,
    size_bytes bigint NOT NULL,
    checksum text NOT NULL,
    status_local text DEFAULT 'Pending'::text NOT NULL,
    status_external text DEFAULT 'Pending'::text NOT NULL,
    status_offsite text DEFAULT 'Pending'::text NOT NULL,
    encryption_key_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    office_id text,
    scope text DEFAULT 'office'::text NOT NULL,
    backup_type text DEFAULT 'Full'::text NOT NULL,
    created_by text,
    CONSTRAINT backups_scope_check CHECK ((scope = ANY (ARRAY['system'::text, 'office'::text]))),
    CONSTRAINT backups_size_bytes_check CHECK ((size_bytes >= 0))
);


ALTER TABLE public.backups OWNER TO pupsj_rms;

--
-- Name: backups_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.backups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.backups_id_seq OWNER TO pupsj_rms;

--
-- Name: backups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.backups_id_seq OWNED BY public.backups.id;


--
-- Name: chat_message_deletions; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.chat_message_deletions (
    message_id bigint NOT NULL,
    user_id text NOT NULL
);


ALTER TABLE public.chat_message_deletions OWNER TO pupsj_rms;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.chat_messages (
    id bigint NOT NULL,
    sender_id text NOT NULL,
    recipient_id text,
    message text DEFAULT ''::text NOT NULL,
    original_message text,
    image_filename text,
    mime_type text,
    is_read boolean DEFAULT false NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    is_edited boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chat_messages OWNER TO pupsj_rms;

--
-- Name: chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.chat_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_messages_id_seq OWNER TO pupsj_rms;

--
-- Name: chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.chat_messages_id_seq OWNED BY public.chat_messages.id;


--
-- Name: courses; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.courses (
    id bigint NOT NULL,
    office_id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT courses_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Inactive'::text, 'Archived'::text])))
);


ALTER TABLE public.courses OWNER TO pupsj_rms;

--
-- Name: courses_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.courses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.courses_id_seq OWNER TO pupsj_rms;

--
-- Name: courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.courses_id_seq OWNED BY public.courses.id;


--
-- Name: document_request_attachments; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.document_request_attachments (
    id bigint NOT NULL,
    document_request_id bigint NOT NULL,
    original_filename text NOT NULL,
    storage_filename text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    attachment_type text DEFAULT 'evidence'::text NOT NULL,
    uploaded_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.document_request_attachments OWNER TO pupsj_rms;

--
-- Name: document_request_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.document_request_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_request_attachments_id_seq OWNER TO pupsj_rms;

--
-- Name: document_request_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.document_request_attachments_id_seq OWNED BY public.document_request_attachments.id;


--
-- Name: document_request_feedback; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.document_request_feedback (
    id bigint NOT NULL,
    document_request_id bigint NOT NULL,
    student_no text,
    rating integer NOT NULL,
    aspect_tags text[] DEFAULT '{}'::text[],
    comments text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    identity_profile_id bigint,
    CONSTRAINT document_request_feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.document_request_feedback OWNER TO pupsj_rms;

--
-- Name: document_request_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.document_request_feedback_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_request_feedback_id_seq OWNER TO pupsj_rms;

--
-- Name: document_request_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.document_request_feedback_id_seq OWNED BY public.document_request_feedback.id;


--
-- Name: document_requests; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.document_requests (
    id bigint NOT NULL,
    office_id text NOT NULL,
    student_no text,
    doc_type text NOT NULL,
    status text DEFAULT 'Pending'::text NOT NULL,
    notes text,
    linked_document_id bigint,
    created_by text,
    updated_by text,
    legacy_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    client_type text DEFAULT 'Student'::text NOT NULL,
    course_code text,
    requester_name text,
    requester_relationship text,
    requester_contact text,
    spa_verified boolean DEFAULT false,
    spa_verified_by text,
    spa_verified_at timestamp with time zone,
    identity_profile_id bigint,
    CONSTRAINT document_requests_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Deficient'::text, 'PendingPayment'::text, 'InProgress'::text, 'Ready'::text, 'Completed'::text, 'Cancelled'::text, 'Shredded'::text])))
);


ALTER TABLE public.document_requests OWNER TO pupsj_rms;

--
-- Name: document_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.document_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_requests_id_seq OWNER TO pupsj_rms;

--
-- Name: document_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.document_requests_id_seq OWNED BY public.document_requests.id;


--
-- Name: document_types; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.document_types (
    id bigint NOT NULL,
    office_id text NOT NULL,
    name text NOT NULL,
    name_norm text NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_requestable boolean DEFAULT false NOT NULL,
    is_compliance boolean DEFAULT false NOT NULL,
    compliance_category text DEFAULT 'General Requirements'::text,
    CONSTRAINT document_types_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Inactive'::text, 'Archived'::text])))
);


ALTER TABLE public.document_types OWNER TO pupsj_rms;

--
-- Name: document_types_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.document_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_types_id_seq OWNER TO pupsj_rms;

--
-- Name: document_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.document_types_id_seq OWNED BY public.document_types.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.documents (
    id bigint NOT NULL,
    office_id text NOT NULL,
    student_no text,
    student_name text,
    doc_type text NOT NULL,
    original_filename text NOT NULL,
    storage_filename text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    approval_status text DEFAULT 'Pending'::text NOT NULL,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    review_note text,
    uploaded_by text,
    is_previewed boolean DEFAULT false NOT NULL,
    legacy_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id text,
    source_ingest_id bigint,
    CONSTRAINT documents_approval_status_check CHECK ((approval_status = ANY (ARRAY['Pending'::text, 'Approved'::text, 'Declined'::text]))),
    CONSTRAINT documents_size_bytes_check CHECK ((size_bytes >= 0))
);

ALTER TABLE ONLY public.documents FORCE ROW LEVEL SECURITY;


ALTER TABLE public.documents OWNER TO pupsj_rms;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO pupsj_rms;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: event_proposals; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.event_proposals (
    id bigint NOT NULL,
    office_id text DEFAULT 'osas'::text NOT NULL,
    student_no text,
    title text NOT NULL,
    organization_name text NOT NULL,
    event_date date,
    venue text,
    description text,
    storage_filename text NOT NULL,
    original_filename text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    status text DEFAULT 'Submitted'::text NOT NULL,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    review_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    organization_id text,
    submitted_by_email text,
    officer_position text,
    is_verified_officer boolean DEFAULT false,
    post_event_status text DEFAULT 'Not Applicable'::text,
    post_event_due_date date,
    post_event_cleared_at timestamp with time zone,
    post_event_cleared_by text,
    identity_profile_id bigint,
    CONSTRAINT event_proposals_mime_type_check CHECK ((mime_type = 'application/pdf'::text)),
    CONSTRAINT event_proposals_office_id_check CHECK ((office_id = 'osas'::text)),
    CONSTRAINT event_proposals_post_event_status_check CHECK ((post_event_status = ANY (ARRAY['Not Applicable'::text, 'Pending Submission'::text, 'Submitted'::text, 'Under Review'::text, 'Needs Revision'::text, 'Cleared'::text, 'Overdue'::text]))),
    CONSTRAINT event_proposals_size_bytes_check CHECK ((size_bytes >= 0)),
    CONSTRAINT event_proposals_status_check CHECK ((status = ANY (ARRAY['Submitted'::text, 'Under Review'::text, 'Needs Revision'::text, 'Approved'::text, 'Declined'::text, 'Archived'::text])))
);


ALTER TABLE public.event_proposals OWNER TO pupsj_rms;

--
-- Name: event_proposals_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.event_proposals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_proposals_id_seq OWNER TO pupsj_rms;

--
-- Name: event_proposals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.event_proposals_id_seq OWNED BY public.event_proposals.id;


--
-- Name: global_audit_logs; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.global_audit_logs (
    id bigint NOT NULL,
    office_id text,
    actor text NOT NULL,
    role text NOT NULL,
    action text NOT NULL,
    details text,
    severity text DEFAULT 'INFO'::text NOT NULL,
    entity_type text,
    entity_id text,
    ip text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.global_audit_logs OWNER TO pupsj_rms;

--
-- Name: global_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.global_audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.global_audit_logs_id_seq OWNER TO pupsj_rms;

--
-- Name: global_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.global_audit_logs_id_seq OWNED BY public.global_audit_logs.id;


--
-- Name: ingest_queue; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.ingest_queue (
    id bigint NOT NULL,
    original_filename text NOT NULL,
    storage_filename text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    source_station text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    promoted_document_id bigint,
    last_error text,
    content_sha256 text,
    batch_id text,
    ocr_status text DEFAULT 'not_started'::text NOT NULL,
    ocr_text text,
    ocr_name text,
    proposed_doc_type text,
    review_status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    review_note text,
    processed_at timestamp with time zone,
    office_id text,
    ocr_regions jsonb,
    ocr_page_index integer,
    staff_selected_student_no text,
    ocr_detected_rotation smallint DEFAULT 0 NOT NULL,
    ocr_student_candidates jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT ingest_queue_size_bytes_check CHECK ((size_bytes >= 0))
);


ALTER TABLE public.ingest_queue OWNER TO pupsj_rms;

--
-- Name: ingest_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.ingest_queue_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ingest_queue_id_seq OWNER TO pupsj_rms;

--
-- Name: ingest_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.ingest_queue_id_seq OWNED BY public.ingest_queue.id;


--
-- Name: modules; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.modules (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    icon text,
    sidebar_group text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    component_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.modules OWNER TO pupsj_rms;

--
-- Name: office_modules; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.office_modules (
    office_id text NOT NULL,
    module_id text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    config jsonb,
    sort_order integer,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.office_modules OWNER TO pupsj_rms;

--
-- Name: offices; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.offices (
    id text NOT NULL,
    name text NOT NULL,
    short_name text NOT NULL,
    description text,
    icon text,
    accent_color text DEFAULT '#800000'::text NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    station_name text,
    storage_path text,
    ingest_token text,
    scanner_model text,
    last_station_ping timestamp with time zone,
    inbound_path text,
    CONSTRAINT offices_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Inactive'::text])))
);


ALTER TABLE public.offices OWNER TO pupsj_rms;

--
-- Name: organization_bylaws_versions; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.organization_bylaws_versions (
    id bigint NOT NULL,
    organization_id text NOT NULL,
    version_tag text NOT NULL,
    storage_filename text NOT NULL,
    original_filename text NOT NULL,
    amendment_summary text,
    submitted_by_email text,
    approved_by text,
    status text DEFAULT 'Pending'::text NOT NULL,
    review_note text,
    effective_date date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    size_bytes bigint,
    mime_type text DEFAULT 'application/pdf'::text NOT NULL,
    CONSTRAINT organization_bylaws_versions_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Approved'::text, 'Needs Revision'::text, 'Declined'::text, 'Superseded'::text])))
);


ALTER TABLE public.organization_bylaws_versions OWNER TO pupsj_rms;

--
-- Name: organization_bylaws_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.organization_bylaws_versions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organization_bylaws_versions_id_seq OWNER TO pupsj_rms;

--
-- Name: organization_bylaws_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.organization_bylaws_versions_id_seq OWNED BY public.organization_bylaws_versions.id;


--
-- Name: organization_officers; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.organization_officers (
    id bigint NOT NULL,
    organization_id text NOT NULL,
    email text NOT NULL,
    student_no text,
    student_name text,
    "position" text NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.organization_officers OWNER TO pupsj_rms;

--
-- Name: organization_officers_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.organization_officers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organization_officers_id_seq OWNER TO pupsj_rms;

--
-- Name: organization_officers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.organization_officers_id_seq OWNED BY public.organization_officers.id;


--
-- Name: osas_post_event_reports; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.osas_post_event_reports (
    id bigint NOT NULL,
    event_proposal_id bigint NOT NULL,
    organization_id text NOT NULL,
    submitted_by_email text NOT NULL,
    actual_attendance integer DEFAULT 0,
    total_expenses numeric(12,2) DEFAULT 0.00,
    narrative_storage_filename text NOT NULL,
    narrative_original_filename text NOT NULL,
    liquidation_storage_filename text,
    liquidation_original_filename text,
    status text DEFAULT 'Submitted'::text NOT NULL,
    review_note text,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT osas_post_event_reports_actual_attendance_check CHECK ((actual_attendance >= 0)),
    CONSTRAINT osas_post_event_reports_status_check CHECK ((status = ANY (ARRAY['Submitted'::text, 'Under Review'::text, 'Needs Revision'::text, 'Cleared'::text, 'Declined'::text]))),
    CONSTRAINT osas_post_event_reports_total_expenses_check CHECK ((total_expenses >= (0)::numeric))
);


ALTER TABLE public.osas_post_event_reports OWNER TO pupsj_rms;

--
-- Name: osas_post_event_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.osas_post_event_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.osas_post_event_reports_id_seq OWNER TO pupsj_rms;

--
-- Name: osas_post_event_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.osas_post_event_reports_id_seq OWNED BY public.osas_post_event_reports.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.password_reset_tokens (
    id bigint NOT NULL,
    staff_id text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    requested_ip text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO pupsj_rms;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_tokens_id_seq OWNER TO pupsj_rms;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: rate_limit_hits; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.rate_limit_hits (
    id bigint NOT NULL,
    endpoint_type text NOT NULL,
    identifier text NOT NULL,
    ip_address text,
    user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rate_limit_hits OWNER TO pupsj_rms;

--
-- Name: rate_limit_hits_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.rate_limit_hits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rate_limit_hits_id_seq OWNER TO pupsj_rms;

--
-- Name: rate_limit_hits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.rate_limit_hits_id_seq OWNED BY public.rate_limit_hits.id;


--
-- Name: rate_limit_violations; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.rate_limit_violations (
    id bigint NOT NULL,
    endpoint_type text NOT NULL,
    identifier text NOT NULL,
    ip_address text,
    user_id text,
    violation_count integer DEFAULT 1 NOT NULL,
    lockout_until timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rate_limit_violations_violation_count_check CHECK ((violation_count > 0))
);


ALTER TABLE public.rate_limit_violations OWNER TO pupsj_rms;

--
-- Name: rate_limit_violations_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.rate_limit_violations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rate_limit_violations_id_seq OWNER TO pupsj_rms;

--
-- Name: rate_limit_violations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.rate_limit_violations_id_seq OWNED BY public.rate_limit_violations.id;


--
-- Name: rate_limits; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.rate_limits (
    id bigint NOT NULL,
    endpoint_type text NOT NULL,
    identifier text DEFAULT 'default'::text NOT NULL,
    window_seconds integer NOT NULL,
    max_requests integer NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rate_limits_max_requests_check CHECK ((max_requests > 0)),
    CONSTRAINT rate_limits_window_seconds_check CHECK ((window_seconds > 0))
);


ALTER TABLE public.rate_limits OWNER TO pupsj_rms;

--
-- Name: rate_limits_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.rate_limits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rate_limits_id_seq OWNER TO pupsj_rms;

--
-- Name: rate_limits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.rate_limits_id_seq OWNED BY public.rate_limits.id;


--
-- Name: recognition_templates; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.recognition_templates (
    id bigint NOT NULL,
    office_id text NOT NULL,
    document_type_id bigint NOT NULL,
    name text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    page_index integer DEFAULT 0 NOT NULL,
    rotation integer DEFAULT 0 NOT NULL,
    regions jsonb NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    created_by text,
    updated_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recognition_templates_page_index_check CHECK ((page_index >= 0)),
    CONSTRAINT recognition_templates_rotation_check CHECK ((rotation = ANY (ARRAY[0, 90, 180, 270]))),
    CONSTRAINT recognition_templates_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Archived'::text]))),
    CONSTRAINT recognition_templates_version_check CHECK ((version > 0))
);


ALTER TABLE public.recognition_templates OWNER TO pupsj_rms;

--
-- Name: recognition_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.recognition_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recognition_templates_id_seq OWNER TO pupsj_rms;

--
-- Name: recognition_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.recognition_templates_id_seq OWNED BY public.recognition_templates.id;


--
-- Name: scan_session_incoming; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.scan_session_incoming (
    id bigint NOT NULL,
    session_id bigint NOT NULL,
    client_ref text,
    storage_filename text,
    filename text,
    mime_type text,
    size_bytes bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.scan_session_incoming OWNER TO pupsj_rms;

--
-- Name: scan_session_incoming_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.scan_session_incoming_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scan_session_incoming_id_seq OWNER TO pupsj_rms;

--
-- Name: scan_session_incoming_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.scan_session_incoming_id_seq OWNED BY public.scan_session_incoming.id;


--
-- Name: scan_sessions; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.scan_sessions (
    id bigint NOT NULL,
    staff_id text NOT NULL,
    status text DEFAULT 'Pending'::text NOT NULL,
    pair_token_hash text,
    token_expires_at timestamp with time zone,
    paired_at timestamp with time zone,
    last_heartbeat_at timestamp with time zone,
    phone_label text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.scan_sessions OWNER TO pupsj_rms;

--
-- Name: scan_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.scan_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scan_sessions_id_seq OWNER TO pupsj_rms;

--
-- Name: scan_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.scan_sessions_id_seq OWNED BY public.scan_sessions.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.schema_migrations (
    filename text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.schema_migrations OWNER TO pupsj_rms;

--
-- Name: sections; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.sections (
    id bigint NOT NULL,
    office_id text NOT NULL,
    name text NOT NULL,
    course_code text,
    status text DEFAULT 'Active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    course_archived boolean DEFAULT false NOT NULL,
    CONSTRAINT sections_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Inactive'::text, 'Archived'::text])))
);


ALTER TABLE public.sections OWNER TO pupsj_rms;

--
-- Name: sections_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.sections_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sections_id_seq OWNER TO pupsj_rms;

--
-- Name: sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.sections_id_seq OWNED BY public.sections.id;


--
-- Name: security_questions; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.security_questions (
    id integer NOT NULL,
    question text NOT NULL,
    is_required boolean DEFAULT true NOT NULL
);


ALTER TABLE public.security_questions OWNER TO pupsj_rms;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.settings (
    key text NOT NULL,
    value text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.settings OWNER TO pupsj_rms;

--
-- Name: staff; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.staff (
    id text NOT NULL,
    office_id text,
    fname text NOT NULL,
    lname text NOT NULL,
    role text NOT NULL,
    section text NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    email text NOT NULL,
    password_hash text,
    password_last_changed timestamp with time zone,
    last_active timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    avatar_filename text,
    totp_secret text,
    totp_enabled boolean DEFAULT false NOT NULL,
    serial_key_hash text,
    CONSTRAINT staff_role_check CHECK ((role = ANY (ARRAY['SuperAdmin'::text, 'SystemAdmin'::text, 'Admin'::text, 'Staff'::text]))),
    CONSTRAINT staff_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Inactive'::text, 'Archived'::text])))
);


ALTER TABLE public.staff OWNER TO pupsj_rms;

--
-- Name: staff_notification_item_states; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.staff_notification_item_states (
    staff_id text NOT NULL,
    notification_id bigint NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.staff_notification_item_states OWNER TO pupsj_rms;

--
-- Name: staff_notification_state; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.staff_notification_state (
    staff_id text NOT NULL,
    last_seen_reviewed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.staff_notification_state OWNER TO pupsj_rms;

--
-- Name: staff_recovery_codes; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.staff_recovery_codes (
    id bigint NOT NULL,
    staff_id text NOT NULL,
    code_hash text NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.staff_recovery_codes OWNER TO pupsj_rms;

--
-- Name: staff_recovery_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.staff_recovery_codes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.staff_recovery_codes_id_seq OWNER TO pupsj_rms;

--
-- Name: staff_recovery_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.staff_recovery_codes_id_seq OWNED BY public.staff_recovery_codes.id;


--
-- Name: staff_security_answers; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.staff_security_answers (
    staff_id text NOT NULL,
    question_id integer NOT NULL,
    answer_hash text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.staff_security_answers OWNER TO pupsj_rms;

--
-- Name: student_accounts; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.student_accounts (
    student_no text,
    password_hash text NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    last_active timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id bigint NOT NULL,
    avatar_filename text,
    identity_profile_id bigint NOT NULL,
    legacy_source text,
    legacy_id text,
    CONSTRAINT student_accounts_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Inactive'::text, 'Archived'::text])))
);


ALTER TABLE public.student_accounts OWNER TO pupsj_rms;

--
-- Name: student_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.student_accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_accounts_id_seq OWNER TO pupsj_rms;

--
-- Name: student_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.student_accounts_id_seq OWNED BY public.student_accounts.id;


--
-- Name: student_identity_link_reviews; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.student_identity_link_reviews (
    id bigint NOT NULL,
    entity_type text NOT NULL,
    entity_id bigint NOT NULL,
    student_no text,
    student_account_id bigint,
    registry_profile_id bigint,
    account_profile_id bigint,
    status text DEFAULT 'Pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    CONSTRAINT student_identity_link_reviews_entity_type_check CHECK ((entity_type = ANY (ARRAY['student_account'::text, 'document_request'::text, 'event_proposal'::text, 'request_feedback'::text]))),
    CONSTRAINT student_identity_link_reviews_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Resolved'::text])))
);


ALTER TABLE public.student_identity_link_reviews OWNER TO pupsj_rms;

--
-- Name: student_identity_link_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.student_identity_link_reviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_identity_link_reviews_id_seq OWNER TO pupsj_rms;

--
-- Name: student_identity_link_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.student_identity_link_reviews_id_seq OWNED BY public.student_identity_link_reviews.id;


--
-- Name: student_identity_profiles; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.student_identity_profiles (
    id bigint NOT NULL,
    first_name text,
    middle_name text,
    last_name text,
    display_name text,
    email text,
    client_type text DEFAULT 'Student'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.student_identity_profiles OWNER TO pupsj_rms;

--
-- Name: student_identity_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.student_identity_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_identity_profiles_id_seq OWNER TO pupsj_rms;

--
-- Name: student_identity_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.student_identity_profiles_id_seq OWNED BY public.student_identity_profiles.id;


--
-- Name: student_office_memberships; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.student_office_memberships (
    student_no text NOT NULL,
    office_id text NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT student_office_memberships_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Inactive'::text])))
);


ALTER TABLE public.student_office_memberships OWNER TO pupsj_rms;

--
-- Name: student_organizations; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.student_organizations (
    id text NOT NULL,
    name text NOT NULL,
    acronym text,
    category text DEFAULT 'Academic'::text NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    adviser_name text,
    adviser_email text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    storage_room integer DEFAULT 1,
    storage_cabinet text DEFAULT 'NON-ACADEMIC ORGANIZATIONS'::text,
    storage_drawer text DEFAULT '1'::text
);


ALTER TABLE public.student_organizations OWNER TO pupsj_rms;

--
-- Name: student_security_answers; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.student_security_answers (
    student_account_id bigint NOT NULL,
    question_id integer NOT NULL,
    answer_hash text NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.student_security_answers OWNER TO pupsj_rms;

--
-- Name: students; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.students (
    student_no text NOT NULL,
    name text NOT NULL,
    course_code text,
    year_level integer,
    section text,
    status text DEFAULT 'Active'::text NOT NULL,
    storage_room integer,
    storage_cabinet text,
    storage_drawer text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    identity_profile_id bigint NOT NULL,
    CONSTRAINT students_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Inactive'::text, 'Archived'::text])))
);

ALTER TABLE ONLY public.students FORCE ROW LEVEL SECURITY;


ALTER TABLE public.students OWNER TO pupsj_rms;

--
-- Name: transaction_updates; Type: TABLE; Schema: public; Owner: pupsj_rms
--

CREATE TABLE public.transaction_updates (
    id bigint NOT NULL,
    document_request_id bigint,
    event_proposal_id bigint,
    status text NOT NULL,
    message text,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transaction_updates_check CHECK (((((document_request_id IS NOT NULL))::integer + ((event_proposal_id IS NOT NULL))::integer) = 1))
);


ALTER TABLE public.transaction_updates OWNER TO pupsj_rms;

--
-- Name: transaction_updates_id_seq; Type: SEQUENCE; Schema: public; Owner: pupsj_rms
--

CREATE SEQUENCE public.transaction_updates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transaction_updates_id_seq OWNER TO pupsj_rms;

--
-- Name: transaction_updates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pupsj_rms
--

ALTER SEQUENCE public.transaction_updates_id_seq OWNED BY public.transaction_updates.id;


--
-- Name: backups id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.backups ALTER COLUMN id SET DEFAULT nextval('public.backups_id_seq'::regclass);


--
-- Name: chat_messages id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.chat_messages ALTER COLUMN id SET DEFAULT nextval('public.chat_messages_id_seq'::regclass);


--
-- Name: courses id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.courses ALTER COLUMN id SET DEFAULT nextval('public.courses_id_seq'::regclass);


--
-- Name: document_request_attachments id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_request_attachments ALTER COLUMN id SET DEFAULT nextval('public.document_request_attachments_id_seq'::regclass);


--
-- Name: document_request_feedback id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_request_feedback ALTER COLUMN id SET DEFAULT nextval('public.document_request_feedback_id_seq'::regclass);


--
-- Name: document_requests id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_requests ALTER COLUMN id SET DEFAULT nextval('public.document_requests_id_seq'::regclass);


--
-- Name: document_types id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_types ALTER COLUMN id SET DEFAULT nextval('public.document_types_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: event_proposals id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.event_proposals ALTER COLUMN id SET DEFAULT nextval('public.event_proposals_id_seq'::regclass);


--
-- Name: global_audit_logs id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.global_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.global_audit_logs_id_seq'::regclass);


--
-- Name: ingest_queue id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.ingest_queue ALTER COLUMN id SET DEFAULT nextval('public.ingest_queue_id_seq'::regclass);


--
-- Name: organization_bylaws_versions id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.organization_bylaws_versions ALTER COLUMN id SET DEFAULT nextval('public.organization_bylaws_versions_id_seq'::regclass);


--
-- Name: organization_officers id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.organization_officers ALTER COLUMN id SET DEFAULT nextval('public.organization_officers_id_seq'::regclass);


--
-- Name: osas_post_event_reports id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.osas_post_event_reports ALTER COLUMN id SET DEFAULT nextval('public.osas_post_event_reports_id_seq'::regclass);


--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: rate_limit_hits id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.rate_limit_hits ALTER COLUMN id SET DEFAULT nextval('public.rate_limit_hits_id_seq'::regclass);


--
-- Name: rate_limit_violations id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.rate_limit_violations ALTER COLUMN id SET DEFAULT nextval('public.rate_limit_violations_id_seq'::regclass);


--
-- Name: rate_limits id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.rate_limits ALTER COLUMN id SET DEFAULT nextval('public.rate_limits_id_seq'::regclass);


--
-- Name: recognition_templates id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.recognition_templates ALTER COLUMN id SET DEFAULT nextval('public.recognition_templates_id_seq'::regclass);


--
-- Name: scan_session_incoming id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.scan_session_incoming ALTER COLUMN id SET DEFAULT nextval('public.scan_session_incoming_id_seq'::regclass);


--
-- Name: scan_sessions id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.scan_sessions ALTER COLUMN id SET DEFAULT nextval('public.scan_sessions_id_seq'::regclass);


--
-- Name: sections id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.sections ALTER COLUMN id SET DEFAULT nextval('public.sections_id_seq'::regclass);


--
-- Name: staff_recovery_codes id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.staff_recovery_codes ALTER COLUMN id SET DEFAULT nextval('public.staff_recovery_codes_id_seq'::regclass);


--
-- Name: student_accounts id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.student_accounts ALTER COLUMN id SET DEFAULT nextval('public.student_accounts_id_seq'::regclass);


--
-- Name: student_identity_link_reviews id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.student_identity_link_reviews ALTER COLUMN id SET DEFAULT nextval('public.student_identity_link_reviews_id_seq'::regclass);


--
-- Name: student_identity_profiles id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.student_identity_profiles ALTER COLUMN id SET DEFAULT nextval('public.student_identity_profiles_id_seq'::regclass);


--
-- Name: transaction_updates id; Type: DEFAULT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.transaction_updates ALTER COLUMN id SET DEFAULT nextval('public.transaction_updates_id_seq'::regclass);


--
-- Name: auth_refresh_tokens auth_refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.auth_refresh_tokens
    ADD CONSTRAINT auth_refresh_tokens_pkey PRIMARY KEY (token_hash);


--
-- Name: auth_session_revocations auth_session_revocations_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.auth_session_revocations
    ADD CONSTRAINT auth_session_revocations_pkey PRIMARY KEY (jti);


--
-- Name: auth_session_versions auth_session_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.auth_session_versions
    ADD CONSTRAINT auth_session_versions_pkey PRIMARY KEY (principal_id);


--
-- Name: auth_sessions auth_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (jti);


--
-- Name: backups backups_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_pkey PRIMARY KEY (id);


--
-- Name: chat_message_deletions chat_message_deletions_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.chat_message_deletions
    ADD CONSTRAINT chat_message_deletions_pkey PRIMARY KEY (message_id, user_id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: courses courses_office_id_code_key; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_office_id_code_key UNIQUE (office_id, code);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: document_request_attachments document_request_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_request_attachments
    ADD CONSTRAINT document_request_attachments_pkey PRIMARY KEY (id);


--
-- Name: document_request_feedback document_request_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_request_feedback
    ADD CONSTRAINT document_request_feedback_pkey PRIMARY KEY (id);


--
-- Name: document_requests document_requests_office_id_legacy_id_key; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_office_id_legacy_id_key UNIQUE (office_id, legacy_id);


--
-- Name: document_requests document_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_pkey PRIMARY KEY (id);


--
-- Name: document_types document_types_office_id_name_norm_key; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_office_id_name_norm_key UNIQUE (office_id, name_norm);


--
-- Name: document_types document_types_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_pkey PRIMARY KEY (id);


--
-- Name: documents documents_office_id_legacy_id_key; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_office_id_legacy_id_key UNIQUE (office_id, legacy_id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: event_proposals event_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.event_proposals
    ADD CONSTRAINT event_proposals_pkey PRIMARY KEY (id);


--
-- Name: global_audit_logs global_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.global_audit_logs
    ADD CONSTRAINT global_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: ingest_queue ingest_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.ingest_queue
    ADD CONSTRAINT ingest_queue_pkey PRIMARY KEY (id);


--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);


--
-- Name: office_modules office_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.office_modules
    ADD CONSTRAINT office_modules_pkey PRIMARY KEY (office_id, module_id);


--
-- Name: offices offices_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.offices
    ADD CONSTRAINT offices_pkey PRIMARY KEY (id);


--
-- Name: organization_bylaws_versions organization_bylaws_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.organization_bylaws_versions
    ADD CONSTRAINT organization_bylaws_versions_pkey PRIMARY KEY (id);


--
-- Name: organization_officers organization_officers_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.organization_officers
    ADD CONSTRAINT organization_officers_pkey PRIMARY KEY (id);


--
-- Name: osas_post_event_reports osas_post_event_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.osas_post_event_reports
    ADD CONSTRAINT osas_post_event_reports_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: rate_limit_hits rate_limit_hits_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.rate_limit_hits
    ADD CONSTRAINT rate_limit_hits_pkey PRIMARY KEY (id);


--
-- Name: rate_limit_violations rate_limit_violations_endpoint_type_identifier_key; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.rate_limit_violations
    ADD CONSTRAINT rate_limit_violations_endpoint_type_identifier_key UNIQUE (endpoint_type, identifier);


--
-- Name: rate_limit_violations rate_limit_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.rate_limit_violations
    ADD CONSTRAINT rate_limit_violations_pkey PRIMARY KEY (id);


--
-- Name: rate_limits rate_limits_endpoint_type_identifier_key; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_endpoint_type_identifier_key UNIQUE (endpoint_type, identifier);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (id);


--
-- Name: recognition_templates recognition_templates_office_id_document_type_id_name_versi_key; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.recognition_templates
    ADD CONSTRAINT recognition_templates_office_id_document_type_id_name_versi_key UNIQUE (office_id, document_type_id, name, version);


--
-- Name: recognition_templates recognition_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.recognition_templates
    ADD CONSTRAINT recognition_templates_pkey PRIMARY KEY (id);


--
-- Name: scan_session_incoming scan_session_incoming_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.scan_session_incoming
    ADD CONSTRAINT scan_session_incoming_pkey PRIMARY KEY (id);


--
-- Name: scan_sessions scan_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.scan_sessions
    ADD CONSTRAINT scan_sessions_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (filename);


--
-- Name: sections sections_office_id_name_course_code_key; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_office_id_name_course_code_key UNIQUE (office_id, name, course_code);


--
-- Name: sections sections_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_pkey PRIMARY KEY (id);


--
-- Name: security_questions security_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.security_questions
    ADD CONSTRAINT security_questions_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: staff staff_email_key; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_email_key UNIQUE (email);


--
-- Name: staff_notification_item_states staff_notification_item_states_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.staff_notification_item_states
    ADD CONSTRAINT staff_notification_item_states_pkey PRIMARY KEY (staff_id, notification_id);


--
-- Name: staff_notification_state staff_notification_state_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.staff_notification_state
    ADD CONSTRAINT staff_notification_state_pkey PRIMARY KEY (staff_id);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: staff_recovery_codes staff_recovery_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.staff_recovery_codes
    ADD CONSTRAINT staff_recovery_codes_pkey PRIMARY KEY (id);


--
-- Name: staff_security_answers staff_security_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.staff_security_answers
    ADD CONSTRAINT staff_security_answers_pkey PRIMARY KEY (staff_id, question_id);


--
-- Name: student_accounts student_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.student_accounts
    ADD CONSTRAINT student_accounts_pkey PRIMARY KEY (id);


--
-- Name: student_identity_link_reviews student_identity_link_reviews_entity_type_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.student_identity_link_reviews
    ADD CONSTRAINT student_identity_link_reviews_entity_type_entity_id_key UNIQUE (entity_type, entity_id);


--
-- Name: student_identity_link_reviews student_identity_link_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.student_identity_link_reviews
    ADD CONSTRAINT student_identity_link_reviews_pkey PRIMARY KEY (id);


--
-- Name: student_identity_profiles student_identity_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.student_identity_profiles
    ADD CONSTRAINT student_identity_profiles_pkey PRIMARY KEY (id);


--
-- Name: student_office_memberships student_office_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.student_office_memberships
    ADD CONSTRAINT student_office_memberships_pkey PRIMARY KEY (student_no, office_id);


--
-- Name: student_organizations student_organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.student_organizations
    ADD CONSTRAINT student_organizations_pkey PRIMARY KEY (id);


--
-- Name: student_security_answers student_security_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.student_security_answers
    ADD CONSTRAINT student_security_answers_pkey PRIMARY KEY (student_account_id, question_id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (student_no);


--
-- Name: transaction_updates transaction_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.transaction_updates
    ADD CONSTRAINT transaction_updates_pkey PRIMARY KEY (id);


--
-- Name: document_request_feedback uq_document_request_feedback; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_request_feedback
    ADD CONSTRAINT uq_document_request_feedback UNIQUE (document_request_id);


--
-- Name: organization_officers uq_org_officer_email; Type: CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.organization_officers
    ADD CONSTRAINT uq_org_officer_email UNIQUE (organization_id, email);


--
-- Name: idx_auth_refresh_tokens_session; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_auth_refresh_tokens_session ON public.auth_refresh_tokens USING btree (session_jti);


--
-- Name: idx_auth_session_revocations_revoked_at; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_auth_session_revocations_revoked_at ON public.auth_session_revocations USING btree (revoked_at DESC);


--
-- Name: idx_auth_sessions_active_expiry; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_auth_sessions_active_expiry ON public.auth_sessions USING btree (expires_at) WHERE (revoked_at IS NULL);


--
-- Name: idx_auth_sessions_principal_active; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_auth_sessions_principal_active ON public.auth_sessions USING btree (principal_id, last_active_at DESC) WHERE (revoked_at IS NULL);


--
-- Name: idx_backups_created_at; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_backups_created_at ON public.backups USING btree (created_at DESC);


--
-- Name: idx_backups_created_by; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_backups_created_by ON public.backups USING btree (created_by);


--
-- Name: idx_backups_filename; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_backups_filename ON public.backups USING btree (filename);


--
-- Name: idx_backups_scope_office_created; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_backups_scope_office_created ON public.backups USING btree (scope, office_id, created_at DESC);


--
-- Name: idx_bylaws_versions_org_id; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_bylaws_versions_org_id ON public.organization_bylaws_versions USING btree (organization_id);


--
-- Name: idx_bylaws_versions_status; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_bylaws_versions_status ON public.organization_bylaws_versions USING btree (status);


--
-- Name: idx_chat_messages_visibility; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_chat_messages_visibility ON public.chat_messages USING btree (recipient_id, sender_id, created_at);


--
-- Name: idx_courses_office_code; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_courses_office_code ON public.courses USING btree (office_id, code);


--
-- Name: idx_doc_req_attachments_req_id; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_doc_req_attachments_req_id ON public.document_request_attachments USING btree (document_request_id);


--
-- Name: idx_doc_request_feedback_rating; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_doc_request_feedback_rating ON public.document_request_feedback USING btree (rating);


--
-- Name: idx_doc_request_feedback_req; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_doc_request_feedback_req ON public.document_request_feedback USING btree (document_request_id);


--
-- Name: idx_document_request_feedback_identity_profile; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_document_request_feedback_identity_profile ON public.document_request_feedback USING btree (identity_profile_id);


--
-- Name: idx_document_requests_identity_profile; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_document_requests_identity_profile ON public.document_requests USING btree (identity_profile_id);


--
-- Name: idx_document_requests_office_status; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_document_requests_office_status ON public.document_requests USING btree (office_id, status);


--
-- Name: idx_documents_office_org; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_documents_office_org ON public.documents USING btree (office_id, organization_id);


--
-- Name: idx_documents_office_student; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_documents_office_student ON public.documents USING btree (office_id, student_no);


--
-- Name: idx_documents_organization_id; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_documents_organization_id ON public.documents USING btree (organization_id);


--
-- Name: idx_documents_source_ingest_id; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE UNIQUE INDEX idx_documents_source_ingest_id ON public.documents USING btree (source_ingest_id) WHERE (source_ingest_id IS NOT NULL);


--
-- Name: idx_event_proposals_active; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_event_proposals_active ON public.event_proposals USING btree (office_id, created_at DESC) WHERE (archived_at IS NULL);


--
-- Name: idx_event_proposals_identity_profile; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_event_proposals_identity_profile ON public.event_proposals USING btree (identity_profile_id);


--
-- Name: idx_event_proposals_org_id; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_event_proposals_org_id ON public.event_proposals USING btree (organization_id);


--
-- Name: idx_event_proposals_post_event_status; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_event_proposals_post_event_status ON public.event_proposals USING btree (post_event_status);


--
-- Name: idx_event_proposals_status; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_event_proposals_status ON public.event_proposals USING btree (status, created_at DESC);


--
-- Name: idx_event_proposals_submitted_email; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_event_proposals_submitted_email ON public.event_proposals USING btree (lower(submitted_by_email));


--
-- Name: idx_global_audit_logs_action_created_at; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_global_audit_logs_action_created_at ON public.global_audit_logs USING btree (action, created_at DESC);


--
-- Name: idx_global_audit_logs_office_created_at; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_global_audit_logs_office_created_at ON public.global_audit_logs USING btree (office_id, created_at DESC);


--
-- Name: idx_ingest_queue_batch_review; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_ingest_queue_batch_review ON public.ingest_queue USING btree (batch_id, review_status, created_at DESC);


--
-- Name: idx_ingest_queue_batch_status; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_ingest_queue_batch_status ON public.ingest_queue USING btree (batch_id, review_status, created_at DESC);


--
-- Name: idx_ingest_queue_review_status; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_ingest_queue_review_status ON public.ingest_queue USING btree (review_status, created_at DESC);


--
-- Name: idx_ingest_queue_sha256; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_ingest_queue_sha256 ON public.ingest_queue USING btree (content_sha256);


--
-- Name: idx_ingest_queue_status_created_at; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_ingest_queue_status_created_at ON public.ingest_queue USING btree (status, created_at DESC);


--
-- Name: idx_notification_item_states_notification; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_notification_item_states_notification ON public.staff_notification_item_states USING btree (notification_id, staff_id);


--
-- Name: idx_notification_item_states_staff_read; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_notification_item_states_staff_read ON public.staff_notification_item_states USING btree (staff_id, is_read, is_archived);


--
-- Name: idx_one_approved_bylaws_version_per_org; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE UNIQUE INDEX idx_one_approved_bylaws_version_per_org ON public.organization_bylaws_versions USING btree (organization_id) WHERE (status = 'Approved'::text);


--
-- Name: idx_org_officers_email; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_org_officers_email ON public.organization_officers USING btree (lower(email));


--
-- Name: idx_org_officers_org_id; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_org_officers_org_id ON public.organization_officers USING btree (organization_id);


--
-- Name: idx_password_reset_tokens_active; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_password_reset_tokens_active ON public.password_reset_tokens USING btree (staff_id, expires_at) WHERE (used_at IS NULL);


--
-- Name: idx_post_event_org_id; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_post_event_org_id ON public.osas_post_event_reports USING btree (organization_id);


--
-- Name: idx_post_event_proposal_id; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_post_event_proposal_id ON public.osas_post_event_reports USING btree (event_proposal_id);


--
-- Name: idx_post_event_status; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_post_event_status ON public.osas_post_event_reports USING btree (status);


--
-- Name: idx_rate_limit_hits_lookup; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_rate_limit_hits_lookup ON public.rate_limit_hits USING btree (endpoint_type, identifier, created_at DESC);


--
-- Name: idx_rate_limit_violations_lookup; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_rate_limit_violations_lookup ON public.rate_limit_violations USING btree (endpoint_type, identifier, lockout_until);


--
-- Name: idx_recognition_templates_lookup; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_recognition_templates_lookup ON public.recognition_templates USING btree (office_id, document_type_id, status);


--
-- Name: idx_scan_session_incoming_session_created; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_scan_session_incoming_session_created ON public.scan_session_incoming USING btree (session_id, created_at DESC);


--
-- Name: idx_scan_sessions_staff_created; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_scan_sessions_staff_created ON public.scan_sessions USING btree (staff_id, created_at DESC);


--
-- Name: idx_scan_sessions_token_hash; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_scan_sessions_token_hash ON public.scan_sessions USING btree (pair_token_hash);


--
-- Name: idx_staff_notification_state_updated_at; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_staff_notification_state_updated_at ON public.staff_notification_state USING btree (updated_at DESC);


--
-- Name: idx_staff_office_id; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_staff_office_id ON public.staff USING btree (office_id);


--
-- Name: idx_staff_recovery_codes_active; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_staff_recovery_codes_active ON public.staff_recovery_codes USING btree (staff_id, used_at);


--
-- Name: idx_student_accounts_identity_profile; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE UNIQUE INDEX idx_student_accounts_identity_profile ON public.student_accounts USING btree (identity_profile_id);


--
-- Name: idx_student_accounts_legacy_import_key; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE UNIQUE INDEX idx_student_accounts_legacy_import_key ON public.student_accounts USING btree (legacy_source, legacy_id) WHERE ((legacy_source IS NOT NULL) AND (legacy_id IS NOT NULL));


--
-- Name: idx_student_identity_profiles_email; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE UNIQUE INDEX idx_student_identity_profiles_email ON public.student_identity_profiles USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: idx_student_office_memberships_office_student; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_student_office_memberships_office_student ON public.student_office_memberships USING btree (office_id, student_no);


--
-- Name: idx_student_orgs_category; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_student_orgs_category ON public.student_organizations USING btree (category);


--
-- Name: idx_student_orgs_status; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_student_orgs_status ON public.student_organizations USING btree (status) WHERE (archived_at IS NULL);


--
-- Name: idx_students_identity_profile; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE UNIQUE INDEX idx_students_identity_profile ON public.students USING btree (identity_profile_id);


--
-- Name: idx_students_name; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_students_name ON public.students USING btree (name);


--
-- Name: idx_transaction_updates_proposal; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_transaction_updates_proposal ON public.transaction_updates USING btree (event_proposal_id, created_at);


--
-- Name: idx_transaction_updates_request; Type: INDEX; Schema: public; Owner: pupsj_rms
--

CREATE INDEX idx_transaction_updates_request ON public.transaction_updates USING btree (document_request_id, created_at);


--
-- Name: students students_identity_profile_insert; Type: TRIGGER; Schema: public; Owner: pupsj_rms
--

CREATE TRIGGER students_identity_profile_insert BEFORE INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION public.ensure_student_identity_profile();


--
-- Name: students students_identity_profile_update; Type: TRIGGER; Schema: public; Owner: pupsj_rms
--

CREATE TRIGGER students_identity_profile_update AFTER UPDATE OF name ON public.students FOR EACH ROW WHEN ((old.name IS DISTINCT FROM new.name)) EXECUTE FUNCTION public.sync_student_identity_profile();


--
-- Name: auth_refresh_tokens auth_refresh_tokens_session_jti_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.auth_refresh_tokens
    ADD CONSTRAINT auth_refresh_tokens_session_jti_fkey FOREIGN KEY (session_jti) REFERENCES public.auth_sessions(jti) ON DELETE CASCADE;


--
-- Name: backups backups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: backups backups_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id) ON DELETE CASCADE;


--
-- Name: chat_message_deletions chat_message_deletions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.chat_message_deletions
    ADD CONSTRAINT chat_message_deletions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;


--
-- Name: chat_message_deletions chat_message_deletions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.chat_message_deletions
    ADD CONSTRAINT chat_message_deletions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: courses courses_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id) ON DELETE CASCADE;


--
-- Name: document_request_attachments document_request_attachments_document_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_request_attachments
    ADD CONSTRAINT document_request_attachments_document_request_id_fkey FOREIGN KEY (document_request_id) REFERENCES public.document_requests(id) ON DELETE CASCADE;


--
-- Name: document_request_feedback document_request_feedback_document_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_request_feedback
    ADD CONSTRAINT document_request_feedback_document_request_id_fkey FOREIGN KEY (document_request_id) REFERENCES public.document_requests(id) ON DELETE CASCADE;


--
-- Name: document_request_feedback document_request_feedback_identity_profile_fk; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_request_feedback
    ADD CONSTRAINT document_request_feedback_identity_profile_fk FOREIGN KEY (identity_profile_id) REFERENCES public.student_identity_profiles(id) ON DELETE SET NULL;


--
-- Name: document_request_feedback document_request_feedback_student_no_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_request_feedback
    ADD CONSTRAINT document_request_feedback_student_no_fkey FOREIGN KEY (student_no) REFERENCES public.students(student_no) ON DELETE SET NULL;


--
-- Name: document_requests document_requests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: document_requests document_requests_identity_profile_fk; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_identity_profile_fk FOREIGN KEY (identity_profile_id) REFERENCES public.student_identity_profiles(id) ON DELETE SET NULL;


--
-- Name: document_requests document_requests_linked_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_linked_document_id_fkey FOREIGN KEY (linked_document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: document_requests document_requests_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id) ON DELETE RESTRICT;


--
-- Name: document_requests document_requests_student_no_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_student_no_fkey FOREIGN KEY (student_no) REFERENCES public.students(student_no) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: document_requests document_requests_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: document_types document_types_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id) ON DELETE CASCADE;


--
-- Name: documents documents_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id) ON DELETE RESTRICT;


--
-- Name: documents documents_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.student_organizations(id) ON DELETE SET NULL;


--
-- Name: documents documents_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: documents documents_source_ingest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_source_ingest_id_fkey FOREIGN KEY (source_ingest_id) REFERENCES public.ingest_queue(id) ON DELETE SET NULL;


--
-- Name: documents documents_student_no_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_student_no_fkey FOREIGN KEY (student_no) REFERENCES public.students(student_no) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: event_proposals event_proposals_identity_profile_fk; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.event_proposals
    ADD CONSTRAINT event_proposals_identity_profile_fk FOREIGN KEY (identity_profile_id) REFERENCES public.student_identity_profiles(id) ON DELETE SET NULL;


--
-- Name: event_proposals event_proposals_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.event_proposals
    ADD CONSTRAINT event_proposals_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id) ON DELETE RESTRICT;


--
-- Name: event_proposals event_proposals_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.event_proposals
    ADD CONSTRAINT event_proposals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.student_organizations(id) ON DELETE SET NULL;


--
-- Name: event_proposals event_proposals_post_event_cleared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.event_proposals
    ADD CONSTRAINT event_proposals_post_event_cleared_by_fkey FOREIGN KEY (post_event_cleared_by) REFERENCES public.staff(id);


--
-- Name: event_proposals event_proposals_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.event_proposals
    ADD CONSTRAINT event_proposals_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: event_proposals event_proposals_student_no_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.event_proposals
    ADD CONSTRAINT event_proposals_student_no_fkey FOREIGN KEY (student_no) REFERENCES public.students(student_no) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: global_audit_logs global_audit_logs_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.global_audit_logs
    ADD CONSTRAINT global_audit_logs_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id) ON DELETE SET NULL;


--
-- Name: ingest_queue ingest_queue_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.ingest_queue
    ADD CONSTRAINT ingest_queue_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id) ON DELETE SET NULL;


--
-- Name: ingest_queue ingest_queue_promoted_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.ingest_queue
    ADD CONSTRAINT ingest_queue_promoted_document_id_fkey FOREIGN KEY (promoted_document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: ingest_queue ingest_queue_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.ingest_queue
    ADD CONSTRAINT ingest_queue_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: office_modules office_modules_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.office_modules
    ADD CONSTRAINT office_modules_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: office_modules office_modules_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.office_modules
    ADD CONSTRAINT office_modules_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id) ON DELETE CASCADE;


--
-- Name: organization_bylaws_versions organization_bylaws_versions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.organization_bylaws_versions
    ADD CONSTRAINT organization_bylaws_versions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: organization_bylaws_versions organization_bylaws_versions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.organization_bylaws_versions
    ADD CONSTRAINT organization_bylaws_versions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.student_organizations(id) ON DELETE CASCADE;


--
-- Name: organization_officers organization_officers_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.organization_officers
    ADD CONSTRAINT organization_officers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.student_organizations(id) ON DELETE CASCADE;


--
-- Name: osas_post_event_reports osas_post_event_reports_event_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.osas_post_event_reports
    ADD CONSTRAINT osas_post_event_reports_event_proposal_id_fkey FOREIGN KEY (event_proposal_id) REFERENCES public.event_proposals(id) ON DELETE CASCADE;


--
-- Name: osas_post_event_reports osas_post_event_reports_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.osas_post_event_reports
    ADD CONSTRAINT osas_post_event_reports_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.student_organizations(id) ON DELETE RESTRICT;


--
-- Name: osas_post_event_reports osas_post_event_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.osas_post_event_reports
    ADD CONSTRAINT osas_post_event_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: password_reset_tokens password_reset_tokens_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: rate_limit_hits rate_limit_hits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.rate_limit_hits
    ADD CONSTRAINT rate_limit_hits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: rate_limit_violations rate_limit_violations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.rate_limit_violations
    ADD CONSTRAINT rate_limit_violations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: recognition_templates recognition_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.recognition_templates
    ADD CONSTRAINT recognition_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: recognition_templates recognition_templates_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.recognition_templates
    ADD CONSTRAINT recognition_templates_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id) ON DELETE CASCADE;


--
-- Name: recognition_templates recognition_templates_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.recognition_templates
    ADD CONSTRAINT recognition_templates_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id) ON DELETE CASCADE;


--
-- Name: recognition_templates recognition_templates_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.recognition_templates
    ADD CONSTRAINT recognition_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: scan_session_incoming scan_session_incoming_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.scan_session_incoming
    ADD CONSTRAINT scan_session_incoming_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.scan_sessions(id) ON DELETE CASCADE;


--
-- Name: scan_sessions scan_sessions_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.scan_sessions
    ADD CONSTRAINT scan_sessions_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: sections sections_office_id_course_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_office_id_course_code_fkey FOREIGN KEY (office_id, course_code) REFERENCES public.courses(office_id, code) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sections sections_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id) ON DELETE CASCADE;


--
-- Name: staff_notification_item_states staff_notification_item_states_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.staff_notification_item_states
    ADD CONSTRAINT staff_notification_item_states_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: staff_notification_item_states staff_notification_item_states_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.staff_notification_item_states
    ADD CONSTRAINT staff_notification_item_states_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: staff_notification_state staff_notification_state_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.staff_notification_state
    ADD CONSTRAINT staff_notification_state_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: staff staff_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id) ON DELETE SET NULL;


--
-- Name: staff_recovery_codes staff_recovery_codes_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.staff_recovery_codes
    ADD CONSTRAINT staff_recovery_codes_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: staff_security_answers staff_security_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.staff_security_answers
    ADD CONSTRAINT staff_security_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.security_questions(id) ON DELETE CASCADE;


--
-- Name: staff_security_answers staff_security_answers_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.staff_security_answers
    ADD CONSTRAINT staff_security_answers_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: student_accounts student_accounts_identity_profile_fk; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.student_accounts
    ADD CONSTRAINT student_accounts_identity_profile_fk FOREIGN KEY (identity_profile_id) REFERENCES public.student_identity_profiles(id) ON DELETE RESTRICT;


--
-- Name: student_accounts student_accounts_student_no_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.student_accounts
    ADD CONSTRAINT student_accounts_student_no_fkey FOREIGN KEY (student_no) REFERENCES public.students(student_no) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: student_office_memberships student_office_memberships_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.student_office_memberships
    ADD CONSTRAINT student_office_memberships_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.offices(id) ON DELETE CASCADE;


--
-- Name: student_office_memberships student_office_memberships_student_no_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.student_office_memberships
    ADD CONSTRAINT student_office_memberships_student_no_fkey FOREIGN KEY (student_no) REFERENCES public.students(student_no) ON DELETE CASCADE;


--
-- Name: student_security_answers student_security_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.student_security_answers
    ADD CONSTRAINT student_security_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.security_questions(id) ON DELETE CASCADE;


--
-- Name: student_security_answers student_security_answers_student_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.student_security_answers
    ADD CONSTRAINT student_security_answers_student_account_id_fkey FOREIGN KEY (student_account_id) REFERENCES public.student_accounts(id) ON DELETE CASCADE;


--
-- Name: students students_identity_profile_fk; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_identity_profile_fk FOREIGN KEY (identity_profile_id) REFERENCES public.student_identity_profiles(id) ON DELETE RESTRICT;


--
-- Name: transaction_updates transaction_updates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.transaction_updates
    ADD CONSTRAINT transaction_updates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: transaction_updates transaction_updates_document_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.transaction_updates
    ADD CONSTRAINT transaction_updates_document_request_id_fkey FOREIGN KEY (document_request_id) REFERENCES public.document_requests(id) ON DELETE CASCADE;


--
-- Name: transaction_updates transaction_updates_event_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pupsj_rms
--

ALTER TABLE ONLY public.transaction_updates
    ADD CONSTRAINT transaction_updates_event_proposal_id_fkey FOREIGN KEY (event_proposal_id) REFERENCES public.event_proposals(id) ON DELETE CASCADE;


--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: pupsj_rms
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: documents staff_office_documents; Type: POLICY; Schema: public; Owner: pupsj_rms
--

CREATE POLICY staff_office_documents ON public.documents FOR SELECT USING (((office_id = current_setting('app.current_office_id'::text, true)) OR (current_setting('app.current_role'::text, true) = 'Admin'::text)));


--
-- Name: students staff_read_students; Type: POLICY; Schema: public; Owner: pupsj_rms
--

CREATE POLICY staff_read_students ON public.students FOR SELECT USING ((current_setting('app.current_role'::text, true) = ANY (ARRAY['Staff'::text, 'Admin'::text])));


--
-- Name: documents student_document_read; Type: POLICY; Schema: public; Owner: pupsj_rms
--

CREATE POLICY student_document_read ON public.documents FOR SELECT USING ((student_no = current_setting('app.current_user_id'::text, true)));


--
-- Name: students student_self_read; Type: POLICY; Schema: public; Owner: pupsj_rms
--

CREATE POLICY student_self_read ON public.students FOR SELECT USING ((student_no = current_setting('app.current_user_id'::text, true)));


--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: pupsj_rms
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: documents system_admin_override_documents; Type: POLICY; Schema: public; Owner: pupsj_rms
--

CREATE POLICY system_admin_override_documents ON public.documents USING (((current_setting('app.current_role'::text, true) = 'SystemAdmin'::text) OR (current_setting('app.current_role'::text, true) IS NULL)));


--
-- Name: students system_admin_override_students; Type: POLICY; Schema: public; Owner: pupsj_rms
--

CREATE POLICY system_admin_override_students ON public.students USING (((current_setting('app.current_role'::text, true) = 'SystemAdmin'::text) OR (current_setting('app.current_role'::text, true) IS NULL)));


--
-- PostgreSQL database dump complete
--

\unrestrict 42Fw2vD5L3on1DNwvQ5HwWqxqisz8KMYTkakk6MQG6JM5rJOu1NFHdMf1IIf4zL

