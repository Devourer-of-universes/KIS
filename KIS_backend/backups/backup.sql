--
-- PostgreSQL database dump
--

\restrict flAYtkQTB7XGjmZMXod2wYhygySweZOFTzmyrDbX1qrytQQSllskR6hpFBlV9Ed

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id integer,
    old_data jsonb,
    new_data jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_logs OWNER TO messenger_user;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO messenger_user;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: backups; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.backups (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    filepath character varying(500) NOT NULL,
    size_bytes bigint,
    type character varying(20) DEFAULT 'full'::character varying,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'completed'::character varying
);


ALTER TABLE public.backups OWNER TO messenger_user;

--
-- Name: backups_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.backups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.backups_id_seq OWNER TO messenger_user;

--
-- Name: backups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.backups_id_seq OWNED BY public.backups.id;


--
-- Name: chat_folder_items; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.chat_folder_items (
    folder_id integer NOT NULL,
    chat_id integer NOT NULL,
    added_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.chat_folder_items OWNER TO messenger_user;

--
-- Name: chat_folders; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.chat_folders (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.chat_folders OWNER TO messenger_user;

--
-- Name: chat_folders_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.chat_folders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_folders_id_seq OWNER TO messenger_user;

--
-- Name: chat_folders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.chat_folders_id_seq OWNED BY public.chat_folders.id;


--
-- Name: chat_participants; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.chat_participants (
    chat_id integer NOT NULL,
    user_id integer NOT NULL,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_read_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_muted boolean DEFAULT false
);


ALTER TABLE public.chat_participants OWNER TO messenger_user;

--
-- Name: TABLE chat_participants; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.chat_participants IS 'РЈС‡Р°СЃС‚РЅРёРєРё С‡Р°С‚РѕРІ';


--
-- Name: COLUMN chat_participants.last_read_at; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON COLUMN public.chat_participants.last_read_at IS 'Р’СЂРµРјСЏ РїРѕСЃР»РµРґРЅРµРіРѕ РїСЂРѕС‡С‚РµРЅРёСЏ СЃРѕРѕР±С‰РµРЅРёР№ РІ СЌС‚РѕРј С‡Р°С‚Рµ';


--
-- Name: COLUMN chat_participants.is_muted; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON COLUMN public.chat_participants.is_muted IS 'РћС‚РєР»СЋС‡РµРЅС‹ Р»Рё СѓРІРµРґРѕРјР»РµРЅРёСЏ РґР»СЏ СЌС‚РѕРіРѕ С‡Р°С‚Р°';


--
-- Name: chats; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.chats (
    id integer NOT NULL,
    name character varying(100),
    is_group boolean DEFAULT false,
    avatar_uri character varying(500),
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_message_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.chats OWNER TO messenger_user;

--
-- Name: TABLE chats; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.chats IS 'Р§Р°С‚С‹ (Р»РёС‡РЅС‹Рµ Рё РіСЂСѓРїРїРѕРІС‹Рµ)';


--
-- Name: COLUMN chats.is_group; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON COLUMN public.chats.is_group IS 'true - РіСЂСѓРїРїРѕРІРѕР№ С‡Р°С‚, false - Р»РёС‡РЅС‹Р№ РґРёР°Р»РѕРі';


--
-- Name: chats_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.chats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chats_id_seq OWNER TO messenger_user;

--
-- Name: chats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.chats_id_seq OWNED BY public.chats.id;


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.contacts (
    user_id integer NOT NULL,
    contact_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.contacts OWNER TO messenger_user;

--
-- Name: counterparties; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.counterparties (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    full_name character varying(500),
    inn character varying(12),
    kpp character varying(9),
    ogrn character varying(15),
    address text,
    postal_address text,
    phone character varying(50),
    email character varying(100),
    contact_person character varying(200),
    contact_position character varying(150),
    is_active boolean DEFAULT true,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


ALTER TABLE public.counterparties OWNER TO messenger_user;

--
-- Name: TABLE counterparties; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.counterparties IS 'РЎРїСЂР°РІРѕС‡РЅРёРє РєРѕРЅС‚СЂР°РіРµРЅС‚РѕРІ (РіР»РѕР±Р°Р»СЊРЅС‹Р№)';


--
-- Name: counterparties_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.counterparties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.counterparties_id_seq OWNER TO messenger_user;

--
-- Name: counterparties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.counterparties_id_seq OWNED BY public.counterparties.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    parent_department_id integer,
    manager_id integer,
    code character varying(50),
    manager_position character varying(100),
    description text,
    email character varying(100),
    phone character varying(20),
    location character varying(200),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.departments OWNER TO messenger_user;

--
-- Name: TABLE departments; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.departments IS 'РџРѕРґСЂР°Р·РґРµР»РµРЅРёСЏ РѕСЂРіР°РЅРёР·Р°С†РёРё';


--
-- Name: COLUMN departments.parent_department_id; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON COLUMN public.departments.parent_department_id IS 'РЎСЃС‹Р»РєР° РЅР° СЂРѕРґРёС‚РµР»СЊСЃРєРѕРµ РїРѕРґСЂР°Р·РґРµР»РµРЅРёРµ (РґР»СЏ РёРµСЂР°СЂС…РёРё)';


--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departments_id_seq OWNER TO messenger_user;

--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: document_access; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.document_access (
    id integer NOT NULL,
    document_id integer NOT NULL,
    user_id integer,
    department_id integer,
    access_level character varying(20) DEFAULT 'view'::character varying,
    granted_by integer,
    granted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT document_access_check CHECK ((((user_id IS NOT NULL) AND (department_id IS NULL)) OR ((user_id IS NULL) AND (department_id IS NOT NULL))))
);


ALTER TABLE public.document_access OWNER TO messenger_user;

--
-- Name: TABLE document_access; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.document_access IS 'РџСЂР°РІР° РґРѕСЃС‚СѓРїР° Рє РєРѕРЅРєСЂРµС‚РЅС‹Рј РґРѕРєСѓРјРµРЅС‚Р°Рј';


--
-- Name: document_access_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.document_access_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_access_id_seq OWNER TO messenger_user;

--
-- Name: document_access_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.document_access_id_seq OWNED BY public.document_access.id;


--
-- Name: document_attachments; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.document_attachments (
    id integer NOT NULL,
    document_id integer NOT NULL,
    file_uri character varying(500) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_size integer,
    file_type character varying(50),
    mime_type character varying(100),
    uploaded_by integer,
    uploaded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.document_attachments OWNER TO messenger_user;

--
-- Name: TABLE document_attachments; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.document_attachments IS 'Р’Р»РѕР¶РµРЅРёСЏ РґРѕРєСѓРјРµРЅС‚РѕРІ (РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Рµ С„Р°Р№Р»С‹)';


--
-- Name: document_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.document_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_attachments_id_seq OWNER TO messenger_user;

--
-- Name: document_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.document_attachments_id_seq OWNED BY public.document_attachments.id;


--
-- Name: document_numbering_counters; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.document_numbering_counters (
    id integer NOT NULL,
    document_type_id integer NOT NULL,
    period_key character varying(20) NOT NULL,
    last_number integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.document_numbering_counters OWNER TO messenger_user;

--
-- Name: TABLE document_numbering_counters; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.document_numbering_counters IS 'РЎС‡С‘С‚С‡РёРєРё РЅСѓРјРµСЂР°С†РёРё РґРѕРєСѓРјРµРЅС‚РѕРІ РїРѕ С‚РёРїР°Рј Рё РїРµСЂРёРѕРґР°Рј';


--
-- Name: document_numbering_counters_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.document_numbering_counters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_numbering_counters_id_seq OWNER TO messenger_user;

--
-- Name: document_numbering_counters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.document_numbering_counters_id_seq OWNED BY public.document_numbering_counters.id;


--
-- Name: document_routes; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.document_routes (
    id integer NOT NULL,
    document_id integer NOT NULL,
    workflow_template_id integer,
    route_data jsonb DEFAULT '{"steps": [], "auto_start": true, "allow_parallel": false}'::jsonb NOT NULL,
    is_started boolean DEFAULT false,
    started_at timestamp with time zone,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.document_routes OWNER TO messenger_user;

--
-- Name: TABLE document_routes; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.document_routes IS 'РњР°СЂС€СЂСѓС‚С‹ СЃРѕРіР»Р°СЃРѕРІР°РЅРёСЏ РєРѕРЅРєСЂРµС‚РЅС‹С… РґРѕРєСѓРјРµРЅС‚РѕРІ';


--
-- Name: COLUMN document_routes.route_data; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON COLUMN public.document_routes.route_data IS 'РЎР»РµРїРѕРє: { "steps": [{ id, order, type, user_id, role, status, comment, completed_at }], ... }';


--
-- Name: document_routes_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.document_routes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_routes_id_seq OWNER TO messenger_user;

--
-- Name: document_routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.document_routes_id_seq OWNED BY public.document_routes.id;


--
-- Name: document_signatures; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.document_signatures (
    id integer NOT NULL,
    document_id integer NOT NULL,
    version_id integer,
    user_id integer NOT NULL,
    signature_type character varying(20) DEFAULT 'simple'::character varying,
    signed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address inet,
    user_agent text,
    certificate_serial character varying(100),
    signature_hash text,
    file_hash character varying(128)
);


ALTER TABLE public.document_signatures OWNER TO messenger_user;

--
-- Name: TABLE document_signatures; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.document_signatures IS 'РџРѕРґРїРёСЃРё РґРѕРєСѓРјРµРЅС‚РѕРІ (Р·Р°РіР»СѓС€РєР° Р­Р¦Рџ)';


--
-- Name: document_signatures_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.document_signatures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_signatures_id_seq OWNER TO messenger_user;

--
-- Name: document_signatures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.document_signatures_id_seq OWNED BY public.document_signatures.id;


--
-- Name: document_templates; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.document_templates (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    document_type_id integer NOT NULL,
    template_file_uri character varying(500),
    template_file_name character varying(255),
    template_file_size integer,
    template_data jsonb DEFAULT '{"fields": [], "settings": {}, "placeholders": {}}'::jsonb NOT NULL,
    default_workflow_template_id integer,
    access_mode character varying(20) DEFAULT 'all'::character varying,
    access_user_ids integer[],
    access_department_ids integer[],
    access_role_ids integer[],
    usage_count integer DEFAULT 0,
    version integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_by integer,
    department_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


ALTER TABLE public.document_templates OWNER TO messenger_user;

--
-- Name: TABLE document_templates; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.document_templates IS 'РЁР°Р±Р»РѕРЅС‹ РґРѕРєСѓРјРµРЅС‚РѕРІ СЃ РѕРїРёСЃР°РЅРёРµРј РїРѕР»РµР№ Рё .docx-С„Р°Р№Р»РѕРј';


--
-- Name: COLUMN document_templates.template_data; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON COLUMN public.document_templates.template_data IS 'РЎС‚СЂСѓРєС‚СѓСЂР°: { "fields": [...], "placeholders": {...}, "settings": {...} }';


--
-- Name: document_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.document_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_templates_id_seq OWNER TO messenger_user;

--
-- Name: document_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.document_templates_id_seq OWNED BY public.document_templates.id;


--
-- Name: document_types; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.document_types (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    icon character varying(100),
    numbering_enabled boolean DEFAULT true,
    numbering_pattern character varying(200) DEFAULT 'в„–{N:4}/{YYYY:4}'::character varying,
    numbering_reset_period character varying(20) DEFAULT 'year'::character varying,
    numbering_next integer DEFAULT 1,
    numbering_separator character varying(10) DEFAULT ''::character varying,
    default_workflow_template_id integer,
    default_document_template_id integer,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.document_types OWNER TO messenger_user;

--
-- Name: TABLE document_types; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.document_types IS 'РўРёРїС‹ РґРѕРєСѓРјРµРЅС‚РѕРІ (РїСЂРёРєР°Р·, РґРѕРіРѕРІРѕСЂ, РѕС‚С‡С‘С‚ Рё С‚.Рґ.)';


--
-- Name: COLUMN document_types.numbering_pattern; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON COLUMN public.document_types.numbering_pattern IS 'РЁР°Р±Р»РѕРЅ РЅРѕРјРµСЂР°. РџРµСЂРµРјРµРЅРЅС‹Рµ: {N:5}, {YYYY:4}, {YY:2}, {MM:2}, {DD:2}, {TYPE}';


--
-- Name: COLUMN document_types.numbering_reset_period; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON COLUMN public.document_types.numbering_reset_period IS 'РЎР±СЂРѕСЃ СЃС‡С‘С‚С‡РёРєР°: year, month, never';


--
-- Name: document_types_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.document_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_types_id_seq OWNER TO messenger_user;

--
-- Name: document_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.document_types_id_seq OWNED BY public.document_types.id;


--
-- Name: document_versions; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.document_versions (
    id integer NOT NULL,
    document_id integer NOT NULL,
    version_number integer NOT NULL,
    field_values jsonb,
    file_uri character varying(500),
    file_name character varying(255),
    comment text,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.document_versions OWNER TO messenger_user;

--
-- Name: document_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.document_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_versions_id_seq OWNER TO messenger_user;

--
-- Name: document_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.document_versions_id_seq OWNED BY public.document_versions.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    document_type_id integer NOT NULL,
    template_id integer,
    reg_number character varying(100),
    reg_date date,
    registered_by integer,
    field_values jsonb DEFAULT '{}'::jsonb,
    generated_file_uri character varying(500),
    generated_file_name character varying(255),
    generated_at timestamp with time zone,
    current_version integer DEFAULT 1,
    status character varying(30) DEFAULT 'draft'::character varying,
    priority character varying(20) DEFAULT 'normal'::character varying,
    created_by integer NOT NULL,
    department_id integer,
    workflow_instance_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


ALTER TABLE public.documents OWNER TO messenger_user;

--
-- Name: TABLE documents; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.documents IS 'Р”РѕРєСѓРјРµРЅС‚С‹ СЃРёСЃС‚РµРјС‹';


--
-- Name: COLUMN documents.field_values; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON COLUMN public.documents.field_values IS 'Р—РЅР°С‡РµРЅРёСЏ РїРѕР»РµР№ РґРѕРєСѓРјРµРЅС‚Р°: { "field_key": value }';


--
-- Name: COLUMN documents.status; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON COLUMN public.documents.status IS 'draft, on_approval, revision, approved, signed, registered, archived, cancelled';


--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO messenger_user;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: message_attachments; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.message_attachments (
    id integer NOT NULL,
    message_id integer NOT NULL,
    file_uri character varying(500) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_size integer,
    file_type character varying(50),
    mime_type character varying(100),
    uploaded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.message_attachments OWNER TO messenger_user;

--
-- Name: TABLE message_attachments; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.message_attachments IS 'Р¤Р°Р№Р»С‹, РїСЂРёРєСЂРµРїР»РµРЅРЅС‹Рµ Рє СЃРѕРѕР±С‰РµРЅРёСЏРј';


--
-- Name: COLUMN message_attachments.file_type; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON COLUMN public.message_attachments.file_type IS 'РўРёРї: image, document, video, audio';


--
-- Name: message_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.message_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.message_attachments_id_seq OWNER TO messenger_user;

--
-- Name: message_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.message_attachments_id_seq OWNED BY public.message_attachments.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    chat_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    is_edited boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    is_read boolean DEFAULT false,
    is_delivered boolean DEFAULT false,
    readers jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.messages OWNER TO messenger_user;

--
-- Name: TABLE messages; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.messages IS 'РЎРѕРѕР±С‰РµРЅРёСЏ РІ С‡Р°С‚Р°С…';


--
-- Name: COLUMN messages.is_edited; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON COLUMN public.messages.is_edited IS 'Р‘С‹Р»Рѕ Р»Рё РѕС‚СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРѕ';


--
-- Name: COLUMN messages.is_deleted; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON COLUMN public.messages.is_deleted IS 'РЈРґР°Р»РµРЅРѕ (soft delete)';


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO messenger_user;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    department_id integer,
    type character varying(20) DEFAULT 'personal'::character varying NOT NULL,
    title character varying(200),
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


ALTER TABLE public.notes OWNER TO postgres;

--
-- Name: notes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notes_id_seq OWNER TO postgres;

--
-- Name: notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notes_id_seq OWNED BY public.notes.id;


--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_settings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    setting_key character varying(50) NOT NULL,
    setting_value boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notification_settings OWNER TO postgres;

--
-- Name: notification_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_settings_id_seq OWNER TO postgres;

--
-- Name: notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_settings_id_seq OWNED BY public.notification_settings.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text,
    data jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    category character varying(50) DEFAULT 'system'::character varying,
    priority character varying(20) DEFAULT 'normal'::character varying,
    link_url character varying(500),
    link_type character varying(50),
    link_id integer,
    expires_at timestamp with time zone,
    sender_id integer,
    is_global boolean DEFAULT false
);


ALTER TABLE public.notifications OWNER TO messenger_user;

--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.notifications IS 'РЈРІРµРґРѕРјР»РµРЅРёСЏ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№';


--
-- Name: COLUMN notifications.data; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON COLUMN public.notifications.data IS 'Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Рµ РґР°РЅРЅС‹Рµ РІ JSON (chat_id, message_id, Рё С‚.Рґ.)';


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO messenger_user;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    department_id integer,
    name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.posts OWNER TO messenger_user;

--
-- Name: TABLE posts; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.posts IS 'Р”РѕР»Р¶РЅРѕСЃС‚Рё СЃРѕС‚СЂСѓРґРЅРёРєРѕРІ';


--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posts_id_seq OWNER TO messenger_user;

--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO messenger_user;

--
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.roles IS 'Р РѕР»Рё РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ СЃ РїСЂР°РІР°РјРё РґРѕСЃС‚СѓРїР°';


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO messenger_user;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(500) NOT NULL,
    device character varying(100),
    application character varying(100),
    location character varying(100),
    ip_address inet,
    user_agent text,
    is_current boolean DEFAULT true,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_activity timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true
);


ALTER TABLE public.sessions OWNER TO messenger_user;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.sessions IS 'РђРєС‚РёРІРЅС‹Рµ СЃРµСЃСЃРёРё РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№';


--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_id_seq OWNER TO messenger_user;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text,
    setting_type character varying(20) DEFAULT 'string'::character varying,
    description text,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer
);


ALTER TABLE public.system_settings OWNER TO messenger_user;

--
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_settings_id_seq OWNER TO messenger_user;

--
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: task_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_comments (
    id integer NOT NULL,
    task_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone
);


ALTER TABLE public.task_comments OWNER TO postgres;

--
-- Name: task_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.task_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_comments_id_seq OWNER TO postgres;

--
-- Name: task_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.task_comments_id_seq OWNED BY public.task_comments.id;


--
-- Name: task_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_templates (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    type character varying(50) DEFAULT 'custom'::character varying,
    template_data jsonb NOT NULL,
    user_id integer,
    department_id integer,
    is_shared boolean DEFAULT false,
    usage_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.task_templates OWNER TO postgres;

--
-- Name: task_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.task_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_templates_id_seq OWNER TO postgres;

--
-- Name: task_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.task_templates_id_seq OWNED BY public.task_templates.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'pending'::character varying,
    priority character varying(20) DEFAULT 'medium'::character varying,
    created_by integer NOT NULL,
    assigned_to integer,
    department_id integer,
    start_date date,
    due_date date,
    completed_at timestamp with time zone,
    progress integer DEFAULT 0,
    tags text[],
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    template_id integer
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tasks_id_seq OWNER TO postgres;

--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    surname character varying(50) NOT NULL,
    name character varying(50) NOT NULL,
    patronymic character varying(50),
    birthday date,
    post_id integer,
    department_id integer,
    email character varying(100) NOT NULL,
    tel_num character varying(20) NOT NULL,
    password_hash character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    role_id integer NOT NULL,
    avatar_uri character varying(500),
    last_seen_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    settings jsonb DEFAULT '{}'::jsonb,
    start_date date,
    deleted_at timestamp with time zone,
    is_super_admin boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO messenger_user;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON TABLE public.users IS 'РџРѕР»СЊР·РѕРІР°С‚РµР»Рё СЃРёСЃС‚РµРјС‹';


--
-- Name: COLUMN users.status; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON COLUMN public.users.status IS 'РЎС‚Р°С‚СѓСЃ: active - Р°РєС‚РёРІРµРЅ, inactive - РЅРµР°РєС‚РёРІРµРЅ, blocked - Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ';


--
-- Name: COLUMN users.last_seen_at; Type: COMMENT; Schema: public; Owner: messenger_user
--

COMMENT ON COLUMN public.users.last_seen_at IS 'Р’СЂРµРјСЏ РїРѕСЃР»РµРґРЅРµР№ Р°РєС‚РёРІРЅРѕСЃС‚Рё (РґР»СЏ РѕРїСЂРµРґРµР»РµРЅРёСЏ РѕРЅР»Р°Р№РЅ)';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO messenger_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: workflow_instances; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.workflow_instances (
    id integer NOT NULL,
    template_id integer,
    started_by integer,
    status character varying(50) DEFAULT 'active'::character varying,
    current_step_index integer DEFAULT 0,
    data jsonb DEFAULT '{}'::jsonb,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone
);


ALTER TABLE public.workflow_instances OWNER TO messenger_user;

--
-- Name: workflow_instances_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.workflow_instances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.workflow_instances_id_seq OWNER TO messenger_user;

--
-- Name: workflow_instances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.workflow_instances_id_seq OWNED BY public.workflow_instances.id;


--
-- Name: workflow_templates; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.workflow_templates (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_by integer,
    usage_count integer DEFAULT 0,
    version integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


ALTER TABLE public.workflow_templates OWNER TO messenger_user;

--
-- Name: workflow_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: messenger_user
--

CREATE SEQUENCE public.workflow_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.workflow_templates_id_seq OWNER TO messenger_user;

--
-- Name: workflow_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: messenger_user
--

ALTER SEQUENCE public.workflow_templates_id_seq OWNED BY public.workflow_templates.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: backups id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.backups ALTER COLUMN id SET DEFAULT nextval('public.backups_id_seq'::regclass);


--
-- Name: chat_folders id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.chat_folders ALTER COLUMN id SET DEFAULT nextval('public.chat_folders_id_seq'::regclass);


--
-- Name: chats id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.chats ALTER COLUMN id SET DEFAULT nextval('public.chats_id_seq'::regclass);


--
-- Name: counterparties id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.counterparties ALTER COLUMN id SET DEFAULT nextval('public.counterparties_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: document_access id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_access ALTER COLUMN id SET DEFAULT nextval('public.document_access_id_seq'::regclass);


--
-- Name: document_attachments id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_attachments ALTER COLUMN id SET DEFAULT nextval('public.document_attachments_id_seq'::regclass);


--
-- Name: document_numbering_counters id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_numbering_counters ALTER COLUMN id SET DEFAULT nextval('public.document_numbering_counters_id_seq'::regclass);


--
-- Name: document_routes id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_routes ALTER COLUMN id SET DEFAULT nextval('public.document_routes_id_seq'::regclass);


--
-- Name: document_signatures id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_signatures ALTER COLUMN id SET DEFAULT nextval('public.document_signatures_id_seq'::regclass);


--
-- Name: document_templates id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_templates ALTER COLUMN id SET DEFAULT nextval('public.document_templates_id_seq'::regclass);


--
-- Name: document_types id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_types ALTER COLUMN id SET DEFAULT nextval('public.document_types_id_seq'::regclass);


--
-- Name: document_versions id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_versions ALTER COLUMN id SET DEFAULT nextval('public.document_versions_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: message_attachments id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.message_attachments ALTER COLUMN id SET DEFAULT nextval('public.message_attachments_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: notes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notes ALTER COLUMN id SET DEFAULT nextval('public.notes_id_seq'::regclass);


--
-- Name: notification_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_settings ALTER COLUMN id SET DEFAULT nextval('public.notification_settings_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Name: task_comments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_comments ALTER COLUMN id SET DEFAULT nextval('public.task_comments_id_seq'::regclass);


--
-- Name: task_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_templates ALTER COLUMN id SET DEFAULT nextval('public.task_templates_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: workflow_instances id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.workflow_instances ALTER COLUMN id SET DEFAULT nextval('public.workflow_instances_id_seq'::regclass);


--
-- Name: workflow_templates id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.workflow_templates ALTER COLUMN id SET DEFAULT nextval('public.workflow_templates_id_seq'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.audit_logs (id, user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent, created_at) FROM stdin;
2	13	UPDATE settings	system	\N	\N	{"org_name": "ООО Тест", "log_level": "error", "org_email": "info@company.ru", "org_phone": "+7 (495) 000-00-00", "enable_2fa": false, "backup_time": "02:00", "notify_email": "admin@company.ru", "storage_path": "./uploads", "max_file_size": 50, "auto_numbering": "auto", "backup_schedule": "disabled", "session_timeout": 8, "auto_archive_days": 365, "notify_suspicious": true, "allowed_file_types": [], "log_retention_days": 90, "password_min_length": 6, "backup_retention_days": 30, "notify_critical_errors": true, "password_require_special": false}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-24 13:52:18.562093+07
3	13	UPDATE settings	system	\N	\N	{"org_name": "ООО Тест", "log_level": "error", "org_email": "info@company.ru", "org_phone": "+7 (495) 000-00-00", "enable_2fa": false, "backup_time": "02:00", "notify_email": "admin@company.ru", "storage_path": "./uploads", "max_file_size": 50, "auto_numbering": "auto", "backup_schedule": "disabled", "session_timeout": 8, "auto_archive_days": 365, "notify_suspicious": true, "allowed_file_types": [], "log_retention_days": 90, "password_min_length": 6, "backup_retention_days": 30, "notify_critical_errors": true, "password_require_special": false}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-24 13:52:24.956885+07
4	13	UPDATE settings	system	\N	\N	{"org_name": "", "log_level": "error", "org_email": "info@company.ru", "org_phone": "+7 (495) 000-00-00", "enable_2fa": false, "backup_time": "02:00", "notify_email": "admin@company.ru", "storage_path": "./uploads", "max_file_size": 50, "auto_numbering": "auto", "backup_schedule": "disabled", "session_timeout": 11, "auto_archive_days": 365, "notify_suspicious": true, "allowed_file_types": [], "log_retention_days": 90, "password_min_length": 6, "backup_retention_days": 30, "notify_critical_errors": true, "password_require_special": false}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-24 13:52:31.967709+07
5	13	UPDATE settings	system	\N	\N	{"org_name": "ООО Тест", "log_level": "info", "org_email": "info@company.ru", "org_phone": "+7 (495) 000-00-00", "enable_2fa": false, "backup_time": "02:00", "notify_email": "admin@company.ru", "storage_path": "./uploads", "max_file_size": 50, "auto_numbering": "auto", "backup_schedule": "daily", "session_timeout": 8, "auto_archive_days": 365, "notify_suspicious": true, "allowed_file_types": [], "log_retention_days": 90, "password_min_length": 6, "backup_retention_days": 30, "notify_critical_errors": true, "password_require_special": false}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-25 10:22:31.996186+07
6	13	UPDATE settings	system	\N	\N	{"org_name": "ООО Тест", "log_level": "info", "org_email": "info@company.ru", "org_phone": "+7 (495) 000-00-00", "enable_2fa": false, "backup_time": "02:00", "notify_email": "admin@company.ru", "storage_path": "./uploads", "max_file_size": 50, "auto_numbering": "auto", "backup_schedule": "daily", "session_timeout": 8, "auto_archive_days": 365, "notify_suspicious": true, "allowed_file_types": [], "log_retention_days": 90, "password_min_length": 6, "backup_retention_days": 30, "notify_critical_errors": true, "password_require_special": true}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-25 10:32:42.092949+07
7	12	SEND notification	notification	\N	\N	{"count": 2, "title": "n", "category": "admin"}	::1	\N	2026-09-16 19:48:30.860901+07
\.


--
-- Data for Name: backups; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.backups (id, filename, filepath, size_bytes, type, created_by, created_at, status) FROM stdin;
2	backup_2026-05-22T13-55-14.sql	D:\\Учёба\\КИС\\KIS_backend\\backups\\backup_2026-05-22T13-55-14.sql	44671	full	12	2026-05-22 20:55:17.410076+07	completed
\.


--
-- Data for Name: chat_folder_items; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.chat_folder_items (folder_id, chat_id, added_at) FROM stdin;
\.


--
-- Data for Name: chat_folders; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.chat_folders (id, user_id, name, created_at, updated_at) FROM stdin;
10	12	123	2026-07-29 09:40:59.241071+07	2026-07-29 09:40:59.241071+07
11	12	dz	2026-09-07 15:27:54.471041+07	2026-09-07 15:27:54.471041+07
\.


--
-- Data for Name: chat_participants; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.chat_participants (chat_id, user_id, joined_at, last_read_at, is_muted) FROM stdin;
5	13	2026-05-29 18:44:06.32491+07	2026-05-31 20:30:54.195711+07	f
5	12	2026-05-29 18:44:06.32491+07	2026-10-17 16:58:59.748521+07	f
\.


--
-- Data for Name: chats; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.chats (id, name, is_group, avatar_uri, created_by, created_at, last_message_at) FROM stdin;
5	\N	f	\N	12	2026-05-29 18:44:06.319713+07	2026-09-07 15:36:55.061+07
\.


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.contacts (user_id, contact_id, created_at) FROM stdin;
\.


--
-- Data for Name: counterparties; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.counterparties (id, name, full_name, inn, kpp, ogrn, address, postal_address, phone, email, contact_person, contact_position, is_active, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.departments (id, name, parent_department_id, manager_id, code, manager_position, description, email, phone, location, created_at) FROM stdin;
7	ООО Тест	\N	12		Начальник ИТ-отдела 					2026-05-22 17:59:40.128558+07
\.


--
-- Data for Name: document_access; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.document_access (id, document_id, user_id, department_id, access_level, granted_by, granted_at) FROM stdin;
\.


--
-- Data for Name: document_attachments; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.document_attachments (id, document_id, file_uri, file_name, file_size, file_type, mime_type, uploaded_by, uploaded_at) FROM stdin;
\.


--
-- Data for Name: document_numbering_counters; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.document_numbering_counters (id, document_type_id, period_key, last_number, updated_at) FROM stdin;
1	37	2026	1	2026-10-25 17:59:48.430698+07
\.


--
-- Data for Name: document_routes; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.document_routes (id, document_id, workflow_template_id, route_data, is_started, started_at, created_by, created_at, updated_at) FROM stdin;
1	1	1	{"steps": [{"id": "fcec4f41-a9d7-4fb8-adab-c1b5dd7fb0f9", "role": "Согласование руководителем", "type": "approval", "order": 1, "status": "approved", "comment": "Согласовано из консоли", "user_id": 12, "unresolved": false, "completed_at": "2026-10-22T08:06:41.689Z", "assignee_type": "department_manager", "assignee_post_id": null, "assignee_role_id": null, "assignee_user_id": null, "assignee_department_id": null}, {"id": "9c58e4fa-612c-42c1-9acf-f4688fa38be9", "role": "Проверка юристом", "type": "approval", "order": 2, "status": "pending", "comment": null, "user_id": 12, "unresolved": false, "completed_at": null, "assignee_type": "post", "assignee_post_id": 11, "assignee_role_id": null, "assignee_user_id": null, "assignee_department_id": null}, {"id": "bbc3c6ae-5d80-46b7-8d4e-5e7b3fa6aebb", "role": "Подпись директора", "type": "signature", "order": 3, "status": "pending", "comment": null, "user_id": 12, "unresolved": false, "completed_at": null, "assignee_type": "role", "assignee_post_id": null, "assignee_role_id": 1, "assignee_user_id": null, "assignee_department_id": null}], "auto_start": true, "allow_parallel": false}	t	2026-10-15 14:48:49.493061+07	12	2026-10-15 14:48:49.493061+07	2026-10-22 15:06:41.674745+07
2	2	1	{"steps": [{"id": "fcec4f41-a9d7-4fb8-adab-c1b5dd7fb0f9", "role": "Согласование руководителем", "type": "approval", "order": 1, "status": "rejected", "comment": "gege", "user_id": 12, "unresolved": false, "completed_at": "2026-10-22T08:10:39.334Z", "assignee_type": "department_manager", "assignee_post_id": null, "assignee_role_id": null, "assignee_user_id": null, "assignee_department_id": null}, {"id": "9c58e4fa-612c-42c1-9acf-f4688fa38be9", "role": "Проверка юристом", "type": "approval", "order": 2, "status": "approved", "comment": null, "user_id": 12, "unresolved": false, "completed_at": "2026-10-22T08:11:01.738Z", "assignee_type": "post", "assignee_post_id": 11, "assignee_role_id": null, "assignee_user_id": null, "assignee_department_id": null}, {"id": "bbc3c6ae-5d80-46b7-8d4e-5e7b3fa6aebb", "role": "Подпись директора", "type": "signature", "order": 3, "status": "approved", "comment": null, "user_id": 12, "unresolved": false, "completed_at": "2026-10-25T10:59:28.349Z", "assignee_type": "role", "assignee_post_id": null, "assignee_role_id": 1, "assignee_user_id": null, "assignee_department_id": null}], "auto_start": true, "allow_parallel": false}	t	2026-10-22 15:10:47.496258+07	12	2026-10-22 15:10:17.607589+07	2026-10-25 17:59:28.346228+07
\.


--
-- Data for Name: document_signatures; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.document_signatures (id, document_id, version_id, user_id, signature_type, signed_at, ip_address, user_agent, certificate_serial, signature_hash, file_hash) FROM stdin;
\.


--
-- Data for Name: document_templates; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.document_templates (id, name, description, document_type_id, template_file_uri, template_file_name, template_file_size, template_data, default_workflow_template_id, access_mode, access_user_ids, access_department_ids, access_role_ids, usage_count, version, is_active, created_by, department_id, created_at, updated_at, deleted_at) FROM stdin;
1	Тестовый договор		30	/uploads/doc-templates/bf404879-8b9c-47be-9061-5eb40bde05b9.docx	test_template.docx	17998	{"fields": [{"key": "contract_number", "type": "text", "label": "Номер договора", "required": true, "placeholder": ""}, {"key": "contract_date", "type": "date", "label": "Дата договора", "required": true, "placeholder": ""}, {"key": "counterparty_id", "type": "counterparty", "label": "Контрагент", "required": true, "placeholder": ""}, {"key": "counterparty_position", "type": "text", "label": "Должность контрагента", "required": false, "placeholder": ""}, {"key": "signer_id", "type": "user", "label": "Подписант от заказчика", "required": true, "placeholder": ""}, {"key": "amount", "type": "number", "label": "Сумма договора", "required": true, "placeholder": ""}, {"key": "deadline", "type": "date", "label": "Срок исполнения", "required": false, "placeholder": ""}], "placeholders": {}, "detectedPlaceholders": ["НомерДоговора", "ДатаДоговора", "Контрагент", "ДолжностьКонтрагента", "ФИОКонтрагента", "СуммаДоговора", "СрокИсполнения", "ПодписантЗаказчика", "</w:t></w:r><w:proofErr w:type=\\"spellStart\\"/><w:r w:rsidRPr=\\"005D0AEA\\"><w:rPr><w:rFonts w:ascii=\\"Times New Roman\\" w:eastAsia=\\"Calibri\\" w:hAnsi=\\"Times New Roman\\" w:cs=\\"Times New Roman\\"/><w:kern w:val=\\"2\\"/><w:sz w:val=\\"28\\"/><w:szCs w:val=\\"28\\"/><w:lang w:val=\\"en-US\\" w:eastAsia=\\"en-US\\"/></w:rPr><w:t>ДатаДоговора</w:t></w:r><w:proofErr w:type=\\"spellEnd\\"/><w:r w:rsidRPr=\\"005D0AEA\\"><w:rPr><w:rFonts w:ascii=\\"Times New Roman\\" w:eastAsia=\\"Calibri\\" w:hAnsi=\\"Times New Roman\\" w:cs=\\"Times New Roman\\"/><w:kern w:val=\\"2\\"/><w:sz w:val=\\"28\\"/><w:szCs w:val=\\"28\\"/><w:lang w:val=\\"en-US\\" w:eastAsia=\\"en-US\\"/></w:rPr><w:t>"]}	\N	all	\N	\N	\N	0	1	t	12	\N	2026-10-01 15:04:13.07713+07	2026-10-01 15:04:13.07713+07	2026-10-01 15:20:46.332238+07
2	Тестовый договор		30	/uploads/doc-templates/c1934793-e009-4fce-8a7f-9cacd990d386.docx	test_template.docx	17998	{"fields": [{"key": "contract_number", "type": "text", "label": "Номер договора", "required": false, "placeholder": ""}, {"key": "contract_date", "type": "date", "label": "Дата договора", "required": false, "placeholder": ""}, {"key": "counterparty_id", "type": "counterparty", "label": "Контрагент", "required": false, "placeholder": ""}, {"key": "counterparty_position", "type": "text", "label": "Должность контрагента", "required": false, "placeholder": ""}, {"key": "signer_id", "type": "user", "label": "Подписант от заказчика", "required": false, "placeholder": ""}, {"key": "amount", "type": "number", "label": "Сумма договора", "required": false, "placeholder": ""}, {"key": "deadline", "type": "date", "label": "Срок исполнения", "required": false, "placeholder": ""}], "placeholders": {"Контрагент": "counterparty_id", "ДатаДоговора": "contract_date", "НомерДоговора": "contract_number", "СуммаДоговора": "amount", "СрокИсполнения": "deadline", "ФИОКонтрагента": "signer_id", "ПодписантЗаказчика": "signer_id", "ДолжностьКонтрагента": "counterparty_position"}}	\N	all	\N	\N	\N	0	2	t	12	\N	2026-10-04 15:00:43.232046+07	2026-10-04 15:12:35.697395+07	\N
\.


--
-- Data for Name: document_types; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.document_types (id, code, name, description, icon, numbering_enabled, numbering_pattern, numbering_reset_period, numbering_next, numbering_separator, default_workflow_template_id, default_document_template_id, is_active, sort_order, created_by, created_at, updated_at) FROM stdin;
29	order	Приказ	\N	\N	t	№{N:4}/{YYYY:4}	year	1		\N	\N	t	0	12	2026-09-29 18:18:39.896982+07	2026-09-29 18:18:39.896982+07
30	contract	Договор	\N	\N	t	{TYPE}-{N:5}/{MM:2}-{YYYY:4}	year	1		\N	\N	t	0	12	2026-09-29 18:22:16.421942+07	2026-09-29 18:22:16.421942+07
31	memo	Служебная записка	\N	\N	t	СЗ-{N:3}/{YYYY:4}	year	1		\N	\N	t	0	12	2026-09-29 18:26:56.431267+07	2026-09-29 18:26:56.431267+07
33	act	Акт	\N	\N	t	АКТ-{N:4}/{YYYY:4}	year	1		\N	\N	t	0	12	2026-09-29 18:34:50.253721+07	2026-09-29 18:34:50.253721+07
32	report	Отчёт	\N	\N	t	ОТЧ-{N:3}/{MM:2}-{YYYY:4}	month	1		\N	\N	t	0	12	2026-09-29 18:33:53.598805+07	2026-09-29 18:35:22.273811+07
34	invoice	Счёт	\N	\N	t	СЧ-{N:5}/{MM:2}-{YYYY:4}	month	1		\N	\N	t	0	12	2026-09-29 18:37:46.598599+07	2026-09-29 18:37:46.598599+07
35	application	Заявление	\N	\N	t	ЗАЯВ-{N:3}/{YYYY:4}	year	1		\N	\N	t	0	12	2026-09-29 18:38:46.762278+07	2026-09-29 18:38:46.762278+07
37	simple	Простой документ	Документ без шаблона	??	f	ПД-{N:5}/{YYYY:4}	year	1		\N	\N	t	-1	\N	2026-10-11 11:04:04.0342+07	2026-10-11 11:04:04.0342+07
36	test	Test	\N	\N	t	№{N:4}/{YYYY:4}	year	1		\N	\N	t	0	12	2026-09-30 11:06:54.330106+07	2026-09-30 11:06:54.330106+07
\.


--
-- Data for Name: document_versions; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.document_versions (id, document_id, version_number, field_values, file_uri, file_name, comment, created_by, created_at) FROM stdin;
1	1	1	{"amount": "10000", "deadline": "2026-12-01", "signer_id": 13, "contract_date": "2026-10-14", "contract_number": "001", "counterparty_id": "", "counterparty_position": "Директор"}	\N	\N	Создание документа	12	2026-10-14 10:35:08.100172+07
2	2	1	{"title": "test", "description": "test"}	\N	\N	Создание документа	12	2026-10-22 10:15:50.330606+07
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.documents (id, title, document_type_id, template_id, reg_number, reg_date, registered_by, field_values, generated_file_uri, generated_file_name, generated_at, current_version, status, priority, created_by, department_id, workflow_instance_id, created_at, updated_at, deleted_at) FROM stdin;
1	Договор от 14.10.2026	30	2	\N	\N	\N	{"amount": "10000", "deadline": "2026-12-01", "signer_id": 13, "contract_date": "2026-10-14", "contract_number": "001", "counterparty_id": "", "counterparty_position": "Директор"}	\N	\N	\N	1	on_approval	normal	12	7	\N	2026-10-14 10:35:08.100172+07	2026-10-22 15:06:41.674745+07	\N
2	test	37	\N	в„–00001/2026	2026-10-25	12	{"title": "test", "description": "test"}	\N	\N	\N	1	registered	normal	12	7	\N	2026-10-22 10:15:50.330606+07	2026-10-25 17:59:48.430698+07	\N
\.


--
-- Data for Name: message_attachments; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.message_attachments (id, message_id, file_uri, file_name, file_size, file_type, mime_type, uploaded_at) FROM stdin;
20	70	/uploads/chat-files/1785828118693-484313017.png	Иконка КИС версия 3 (2).png	1497920	image	image/png	2026-08-04 14:21:58.755998+07
21	72	/uploads/chat-files/1785828153836-677423911.jpg	IMG_20260721_112922.jpg	8704844	image	image/jpeg	2026-08-04 14:22:33.961906+07
22	74	/uploads/chat-files/1785830376163-613212739.docx	ЦИНТ Отчёт по практике.docx	448208	document	application/vnd.openxmlformats-officedocument.wordprocessingml.document	2026-08-04 14:59:36.174329+07
23	76	/uploads/chat-files/1785830396015-93509215.docx	Титульный лист.docx	23336	document	application/vnd.openxmlformats-officedocument.wordprocessingml.document	2026-08-04 14:59:56.022985+07
24	88	/uploads/chat-files/1788770201045-54371980.pdf	Лабораторная_1.pdf	143648	document	application/pdf	2026-09-07 15:36:41.076818+07
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.messages (id, chat_id, user_id, content, created_at, updated_at, is_edited, is_deleted, deleted_at, is_read, is_delivered, readers) FROM stdin;
66	5	12	aaaa	2026-05-29 18:44:11.086909+07	\N	f	f	\N	f	f	[]
67	5	13	ббббббб	2026-05-29 18:55:12.900803+07	\N	f	f	\N	f	f	[]
68	5	12	ааааа	2026-07-29 15:49:31.236608+07	\N	f	f	\N	f	f	[]
69	5	12	ff	2026-08-03 15:12:48.480948+07	\N	f	f	\N	f	f	[]
70	5	12	📷 Изображение\n/uploads/chat-files/1785828118693-484313017.png	2026-08-04 14:21:58.744748+07	\N	f	f	\N	f	f	[]
71	5	12	вам	2026-08-04 14:22:33.733653+07	\N	f	f	\N	f	f	[]
72	5	12	📷 Изображение\n/uploads/chat-files/1785828153836-677423911.jpg	2026-08-04 14:22:33.960653+07	\N	f	f	\N	f	f	[]
73	5	12	https://developer.android.com/	2026-08-04 14:59:18.199505+07	\N	f	f	\N	f	f	[]
74	5	12	📎 ЦИНТ Отчёт по практике.docx\n/uploads/chat-files/1785830376163-613212739.docx	2026-08-04 14:59:36.172918+07	\N	f	f	\N	f	f	[]
75	5	12	аа	2026-08-04 14:59:55.928467+07	\N	f	f	\N	f	f	[]
76	5	12	📎 Титульный лист.docx\n/uploads/chat-files/1785830396015-93509215.docx	2026-08-04 14:59:56.021246+07	\N	f	f	\N	f	f	[]
77	5	12	пупупу	2026-08-12 14:28:29.740005+07	\N	f	f	\N	f	f	[]
78	5	12	пу	2026-08-12 15:38:52.541056+07	\N	f	f	\N	f	f	[]
79	5	12	t	2026-08-22 20:19:04.437324+07	\N	f	f	\N	f	f	[]
80	5	12	gh	2026-08-22 20:19:22.688104+07	\N	f	f	\N	f	f	[]
81	5	12	ght	2026-08-22 20:19:46.901354+07	\N	f	f	\N	f	f	[]
82	5	12	=	2026-08-22 20:20:29.682061+07	\N	f	f	\N	f	f	[]
83	5	12	https://chat.deepseek.com/	2026-08-24 14:06:53.124619+07	\N	f	f	\N	f	f	[]
84	5	12	ghb	2026-08-24 14:08:05.470944+07	\N	f	f	\N	f	f	[]
85	5	12	gegeegegegeegegege	2026-09-07 15:28:40.628057+07	\N	f	f	\N	f	f	[]
86	5	12	tyfufjfj	2026-09-07 15:28:51.905915+07	\N	f	f	\N	f	f	[]
87	5	12	гдз	2026-09-07 15:35:51.138744+07	\N	f	f	\N	f	f	[]
88	5	12	📎 Лабораторная_1.pdf\n/uploads/chat-files/1788770201045-54371980.pdf	2026-09-07 15:36:41.068815+07	\N	f	f	\N	f	f	[]
89	5	12	пром	2026-09-07 15:36:55.061031+07	\N	f	f	\N	f	f	[]
90	5	12	📎 Дегтерев Константин 8А.docx\n/uploads/chat-files/1788770215173-955670200.docx	2026-09-07 15:36:55.18271+07	\N	f	t	2026-10-12 14:10:01.777188+07	f	f	[]
\.


--
-- Data for Name: notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notes (id, user_id, department_id, type, title, content, created_at, updated_at, deleted_at) FROM stdin;
1	12	\N	personal	aaaa	aaaaaaaa	2026-06-19 15:21:05.013136+07	2026-06-19 15:21:05.013136+07	\N
2	12	\N	personal	aaaa	dsgagzg	2026-06-19 15:23:49.702168+07	2026-06-19 15:23:49.702168+07	\N
3	12	7	group	test	testovaya	2026-06-19 15:27:03.044075+07	2026-06-19 15:27:03.044075+07	\N
\.


--
-- Data for Name: notification_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_settings (id, user_id, setting_key, setting_value, updated_at) FROM stdin;
2	13	new_tasks	t	2026-06-04 20:41:10.97696+07
4	13	doc_status_change	t	2026-06-04 20:41:27.41145+07
6	13	deadline_reminder	t	2026-06-04 20:41:40.524621+07
8	13	internal_notifications	t	2026-06-04 20:41:52.031542+07
10	13	email_notifications	f	2026-06-04 20:42:07.165789+07
1	12	new_tasks	t	2026-06-05 08:46:27.733274+07
3	12	doc_status_change	t	2026-06-05 08:46:27.73409+07
5	12	deadline_reminder	t	2026-06-05 08:46:27.734909+07
7	12	internal_notifications	t	2026-06-05 08:46:27.735793+07
9	12	email_notifications	t	2026-06-05 08:46:27.73659+07
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.notifications (id, user_id, title, content, data, is_read, created_at, category, priority, link_url, link_type, link_id, expires_at, sender_id, is_global) FROM stdin;
18	13	n	n	\N	f	2026-09-16 19:48:30.850688+07	admin	critical	\N	\N	\N	\N	12	t
19	12	n	n	\N	t	2026-09-16 19:48:30.858563+07	admin	critical	\N	\N	\N	\N	12	t
20	12	Документ "Договор от 14.10.2026" поступил на этап: Согласование руководителем	Требуется действие по документу №1	\N	t	2026-10-15 14:48:49.545556+07	document	normal	\N	document	1	\N	12	f
26	12	Документ согласован	Документ "test" успешно прошёл согласование	\N	t	2026-10-25 17:59:28.3537+07	document	normal	\N	document	2	\N	\N	f
25	12	Документ "test" поступил на этап: Подпись директора	Требуется действие по документу №2	\N	t	2026-10-22 15:11:01.742617+07	document	normal	\N	document	2	\N	12	f
24	12	Документ "test" поступил на этап: Согласование руководителем	Требуется действие по документу №2	\N	t	2026-10-22 15:10:47.507674+07	document	normal	\N	document	2	\N	12	f
23	12	Документ возвращён на доработку	Документ "test" отклонён. Причина: gege	\N	t	2026-10-22 15:10:39.338016+07	document	high	\N	document	2	\N	\N	f
21	12	Документ "Договор от 14.10.2026" поступил на этап: Проверка юристом	Требуется действие по документу №1	\N	t	2026-10-22 15:06:41.693826+07	document	normal	\N	document	1	\N	12	f
22	12	Документ "test" поступил на этап: Согласование руководителем	Требуется действие по документу №2	\N	t	2026-10-22 15:10:17.671899+07	document	normal	\N	document	2	\N	12	f
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.posts (id, department_id, name, created_at) FROM stdin;
10	\N	Супер-администратор	2026-05-22 17:59:40.123607+07
11	7	Начальник ИТ-отдела 	2026-05-24 10:40:13.345161+07
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.roles (id, name, permissions, created_at) FROM stdin;
1	admin	{"logs": {"view": true}, "roles": {"edit": true, "view": true, "create": true, "delete": true}, "stats": {"view": true}, "users": {"edit": true, "view": true, "block": true, "create": true, "delete": true, "view_all": true, "reset_password": true}, "backup": {"view": true, "create": true, "restore": true}, "settings": {"edit": true, "view": true}, "documents": {"view": "all", "create": true, "archive": true, "edit_all": true, "edit_own": true, "register": true, "delete_all": true, "delete_own": true, "manage_types": true, "manage_templates": true, "manage_counterparties": true}, "structure": {"edit": true, "view": true}, "templates": {"edit": true, "view": true, "create": true, "delete": true}, "admin_panel": true}	2026-05-21 13:09:11.798485+07
2	user	{"logs": {"view": false}, "stats": {"view": false}, "users": {"edit": false, "view": false, "block": false, "create": false, "delete": false}, "backup": {"create": false, "restore": false}, "settings": {"edit": false, "view": false}, "documents": {"view": "department", "create": true, "archive": false, "edit_all": false, "edit_own": true, "register": false, "delete_all": false, "delete_own": true, "manage_types": false, "manage_templates": false, "manage_counterparties": false}, "structure": {"edit": false, "view": false}, "admin_panel": false}	2026-05-21 13:09:11.798485+07
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.sessions (id, user_id, token, device, application, location, ip_address, user_agent, is_current, started_at, last_activity, expires_at, created_at, is_active) FROM stdin;
1	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODAyMDI5NzAsImV4cCI6MTc4MDgwNzc3MH0.LVm1mQ_fM_ocwM5GnHZ8NkMNRky7C3kskFsFpk7TBBo	\N	web	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	f	2026-05-31 11:49:30.279605+07	2026-05-31 11:49:30.279605+07	\N	2026-05-31 20:14:04.807401+07	f
2	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODAyMDQ1MTgsImV4cCI6MTc4MDgwOTMxOH0.CSY-iLqTQANERID7KNB93vDnYrzToh6OPAephJ9yZOY	Windows	Chrome 148	Локальный хост, Локальная сеть	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	f	2026-05-31 12:15:18.294254+07	2026-05-31 12:15:18.294254+07	\N	2026-05-31 20:14:04.807401+07	f
3	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODAyMDUwMTMsImV4cCI6MTc4MDgwOTgxM30.MA56N1PZUWvCUfLhrzk-AaoY4ibFYn8IWmr0hj-GHlQ	Windows	Chrome 148	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	f	2026-05-31 12:23:33.809226+07	2026-05-31 12:23:33.809226+07	\N	2026-05-31 20:14:04.807401+07	f
4	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODAyMzI5MjksImV4cCI6MTc4MDgzNzcyOX0.gnDXLuC3OV29Tdi9BpKbsevjjbyGXQTHzyk4SKSsPN4	Windows	Chrome 148	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	f	2026-05-31 20:08:49.623162+07	2026-05-31 20:08:49.623162+07	\N	2026-05-31 20:14:04.807401+07	f
5	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODAyMzMwMTksImV4cCI6MTc4MDgzNzgxOX0.vHyLXUR31BEu_iEwOTBZ2WHr2pyiVyZJVzoi3WwO3pE	Windows	Chrome 148	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	f	2026-05-31 20:10:19.779347+07	2026-05-31 20:10:19.779347+07	\N	2026-05-31 20:14:04.807401+07	f
6	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODAyMzMzNjcsImV4cCI6MTc4MDgzODE2N30.IKxIeuLIi8UJ-Omn8KrF9coQMjzamTAe4BjyU-GDLYU	Windows	Chrome 148	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	f	2026-05-31 20:16:08.023762+07	2026-05-31 20:16:08.023762+07	\N	2026-05-31 20:16:08.023762+07	f
8	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODAyMzQyNjYsImV4cCI6MTc4MDgzOTA2Nn0.5tHcv33WFnjdUowNJmrjPubt6dA4MloAhcawvk8wk08	Windows	Yandex Browser 26	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 YaBrowser/26.4.0.0 Safari/537.36	f	2026-05-31 20:31:06.998378+07	2026-05-31 20:31:06.998378+07	\N	2026-05-31 20:31:06.998378+07	f
7	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODAyMzQyMTMsImV4cCI6MTc4MDgzOTAxM30.Pra6KSV6ODKUasq1pEwt9ihO49fPSr0nK-1eDExYLt8	Windows	Chrome 148	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	f	2026-05-31 20:30:13.231572+07	2026-05-31 20:30:13.231572+07	\N	2026-05-31 20:30:13.231572+07	f
9	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODAyMzY0MzIsImV4cCI6MTc4MDg0MTIzMn0.qx6olc5-TMsMbw0R3MLPbLL3M0w_YUeya3tBfOKtEZs	Windows	Chrome 148	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	f	2026-05-31 21:07:12.768354+07	2026-05-31 21:07:12.768354+07	\N	2026-05-31 21:07:12.768354+07	f
10	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODA1ODA2ODgsImV4cCI6MTc4MTE4NTQ4OH0.W5MBECZb7ZI455RY07cPPxp25knybZifLarU8zWbn-A	Windows	Chrome 148	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	f	2026-06-04 20:44:48.338494+07	2026-06-04 20:44:48.338494+07	\N	2026-06-04 20:44:48.338494+07	f
13	13	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTMsInVzZXJuYW1lIjoidGVzdG92LnQiLCJlbWFpbCI6InRlc3RAdGVzdC5ydSIsImlhdCI6MTc4MTMzNTY5OSwiZXhwIjoxNzgxOTQwNDk5fQ.Z3H_YxWg_OYo5ZUPGJxGEPxAZmDVhjmxD8SSf2ty8ak	Windows	Chrome 149	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0	t	2026-06-13 14:28:19.826506+07	2026-06-13 14:28:19.826506+07	\N	2026-06-13 14:28:19.826506+07	t
14	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODE4NDk4MTMsImV4cCI6MTc4MjQ1NDYxM30.3vkQwuDwlnKnHBnwrvUrlaO--bmz5xKlE1TMxwaikNI	Windows	Chrome 149	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	f	2026-06-19 13:16:53.764335+07	2026-06-19 13:16:53.764335+07	\N	2026-06-19 13:16:53.764335+07	f
16	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODI3OTM3NjMsImV4cCI6MTc4MzM5ODU2M30.g2kXJulAQXFF4rHF1K0_P5xuk5_0B-ljL6qgIrdA450	Windows	Chrome 149	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	f	2026-06-30 11:29:23.864359+07	2026-06-30 11:29:23.864359+07	\N	2026-06-30 11:29:23.864359+07	f
17	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODI3OTQ1NzQsImV4cCI6MTc4MzM5OTM3NH0.2W6T2r-eZdg5RdhYsVDhvIQ-5QEdZIt1MBU8VhreK30	Windows	Chrome 149	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	f	2026-06-30 11:42:54.033791+07	2026-06-30 11:42:54.033791+07	\N	2026-06-30 11:42:54.033791+07	f
11	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODA1ODA4MjgsImV4cCI6MTc4MTE4NTYyOH0.u0dvC9iRbgvA3Wzb4Luy7oXoOfH-F3OxtdEP1T0tTPs	Windows	Chrome 148	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	f	2026-06-04 20:47:08.514813+07	2026-06-04 20:47:08.514813+07	\N	2026-06-04 20:47:08.514813+07	f
12	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODEyNDQ4ODAsImV4cCI6MTc4MTg0OTY4MH0.XWaojhV257M-TCnclg-VFIcbQIR96tjQdvff2x_G6jY	Windows	Chrome 149	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	f	2026-06-12 13:14:40.354058+07	2026-06-12 13:14:40.354058+07	\N	2026-06-12 13:14:40.354058+07	f
15	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODE4NTA0OTYsImV4cCI6MTc4MjQ1NTI5Nn0.oYiyTtOBGU8_V8-t6Tfb-vG0YSvrvL1B9bwLewd69fc	Windows	Chrome 149	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	f	2026-06-19 13:28:16.812337+07	2026-06-19 13:28:16.812337+07	\N	2026-06-19 13:28:16.812337+07	f
18	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODMyMzU2ODIsImV4cCI6MTc4Mzg0MDQ4Mn0.xNFFndvOVVsYqv2lcmOy4Ag2Y2QVCtIEfqO5vLmFHNg	Android	Chrome 149	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36	f	2026-07-05 14:14:42.787622+07	2026-07-05 14:14:42.787622+07	\N	2026-07-05 14:14:42.787622+07	f
19	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODUxNDQ1NDQsImV4cCI6MTc4NTc0OTM0NH0.3qTD5ZyUSYjUfim8JXB9rPphGyPsw9NWVPYQWL9tYLk	Компьютер	okhttp 4	Неизвестно	::ffff:127.0.0.1	okhttp/4.12.0	f	2026-07-27 16:29:05.604668+07	2026-07-27 16:29:05.604668+07	\N	2026-07-27 16:29:05.604668+07	f
20	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODUxNDc5NDUsImV4cCI6MTc4NTc1Mjc0NX0.1zMeBgeppoMHBJI3cGZtCBDo1ejSCp8pPaXCnTq-pxQ	Компьютер	okhttp 4	Неизвестно	::ffff:127.0.0.1	okhttp/4.12.0	f	2026-07-27 17:25:47.521934+07	2026-07-27 17:25:47.521934+07	\N	2026-07-27 17:25:47.521934+07	f
21	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODUyMTI1MzMsImV4cCI6MTc4NTgxNzMzM30.jHPQCk30-XrnvsCukde9sCCKftqfSXPPgBMzQvoMSAs	Windows	Chrome 150	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	f	2026-07-28 11:22:13.14143+07	2026-07-28 11:22:13.14143+07	\N	2026-07-28 11:22:13.14143+07	f
22	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODUyOTMzNzUsImV4cCI6MTc4NTg5ODE3NX0.PHCLFlS2Hw6vboi2bENh0ljAEhWc4pii5zH_9m0eC0E	Компьютер	okhttp 4	Неизвестно	::ffff:127.0.0.1	okhttp/4.12.0	f	2026-07-29 09:49:35.848355+07	2026-07-29 09:49:35.848355+07	\N	2026-07-29 09:49:35.848355+07	f
23	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODUzMTExMTMsImV4cCI6MTc4NTkxNTkxM30.rqvlapplinzX6Ohforeb0rgvagsounq6B2wkYFNvgcE	Компьютер	okhttp 4	Неизвестно	::ffff:127.0.0.1	okhttp/4.12.0	f	2026-07-29 14:45:14.270464+07	2026-07-29 14:45:14.270464+07	\N	2026-07-29 14:45:14.270464+07	f
24	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODU4MjQyNjAsImV4cCI6MTc4NjQyOTA2MH0.HRlSPkg5iTzmFD6DCIzVeLn7aUJexZI3Nf4e7kJreu4	Windows	Chrome 150	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	f	2026-08-04 13:17:40.045767+07	2026-08-04 13:17:40.045767+07	\N	2026-08-04 13:17:40.045767+07	f
25	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODY1MTYxNzUsImV4cCI6MTc4NzEyMDk3NX0.usdXl8jc1XjY3lPr1pjwZRRqaki96iE6hWe9sDeZ1GI	Компьютер	okhttp 4	Неизвестно	::ffff:127.0.0.1	okhttp/4.12.0	f	2026-08-12 13:29:36.270218+07	2026-08-12 13:29:36.270218+07	\N	2026-08-12 13:29:36.270218+07	f
26	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODY1MTg0ODUsImV4cCI6MTc4NzEyMzI4NX0.Yt7eH80MhApkCZj6RgvuniuS0fEEReYmQa9scWxfBUE	Windows	Chrome 151	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	f	2026-08-12 14:08:05.789375+07	2026-08-12 14:08:05.789375+07	\N	2026-08-12 14:08:05.789375+07	f
27	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODcyOTg3NTEsImV4cCI6MTc4NzkwMzU1MX0.6AnwPyT7dy_WvZ4jyIq2coRpNremdvkWJCzJgxNEZb8	Windows	Chrome 151	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	f	2026-08-21 14:52:31.35046+07	2026-08-21 14:52:31.35046+07	\N	2026-08-21 14:52:31.35046+07	f
28	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODc0MDQ3MjMsImV4cCI6MTc4ODAwOTUyM30.b-3rjMuql5UDwM29UbkFhgDTRWne5Xe211Fo8ZA4Y24	Компьютер	okhttp 4	Неизвестно	::ffff:127.0.0.1	okhttp/4.12.0	f	2026-08-22 20:18:46.457449+07	2026-08-22 20:18:46.457449+07	\N	2026-08-22 20:18:46.457449+07	f
29	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODgyNDcxNzIsImV4cCI6MTc4ODg1MTk3Mn0.PjjJ_ripb5fwJNzqXAkXjPaGl8C37_xxUafWzc9-610	Компьютер	okhttp 4	Неизвестно	::ffff:127.0.0.1	okhttp/4.12.0	f	2026-09-01 14:19:32.888764+07	2026-09-01 14:19:32.888764+07	\N	2026-09-01 14:19:32.888764+07	f
30	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODgyNDg0MTQsImV4cCI6MTc4ODg1MzIxNH0.pyVevY0fWouPp2XWnRQD5gbXp5D0II4IK5os6sTaY6w	Windows	Chrome 152	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	f	2026-09-01 14:40:14.129184+07	2026-09-01 14:40:14.129184+07	\N	2026-09-01 14:40:14.129184+07	f
31	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODg1MjAxMjQsImV4cCI6MTc4OTEyNDkyNH0.8FVFSAoBmVm03E_VEgp8jHsD86H4ZrSjLmqChCV1-Hs	Windows	Chrome 152	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	f	2026-09-04 18:08:44.344236+07	2026-09-04 18:08:44.344236+07	\N	2026-09-04 18:08:44.344236+07	f
32	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODg1MjA5MjcsImV4cCI6MTc4OTEyNTcyN30.9GdmqRQW-40DlU6E-nuFO326zqN6bZcMoKhTB36gy_I	Windows	Chrome 152	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	f	2026-09-04 18:22:07.122183+07	2026-09-04 18:22:07.122183+07	\N	2026-09-04 18:22:07.122183+07	f
35	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODg3NjkxOTgsImV4cCI6MTc4OTM3Mzk5OH0.GhudrDJ6PepClKsLYE743yAhAN7Qd7-DJHFTuxuA54k	Компьютер	okhttp 4	Неизвестно	::ffff:192.168.8.106	okhttp/4.12.0	t	2026-09-07 15:20:07.622101+07	2026-09-07 15:20:07.622101+07	\N	2026-09-07 15:20:07.622101+07	t
33	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODg1MjU5MzEsImV4cCI6MTc4OTEzMDczMX0.FRSOp8DlbT6IbnOQUeQsK0PvzkMmE5uPB4Zmnx32usE	Компьютер	okhttp 4	Неизвестно	::ffff:192.168.8.106	okhttp/4.12.0	f	2026-09-04 19:45:32.083395+07	2026-09-04 19:45:32.083395+07	\N	2026-09-04 19:45:32.083395+07	f
36	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODg4NTgyNDAsImV4cCI6MTc4OTQ2MzA0MH0.OlgegnyEgEDeWP0chXmh2QVeNORwZvpQn89SpzaD5dM	Компьютер	okhttp 4	Неизвестно	::ffff:192.168.8.106	okhttp/4.12.0	t	2026-09-08 16:04:00.827679+07	2026-09-08 16:04:00.827679+07	\N	2026-09-08 16:04:00.827679+07	t
34	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODg3Njg4MTMsImV4cCI6MTc4OTM3MzYxM30.BjoiIAO3fItJR9Z1d5cYsOLzE9-c-3N6xadiTbExfp8	Windows	Chrome 152	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	f	2026-09-07 15:13:33.920408+07	2026-09-07 15:13:33.920408+07	\N	2026-09-07 15:13:33.920408+07	f
37	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODkwMjY4ODIsImV4cCI6MTc4OTYzMTY4Mn0.eGZK9k8COH-cFKRAd3vi07ILiHDpn_R6BseXxMMNgOk	Windows	Chrome 152	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	f	2026-09-10 14:54:42.269186+07	2026-09-10 14:54:42.269186+07	\N	2026-09-10 14:54:42.269186+07	f
38	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODk0NDA0NDAsImV4cCI6MTc5MDA0NTI0MH0.8IKk7ACXaZ56llIuC32BFgLQmJp9Ja7gMbTvObRCUqc	Windows	Chrome 152	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36	t	2026-09-15 09:47:20.891521+07	2026-09-15 09:47:20.891521+07	\N	2026-09-15 09:47:20.891521+07	t
39	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3ODk0NDEzNjgsImV4cCI6MTc5MDA0NjE2OH0.X6rCWOogYz26_wDyHuFGWun_AOq4rJAR8R0mrWAUp8U	Компьютер	okhttp 4	Неизвестно	::ffff:192.168.8.106	okhttp/4.12.0	t	2026-09-15 10:02:48.271185+07	2026-09-15 10:02:48.271185+07	\N	2026-09-15 10:02:48.271185+07	t
40	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3OTAwODEyMzAsImV4cCI6MTc5MDY4NjAzMH0.nyU5mfIRqGeBkqxvIquRFL1E-mQDIPOnC_NMlVbHeyY	Windows	Chrome 153	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	t	2026-09-22 19:47:10.104402+07	2026-09-22 19:47:10.104402+07	\N	2026-09-22 19:47:10.104402+07	t
41	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3OTA3NDA3MDEsImV4cCI6MTc5MTM0NTUwMX0.8G-gwuC2a0XBSLDXgnPnz8U3VDBif17gleRuhT8sOHs	Windows	Chrome 154	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	t	2026-09-30 10:58:21.760059+07	2026-09-30 10:58:21.760059+07	\N	2026-09-30 10:58:21.760059+07	t
42	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3OTExMDIyMjYsImV4cCI6MTc5MTcwNzAyNn0.5p_rYSOlQ-NhFYCuxCdPBiA0t8oa4srssdfK4m_6TEk	Windows	Chrome 154	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	t	2026-10-04 15:23:46.72279+07	2026-10-04 15:23:46.72279+07	\N	2026-10-04 15:23:46.72279+07	t
43	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3OTE3MDE3OTQsImV4cCI6MTc5MjMwNjU5NH0.8wEMph5DkNQWus5K1F-eLgn3QuTszzq13XrkHMJ5Gvw	Windows	Chrome 154	Локальная сеть, Локальный хост	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	t	2026-10-11 13:56:34.450102+07	2026-10-11 13:56:34.450102+07	\N	2026-10-11 13:56:34.450102+07	t
44	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3OTE3ODg5NjIsImV4cCI6MTc5MjM5Mzc2Mn0.1OI5L0Zia-0twfTd0xRkgxl-iry-qZkayhkETQABh00	Компьютер	okhttp 4	Неизвестно	::ffff:192.168.8.106	okhttp/4.12.0	t	2026-10-12 14:09:22.718487+07	2026-10-12 14:09:22.718487+07	\N	2026-10-12 14:09:22.718487+07	t
45	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3OTIyMjkzMDUsImV4cCI6MTc5MjgzNDEwNX0.qC0sgUUy01nyGSI0eZ7EV4BgsODtrt16Uhw13wU2G5o	Android	Yandex Browser 26	Локальная сеть, Локальный хост	192.168.8.24	Mozilla/5.0 (Linux; arm_64; Android 12; BLK-LX9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.119 YaBrowser/26.8.3.119.00 Mobile Safari/537.36	t	2026-10-17 16:28:25.523299+07	2026-10-17 16:28:25.523299+07	\N	2026-10-17 16:28:25.523299+07	t
46	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3OTIyMzEyOTcsImV4cCI6MTc5MjgzNjA5N30._4JXsPenjscE5ohEUr4gmJIUaiOcKBZGiro-MebD6BI	Android	Yandex Browser 26	Локальная сеть, Локальный хост	192.168.8.24	Mozilla/5.0 (Linux; arm_64; Android 12; BLK-LX9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.119 YaBrowser/26.8.3.119.00 Mobile Safari/537.36	f	2026-10-17 17:01:37.543713+07	2026-10-17 17:01:37.543713+07	\N	2026-10-17 17:01:37.543713+07	f
47	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3OTI1NTQ5ODgsImV4cCI6MTc5MzE1OTc4OH0.BIEHjsAwOpF-Sin0KUcYYoUXuLgffoftgEsIIVmZZp8	Windows	Chrome 155	Локальная сеть, Локальный хост	192.168.8.106	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36	t	2026-10-21 10:56:28.891352+07	2026-10-21 10:56:28.891352+07	\N	2026-10-21 10:56:28.891352+07	t
48	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3OTI3NDA5ODUsImV4cCI6MTc5MzM0NTc4NX0.DP_jDN1J1ydIOBo9WOEWguUmPfLRiA4Ta_LX4ivByXc	Windows	Chrome 155	Локальная сеть, Локальный хост	192.168.8.106	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36	t	2026-10-23 14:36:25.908856+07	2026-10-23 14:36:25.908856+07	\N	2026-10-23 14:36:25.908856+07	t
49	12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBhbnkucnUiLCJpYXQiOjE3OTI5MjU5NTAsImV4cCI6MTc5MzUzMDc1MH0.1xhH08_htHzmTEqQnE6AuCwgY81EZVy-nrZycT74AhQ	Windows	Chrome 155	Локальная сеть, Локальный хост	192.168.8.106	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36	t	2026-10-25 17:59:10.69484+07	2026-10-25 17:59:10.69484+07	\N	2026-10-25 17:59:10.69484+07	t
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.system_settings (id, setting_key, setting_value, setting_type, description, updated_at, updated_by) FROM stdin;
13	org_name	ООО Тест	string	Ќ §ў ­ЁҐ ®аЈ ­Ё§ жЁЁ	2026-05-25 10:32:42.072513+07	13
16	auto_numbering	auto	string	Ђўв®­г¬Ґа жЁп ¤®Єг¬Ґ­в®ў	2026-05-25 10:32:42.074603+07	13
14	org_email	info@company.ru	string	Љ®­в Єв­л© email	2026-05-25 10:32:42.076015+07	13
15	org_phone	+7 (495) 000-00-00	string	Љ®­в Єв­л© вҐ«Ґд®­	2026-05-25 10:32:42.077013+07	13
22	auto_archive_days	365	number	Ђўв® аеЁў жЁп ¤®Єг¬Ґ­в®ў	2026-05-25 10:32:42.077944+07	13
23	max_file_size	50	number	Њ ЄбЁ¬ «м­л© а §¬Ґа д ©«  (ЊЃ)	2026-05-25 10:32:42.078879+07	13
38	allowed_file_types	[]	json	\N	2026-05-25 10:32:42.079842+07	13
24	storage_path	./uploads	string	Џгвм Є еа ­Ё«Ёйг	2026-05-25 10:32:42.080718+07	13
17	session_timeout	8	number	‚аҐ¬п ¦Ё§­Ё бҐббЁЁ ў з б е	2026-05-25 10:32:42.08157+07	13
18	password_min_length	6	number	ЊЁ­Ё¬ «м­ п ¤«Ё­  Ї а®«п	2026-05-25 10:32:42.082281+07	13
19	password_require_special	true	boolean	’аҐЎ®ў вм бЇҐжбЁ¬ў®«л	2026-05-25 10:32:42.083124+07	13
20	enable_2fa	false	boolean	„ўгед Єв®а­ п  гвҐ­вЁдЁЄ жЁп	2026-05-25 10:32:42.083931+07	13
25	backup_schedule	daily	string	ђ бЇЁб ­ЁҐ ЎнЄ Ї®ў	2026-05-25 10:32:42.084781+07	13
26	backup_time	02:00	string	‚аҐ¬п ЎнЄ Ї 	2026-05-25 10:32:42.08552+07	13
27	backup_retention_days	30	number	•а ­Ґ­ЁҐ ЎнЄ Ї®ў	2026-05-25 10:32:42.086259+07	13
21	notify_email	admin@company.ru	string	Email ¤«п гўҐ¤®¬«Ґ­Ё©	2026-05-25 10:32:42.087189+07	13
30	notify_critical_errors	true	boolean	“ўҐ¤®¬«Ґ­Ёп ®Ў ®иЁЎЄ е	2026-05-25 10:32:42.088502+07	13
31	notify_suspicious	true	boolean	“ўҐ¤®¬«Ґ­Ёп ® Ї®¤®§аЁвҐ«м­®©  ЄвЁў­®бвЁ	2026-05-25 10:32:42.090021+07	13
28	log_level	info	string	“а®ўҐ­м «®ЈЁа®ў ­Ёп	2026-05-25 10:32:42.091032+07	13
29	log_retention_days	90	number	•а ­Ґ­ЁҐ «®Ј®ў	2026-05-25 10:32:42.091987+07	13
\.


--
-- Data for Name: task_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task_comments (id, task_id, user_id, content, created_at, updated_at) FROM stdin;
1	10	12	fffff	2026-06-30 11:39:32.96697+07	\N
2	10	12	sdsdsddssd	2026-06-30 11:41:01.224887+07	\N
3	10	12	fffff	2026-06-30 11:47:35.268233+07	\N
4	9	12	ааа	2026-07-02 12:02:04.670825+07	\N
\.


--
-- Data for Name: task_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task_templates (id, name, description, type, template_data, user_id, department_id, is_shared, usage_count, created_at, updated_at) FROM stdin;
2	Согласование документа версия		custom	{"fields": [{"key": "", "type": "number", "label": "--", "required": true, "placeholder": "", "defaultValue": ""}, {"key": "д", "type": "document", "label": "Доку", "required": true, "placeholder": "", "defaultValue": ""}], "notifyAssignee": true, "notifyDeadline": true, "defaultPriority": "medium", "notifyObservers": true, "defaultDeadlineDays": 7}	12	7	t	4	2026-06-12 23:26:32.652144+07	2026-06-12 23:26:32.652144+07
1	Согласование документа	используется для согласования документов в ИТ-отделе	custom	{"fields": [{"key": "согласующие", "type": "multi-user", "label": "Согласующие", "required": false, "placeholder": "", "defaultValue": ""}], "notifyAssignee": true, "notifyDeadline": true, "defaultPriority": "medium", "notifyObservers": true, "defaultDeadlineDays": 7}	12	7	t	27	2026-06-10 16:23:26.434121+07	2026-06-10 16:23:26.434121+07
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tasks (id, title, description, status, priority, created_by, assigned_to, department_id, start_date, due_date, completed_at, progress, tags, created_at, updated_at, deleted_at, custom_fields, template_id) FROM stdin;
1	Согласование ТЗ мессенджера		completed	Высокий	12	13	\N	2026-06-11	2026-06-20	2026-06-13 14:28:33.067902+07	0	{}	2026-06-13 14:26:12.127168+07	2026-06-13 14:28:33.067902+07	\N	{}	\N
2	Согласование ТЗ мессенджера		completed	Высокий	12	13	\N	2026-06-01	2026-06-20	2026-06-13 15:06:07.525572+07	0	{}	2026-06-13 14:40:43.000167+07	2026-06-13 15:06:07.525572+07	\N	{}	\N
3	Согласование ТЗ мессенджера для крита	крит	completed	Критический	12	13	\N	0006-06-11	2026-06-30	2026-06-13 15:06:08.432688+07	0	{}	2026-06-13 14:48:27.256022+07	2026-06-13 15:06:08.432688+07	\N	{}	\N
4	Согласование ТЗ мессенджера		pending	medium	12	13	\N	2026-06-11	2026-06-20	\N	0	{}	2026-06-13 15:06:44.929933+07	2026-06-13 15:06:44.929933+07	\N	{}	\N
5	Согласование ТЗ мессенджера для крита		pending	medium	12	13	\N	2026-06-01	2026-06-30	\N	0	{}	2026-06-13 15:08:03.944327+07	2026-06-13 15:08:03.944327+07	\N	{}	\N
6	Согласование ТЗ мессенджера jdsnsdljknnd	sdbjbjksdbj	pending	medium	12	13	\N	2026-06-11	2026-06-20	\N	0	{}	2026-06-13 16:07:22.633386+07	2026-06-13 16:07:22.633386+07	\N	{}	\N
7	Согласование ТЗ мессенджера для критаhhvhhk	nbjkb	pending	medium	12	13	\N	2026-06-11	2026-06-20	\N	0	{}	2026-06-13 16:15:37.902478+07	2026-06-13 16:15:37.902478+07	\N	{}	\N
8	Согласование Т	ttttt	pending	medium	12	13	\N	2026-06-11	2026-06-20	\N	0	{}	2026-06-13 16:20:27.919454+07	2026-06-13 16:20:27.919454+07	\N	{}	\N
9	Согласование ТЗ мессенджера proverka		pending	medium	12	13	\N	2026-06-14	2026-06-21	\N	0	{}	2026-06-14 10:43:45.621929+07	2026-06-14 10:43:45.621929+07	\N	{}	\N
10	Согласование ТЗ мессенджера proverka1		pending	critical	12	13	\N	\N	\N	\N	34	{}	2026-06-14 10:50:57.799919+07	2026-06-30 11:40:52.75357+07	\N	{}	\N
11	Test card	Test card	pending	high	12	13	\N	2026-07-01	2026-07-09	\N	0	{}	2026-07-02 17:20:24.454921+07	2026-07-02 17:20:24.454921+07	\N	{}	\N
12	Test card #2	test #2	pending	critical	12	13	\N	2026-07-02	2026-07-09	\N	0	{}	2026-07-02 17:27:00.516991+07	2026-07-02 17:27:00.516991+07	\N	{"согласующие": "13"}	\N
13	Test card #3	test3	pending	low	12	13	\N	2026-07-03	2026-07-10	\N	0	{}	2026-07-03 13:54:51.741941+07	2026-07-03 13:54:51.741941+07	\N	{"согласующие": "13"}	\N
14	Test card #4	test4	pending	critical	12	13	\N	2026-07-04	2026-07-12	\N	0	{}	2026-07-05 14:36:40.565498+07	2026-07-05 14:36:40.565498+07	\N	{"observers": {"type": "multi-user", "label": "Наблюдатели", "value": [13]}, "согласующие": {"type": "hidden", "label": "согласующие", "value": "13"}}	1
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.users (id, username, surname, name, patronymic, birthday, post_id, department_id, email, tel_num, password_hash, status, role_id, avatar_uri, last_seen_at, created_at, settings, start_date, deleted_at, is_super_admin) FROM stdin;
12	admin	Системный	Администратор		\N	11	7	admin@company.ru	+79000000001	$2b$10$OiwwgV4pEoluCakyVsBYZOoFCCdbJQjhTu2RA3/vacs2Nr7aazjZy	active	1	/uploads/avatars/avatar_12_1780200012326.png	2026-10-26 13:33:59.992856+07	2026-05-22 17:59:40.252276+07	{}	\N	\N	t
13	testov.t	Тестов	Тест	Тестович	2000-11-11	\N	\N	test@test.ru	88000000000	$2b$10$iM38L9.W9e5J74TMbISLHeJbuSK/PkrDD5cMoAApd2ttdqvWAF1E.	active	2	\N	2026-06-14 11:58:45.488397+07	2026-05-24 13:14:02.131348+07	{}	\N	\N	f
\.


--
-- Data for Name: workflow_instances; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.workflow_instances (id, template_id, started_by, status, current_step_index, data, started_at, completed_at) FROM stdin;
\.


--
-- Data for Name: workflow_templates; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.workflow_templates (id, name, description, steps, created_by, usage_count, version, is_active, created_at, updated_at, deleted_at) FROM stdin;
1	Тестовое согласование	Тестовый маршрут для проверки	[{"id": "fcec4f41-a9d7-4fb8-adab-c1b5dd7fb0f9", "type": "approval", "order": 1, "role_label": "Согласование руководителем", "assignee_type": "department_manager", "assignee_post_id": null, "assignee_role_id": null, "assignee_user_id": null, "assignee_department_id": null}, {"id": "9c58e4fa-612c-42c1-9acf-f4688fa38be9", "type": "approval", "order": 2, "role_label": "Проверка юристом", "assignee_type": "post", "assignee_post_id": 11, "assignee_role_id": null, "assignee_user_id": null, "assignee_department_id": null}, {"id": "bbc3c6ae-5d80-46b7-8d4e-5e7b3fa6aebb", "type": "signature", "order": 3, "role_label": "Подпись директора", "assignee_type": "role", "assignee_post_id": null, "assignee_role_id": 1, "assignee_user_id": null, "assignee_department_id": null}]	12	1	3	t	2026-10-08 15:24:14.419256+07	2026-10-08 15:27:35.391441+07	\N
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 7, true);


--
-- Name: backups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.backups_id_seq', 2, true);


--
-- Name: chat_folders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.chat_folders_id_seq', 11, true);


--
-- Name: chats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.chats_id_seq', 5, true);


--
-- Name: counterparties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.counterparties_id_seq', 1, false);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.departments_id_seq', 7, true);


--
-- Name: document_access_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.document_access_id_seq', 1, false);


--
-- Name: document_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.document_attachments_id_seq', 1, false);


--
-- Name: document_numbering_counters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.document_numbering_counters_id_seq', 1, true);


--
-- Name: document_routes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.document_routes_id_seq', 2, true);


--
-- Name: document_signatures_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.document_signatures_id_seq', 1, false);


--
-- Name: document_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.document_templates_id_seq', 2, true);


--
-- Name: document_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.document_types_id_seq', 37, true);


--
-- Name: document_versions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.document_versions_id_seq', 2, true);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.documents_id_seq', 2, true);


--
-- Name: message_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.message_attachments_id_seq', 25, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.messages_id_seq', 90, true);


--
-- Name: notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notes_id_seq', 3, true);


--
-- Name: notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notification_settings_id_seq', 165, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.notifications_id_seq', 26, true);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.posts_id_seq', 11, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.roles_id_seq', 3, true);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.sessions_id_seq', 49, true);


--
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 71, true);


--
-- Name: task_comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.task_comments_id_seq', 4, true);


--
-- Name: task_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.task_templates_id_seq', 2, true);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tasks_id_seq', 14, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.users_id_seq', 13, true);


--
-- Name: workflow_instances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.workflow_instances_id_seq', 1, false);


--
-- Name: workflow_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.workflow_templates_id_seq', 1, true);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: backups backups_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_pkey PRIMARY KEY (id);


--
-- Name: chat_folder_items chat_folder_items_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.chat_folder_items
    ADD CONSTRAINT chat_folder_items_pkey PRIMARY KEY (folder_id, chat_id);


--
-- Name: chat_folders chat_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.chat_folders
    ADD CONSTRAINT chat_folders_pkey PRIMARY KEY (id);


--
-- Name: chat_participants chat_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_pkey PRIMARY KEY (chat_id, user_id);


--
-- Name: chats chats_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (user_id, contact_id);


--
-- Name: counterparties counterparties_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.counterparties
    ADD CONSTRAINT counterparties_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: document_access document_access_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_access
    ADD CONSTRAINT document_access_pkey PRIMARY KEY (id);


--
-- Name: document_attachments document_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_attachments
    ADD CONSTRAINT document_attachments_pkey PRIMARY KEY (id);


--
-- Name: document_numbering_counters document_numbering_counters_document_type_id_period_key_key; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_numbering_counters
    ADD CONSTRAINT document_numbering_counters_document_type_id_period_key_key UNIQUE (document_type_id, period_key);


--
-- Name: document_numbering_counters document_numbering_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_numbering_counters
    ADD CONSTRAINT document_numbering_counters_pkey PRIMARY KEY (id);


--
-- Name: document_routes document_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_routes
    ADD CONSTRAINT document_routes_pkey PRIMARY KEY (id);


--
-- Name: document_signatures document_signatures_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_signatures
    ADD CONSTRAINT document_signatures_pkey PRIMARY KEY (id);


--
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- Name: document_types document_types_code_key; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_code_key UNIQUE (code);


--
-- Name: document_types document_types_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_pkey PRIMARY KEY (id);


--
-- Name: document_versions document_versions_document_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_document_id_version_number_key UNIQUE (document_id, version_number);


--
-- Name: document_versions document_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: message_attachments message_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_user_id_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_setting_key_key UNIQUE (user_id, setting_key);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_key; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_key UNIQUE (token);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: task_comments task_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_pkey PRIMARY KEY (id);


--
-- Name: task_templates task_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_tel_num_key; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tel_num_key UNIQUE (tel_num);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: workflow_instances workflow_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.workflow_instances
    ADD CONSTRAINT workflow_instances_pkey PRIMARY KEY (id);


--
-- Name: workflow_templates workflow_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.workflow_templates
    ADD CONSTRAINT workflow_templates_pkey PRIMARY KEY (id);


--
-- Name: idx_attachments_message_id; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_attachments_message_id ON public.message_attachments USING btree (message_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_backups_created_at; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_backups_created_at ON public.backups USING btree (created_at DESC);


--
-- Name: idx_chat_folder_items_chat_id; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_chat_folder_items_chat_id ON public.chat_folder_items USING btree (chat_id);


--
-- Name: idx_chat_folder_items_folder_id; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_chat_folder_items_folder_id ON public.chat_folder_items USING btree (folder_id);


--
-- Name: idx_chat_folders_user_id; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_chat_folders_user_id ON public.chat_folders USING btree (user_id);


--
-- Name: idx_chat_participants_chat_id; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_chat_participants_chat_id ON public.chat_participants USING btree (chat_id);


--
-- Name: idx_chat_participants_last_read; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_chat_participants_last_read ON public.chat_participants USING btree (last_read_at);


--
-- Name: idx_chat_participants_user_id; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_chat_participants_user_id ON public.chat_participants USING btree (user_id);


--
-- Name: idx_contacts_user_id; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_contacts_user_id ON public.contacts USING btree (user_id);


--
-- Name: idx_counterparties_active; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_counterparties_active ON public.counterparties USING btree (is_active) WHERE (deleted_at IS NULL);


--
-- Name: idx_counterparties_inn; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_counterparties_inn ON public.counterparties USING btree (inn) WHERE (deleted_at IS NULL);


--
-- Name: idx_counterparties_name; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_counterparties_name ON public.counterparties USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_document_access_dept; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_document_access_dept ON public.document_access USING btree (department_id) WHERE (department_id IS NOT NULL);


--
-- Name: idx_document_access_doc; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_document_access_doc ON public.document_access USING btree (document_id);


--
-- Name: idx_document_access_user; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_document_access_user ON public.document_access USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_document_attachments_doc; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_document_attachments_doc ON public.document_attachments USING btree (document_id);


--
-- Name: idx_document_routes_doc; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_document_routes_doc ON public.document_routes USING btree (document_id);


--
-- Name: idx_document_signatures_doc; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_document_signatures_doc ON public.document_signatures USING btree (document_id);


--
-- Name: idx_document_signatures_user; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_document_signatures_user ON public.document_signatures USING btree (user_id);


--
-- Name: idx_document_templates_active; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_document_templates_active ON public.document_templates USING btree (is_active) WHERE (deleted_at IS NULL);


--
-- Name: idx_document_templates_type; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_document_templates_type ON public.document_templates USING btree (document_type_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_document_templates_user; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_document_templates_user ON public.document_templates USING btree (created_by) WHERE (deleted_at IS NULL);


--
-- Name: idx_document_types_active; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_document_types_active ON public.document_types USING btree (is_active);


--
-- Name: idx_document_types_code; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_document_types_code ON public.document_types USING btree (code);


--
-- Name: idx_document_versions_doc; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_document_versions_doc ON public.document_versions USING btree (document_id, version_number DESC);


--
-- Name: idx_documents_created_by; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_documents_created_by ON public.documents USING btree (created_by) WHERE (deleted_at IS NULL);


--
-- Name: idx_documents_department; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_documents_department ON public.documents USING btree (department_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_documents_reg_number; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_documents_reg_number ON public.documents USING btree (reg_number) WHERE (deleted_at IS NULL);


--
-- Name: idx_documents_status; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_documents_status ON public.documents USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: idx_documents_type; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_documents_type ON public.documents USING btree (document_type_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_documents_workflow; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_documents_workflow ON public.documents USING btree (workflow_instance_id);


--
-- Name: idx_messages_chat_id; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_messages_chat_id ON public.messages USING btree (chat_id) WHERE (is_deleted = false);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- Name: idx_messages_readers; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_messages_readers ON public.messages USING gin (readers);


--
-- Name: idx_messages_user_id; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_messages_user_id ON public.messages USING btree (user_id);


--
-- Name: idx_notes_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notes_deleted_at ON public.notes USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_notes_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notes_type ON public.notes USING btree (type);


--
-- Name: idx_notes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notes_user_id ON public.notes USING btree (user_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read) WHERE (is_read = false);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_numbering_type_period; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_numbering_type_period ON public.document_numbering_counters USING btree (document_type_id, period_key);


--
-- Name: idx_sessions_is_current; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_sessions_is_current ON public.sessions USING btree (is_current) WHERE (is_current = true);


--
-- Name: idx_sessions_token; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_sessions_token ON public.sessions USING btree (token);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: idx_system_settings_key; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_system_settings_key ON public.system_settings USING btree (setting_key);


--
-- Name: idx_task_comments_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_comments_task_id ON public.task_comments USING btree (task_id);


--
-- Name: idx_task_templates_department; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_templates_department ON public.task_templates USING btree (department_id);


--
-- Name: idx_task_templates_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_templates_user_id ON public.task_templates USING btree (user_id);


--
-- Name: idx_tasks_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_created_by ON public.tasks USING btree (created_by) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_priority ON public.tasks USING btree (priority);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_users_email ON public.users USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_last_seen; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_users_last_seen ON public.users USING btree (last_seen_at);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_users_role ON public.users USING btree (role_id);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_users_username ON public.users USING btree (username) WHERE (deleted_at IS NULL);


--
-- Name: idx_workflow_instances_started_by; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_workflow_instances_started_by ON public.workflow_instances USING btree (started_by);


--
-- Name: idx_workflow_instances_status; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_workflow_instances_status ON public.workflow_instances USING btree (status);


--
-- Name: idx_workflow_instances_template; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_workflow_instances_template ON public.workflow_instances USING btree (template_id);


--
-- Name: idx_workflow_templates_active; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_workflow_templates_active ON public.workflow_templates USING btree (is_active) WHERE (deleted_at IS NULL);


--
-- Name: idx_workflow_templates_created_by; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_workflow_templates_created_by ON public.workflow_templates USING btree (created_by);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: backups backups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: chat_folder_items chat_folder_items_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.chat_folder_items
    ADD CONSTRAINT chat_folder_items_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;


--
-- Name: chat_folder_items chat_folder_items_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.chat_folder_items
    ADD CONSTRAINT chat_folder_items_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.chat_folders(id) ON DELETE CASCADE;


--
-- Name: chat_folders chat_folders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.chat_folders
    ADD CONSTRAINT chat_folders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_participants chat_participants_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;


--
-- Name: chat_participants chat_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chats chats_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: contacts contacts_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: contacts contacts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: counterparties counterparties_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.counterparties
    ADD CONSTRAINT counterparties_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: departments departments_parent_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_parent_department_id_fkey FOREIGN KEY (parent_department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: document_access document_access_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_access
    ADD CONSTRAINT document_access_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: document_access document_access_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_access
    ADD CONSTRAINT document_access_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: document_access document_access_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_access
    ADD CONSTRAINT document_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: document_access document_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_access
    ADD CONSTRAINT document_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: document_attachments document_attachments_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_attachments
    ADD CONSTRAINT document_attachments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: document_attachments document_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_attachments
    ADD CONSTRAINT document_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: document_numbering_counters document_numbering_counters_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_numbering_counters
    ADD CONSTRAINT document_numbering_counters_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id) ON DELETE CASCADE;


--
-- Name: document_routes document_routes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_routes
    ADD CONSTRAINT document_routes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: document_routes document_routes_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_routes
    ADD CONSTRAINT document_routes_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: document_routes document_routes_workflow_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_routes
    ADD CONSTRAINT document_routes_workflow_template_id_fkey FOREIGN KEY (workflow_template_id) REFERENCES public.workflow_templates(id) ON DELETE SET NULL;


--
-- Name: document_signatures document_signatures_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_signatures
    ADD CONSTRAINT document_signatures_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: document_signatures document_signatures_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_signatures
    ADD CONSTRAINT document_signatures_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: document_signatures document_signatures_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_signatures
    ADD CONSTRAINT document_signatures_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.document_versions(id) ON DELETE SET NULL;


--
-- Name: document_templates document_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: document_templates document_templates_default_workflow_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_default_workflow_template_id_fkey FOREIGN KEY (default_workflow_template_id) REFERENCES public.workflow_templates(id) ON DELETE SET NULL;


--
-- Name: document_templates document_templates_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: document_templates document_templates_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id) ON DELETE CASCADE;


--
-- Name: document_types document_types_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: document_types document_types_default_workflow_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_default_workflow_template_id_fkey FOREIGN KEY (default_workflow_template_id) REFERENCES public.workflow_templates(id) ON DELETE SET NULL;


--
-- Name: document_versions document_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: document_versions document_versions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: documents documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: documents documents_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: documents documents_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id);


--
-- Name: documents documents_registered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: documents documents_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.document_templates(id) ON DELETE SET NULL;


--
-- Name: documents documents_workflow_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_workflow_instance_id_fkey FOREIGN KEY (workflow_instance_id) REFERENCES public.workflow_instances(id) ON DELETE SET NULL;


--
-- Name: document_types fk_document_types_default_template; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT fk_document_types_default_template FOREIGN KEY (default_document_template_id) REFERENCES public.document_templates(id) ON DELETE SET NULL;


--
-- Name: message_attachments message_attachments_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: messages messages_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;


--
-- Name: messages messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notes notes_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: notes notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notification_settings notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: posts posts_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: task_comments task_comments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_comments task_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_templates task_templates_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: task_templates task_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.task_templates(id) ON DELETE SET NULL;


--
-- Name: users users_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: users users_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: workflow_instances workflow_instances_started_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.workflow_instances
    ADD CONSTRAINT workflow_instances_started_by_fkey FOREIGN KEY (started_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: workflow_instances workflow_instances_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.workflow_instances
    ADD CONSTRAINT workflow_instances_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.workflow_templates(id) ON DELETE SET NULL;


--
-- Name: workflow_templates workflow_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.workflow_templates
    ADD CONSTRAINT workflow_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO messenger_user;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_generate_v1() TO messenger_user;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_generate_v1mc() TO messenger_user;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_generate_v3(namespace uuid, name text) TO messenger_user;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_generate_v4() TO messenger_user;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_generate_v5(namespace uuid, name text) TO messenger_user;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_nil() TO messenger_user;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_ns_dns() TO messenger_user;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_ns_oid() TO messenger_user;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_ns_url() TO messenger_user;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_ns_x500() TO messenger_user;


--
-- Name: TABLE notes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notes TO messenger_user;


--
-- Name: SEQUENCE notes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.notes_id_seq TO messenger_user;


--
-- Name: TABLE notification_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notification_settings TO messenger_user;


--
-- Name: SEQUENCE notification_settings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.notification_settings_id_seq TO messenger_user;


--
-- Name: TABLE task_comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.task_comments TO messenger_user;


--
-- Name: SEQUENCE task_comments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.task_comments_id_seq TO messenger_user;


--
-- Name: TABLE task_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.task_templates TO messenger_user;


--
-- Name: SEQUENCE task_templates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.task_templates_id_seq TO messenger_user;


--
-- Name: TABLE tasks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tasks TO messenger_user;


--
-- Name: SEQUENCE tasks_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.tasks_id_seq TO messenger_user;


--
-- PostgreSQL database dump complete
--

\unrestrict flAYtkQTB7XGjmZMXod2wYhygySweZOFTzmyrDbX1qrytQQSllskR6hpFBlV9Ed

