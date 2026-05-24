--
-- PostgreSQL database dump
--

\restrict ZTbdRQDulqg8JaJWFy5eupuUKv6ITwrzaKZIYmxEWtjLTyWmwMqbmif5tcD9bOP

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

ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_role_id_fkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_post_id_fkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_department_id_fkey;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_updated_by_fkey;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.posts DROP CONSTRAINT IF EXISTS posts_department_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_chat_id_fkey;
ALTER TABLE IF EXISTS ONLY public.message_attachments DROP CONSTRAINT IF EXISTS message_attachments_message_id_fkey;
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS departments_parent_department_id_fkey;
ALTER TABLE IF EXISTS ONLY public.contacts DROP CONSTRAINT IF EXISTS contacts_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.contacts DROP CONSTRAINT IF EXISTS contacts_contact_id_fkey;
ALTER TABLE IF EXISTS ONLY public.chats DROP CONSTRAINT IF EXISTS chats_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.chat_participants DROP CONSTRAINT IF EXISTS chat_participants_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.chat_participants DROP CONSTRAINT IF EXISTS chat_participants_chat_id_fkey;
ALTER TABLE IF EXISTS ONLY public.chat_folders DROP CONSTRAINT IF EXISTS chat_folders_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.chat_folder_items DROP CONSTRAINT IF EXISTS chat_folder_items_folder_id_fkey;
ALTER TABLE IF EXISTS ONLY public.chat_folder_items DROP CONSTRAINT IF EXISTS chat_folder_items_chat_id_fkey;
ALTER TABLE IF EXISTS ONLY public.backups DROP CONSTRAINT IF EXISTS backups_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
DROP INDEX IF EXISTS public.idx_users_username;
DROP INDEX IF EXISTS public.idx_users_status;
DROP INDEX IF EXISTS public.idx_users_role;
DROP INDEX IF EXISTS public.idx_users_last_seen;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_system_settings_key;
DROP INDEX IF EXISTS public.idx_sessions_user_id;
DROP INDEX IF EXISTS public.idx_sessions_token;
DROP INDEX IF EXISTS public.idx_sessions_is_current;
DROP INDEX IF EXISTS public.idx_notifications_user_id;
DROP INDEX IF EXISTS public.idx_notifications_is_read;
DROP INDEX IF EXISTS public.idx_notifications_created_at;
DROP INDEX IF EXISTS public.idx_messages_user_id;
DROP INDEX IF EXISTS public.idx_messages_created_at;
DROP INDEX IF EXISTS public.idx_messages_chat_id;
DROP INDEX IF EXISTS public.idx_contacts_user_id;
DROP INDEX IF EXISTS public.idx_chat_participants_user_id;
DROP INDEX IF EXISTS public.idx_chat_participants_last_read;
DROP INDEX IF EXISTS public.idx_chat_participants_chat_id;
DROP INDEX IF EXISTS public.idx_chat_folders_user_id;
DROP INDEX IF EXISTS public.idx_chat_folder_items_folder_id;
DROP INDEX IF EXISTS public.idx_chat_folder_items_chat_id;
DROP INDEX IF EXISTS public.idx_backups_created_at;
DROP INDEX IF EXISTS public.idx_audit_logs_user_id;
DROP INDEX IF EXISTS public.idx_audit_logs_created_at;
DROP INDEX IF EXISTS public.idx_audit_logs_action;
DROP INDEX IF EXISTS public.idx_attachments_message_id;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_tel_num_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_setting_key_key;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_token_key;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE IF EXISTS ONLY public.posts DROP CONSTRAINT IF EXISTS posts_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.message_attachments DROP CONSTRAINT IF EXISTS message_attachments_pkey;
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS departments_pkey;
ALTER TABLE IF EXISTS ONLY public.contacts DROP CONSTRAINT IF EXISTS contacts_pkey;
ALTER TABLE IF EXISTS ONLY public.chats DROP CONSTRAINT IF EXISTS chats_pkey;
ALTER TABLE IF EXISTS ONLY public.chat_participants DROP CONSTRAINT IF EXISTS chat_participants_pkey;
ALTER TABLE IF EXISTS ONLY public.chat_folders DROP CONSTRAINT IF EXISTS chat_folders_pkey;
ALTER TABLE IF EXISTS ONLY public.chat_folder_items DROP CONSTRAINT IF EXISTS chat_folder_items_pkey;
ALTER TABLE IF EXISTS ONLY public.backups DROP CONSTRAINT IF EXISTS backups_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sessions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.posts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.notifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.messages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.message_attachments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.departments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.chats ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.chat_folders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.backups ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.audit_logs ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.system_settings_id_seq;
DROP TABLE IF EXISTS public.system_settings;
DROP SEQUENCE IF EXISTS public.sessions_id_seq;
DROP TABLE IF EXISTS public.sessions;
DROP SEQUENCE IF EXISTS public.roles_id_seq;
DROP TABLE IF EXISTS public.roles;
DROP SEQUENCE IF EXISTS public.posts_id_seq;
DROP TABLE IF EXISTS public.posts;
DROP SEQUENCE IF EXISTS public.notifications_id_seq;
DROP TABLE IF EXISTS public.notifications;
DROP SEQUENCE IF EXISTS public.messages_id_seq;
DROP TABLE IF EXISTS public.messages;
DROP SEQUENCE IF EXISTS public.message_attachments_id_seq;
DROP TABLE IF EXISTS public.message_attachments;
DROP SEQUENCE IF EXISTS public.departments_id_seq;
DROP TABLE IF EXISTS public.departments;
DROP TABLE IF EXISTS public.contacts;
DROP SEQUENCE IF EXISTS public.chats_id_seq;
DROP TABLE IF EXISTS public.chats;
DROP TABLE IF EXISTS public.chat_participants;
DROP SEQUENCE IF EXISTS public.chat_folders_id_seq;
DROP TABLE IF EXISTS public.chat_folders;
DROP TABLE IF EXISTS public.chat_folder_items;
DROP SEQUENCE IF EXISTS public.backups_id_seq;
DROP TABLE IF EXISTS public.backups;
DROP SEQUENCE IF EXISTS public.audit_logs_id_seq;
DROP TABLE IF EXISTS public.audit_logs;
DROP EXTENSION IF EXISTS "uuid-ossp";
--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: backups; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: backups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.backups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: backups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.backups_id_seq OWNED BY public.backups.id;


--
-- Name: chat_folder_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_folder_items (
    folder_id integer NOT NULL,
    chat_id integer NOT NULL,
    added_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: chat_folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_folders (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: chat_folders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_folders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_folders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_folders_id_seq OWNED BY public.chat_folders.id;


--
-- Name: chat_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_participants (
    chat_id integer NOT NULL,
    user_id integer NOT NULL,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_read_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_muted boolean DEFAULT false
);


--
-- Name: TABLE chat_participants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_participants IS 'РЈС‡Р°СЃС‚РЅРёРєРё С‡Р°С‚РѕРІ';


--
-- Name: COLUMN chat_participants.last_read_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chat_participants.last_read_at IS 'Р’СЂРµРјСЏ РїРѕСЃР»РµРґРЅРµРіРѕ РїСЂРѕС‡С‚РµРЅРёСЏ СЃРѕРѕР±С‰РµРЅРёР№ РІ СЌС‚РѕРј С‡Р°С‚Рµ';


--
-- Name: COLUMN chat_participants.is_muted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chat_participants.is_muted IS 'РћС‚РєР»СЋС‡РµРЅС‹ Р»Рё СѓРІРµРґРѕРјР»РµРЅРёСЏ РґР»СЏ СЌС‚РѕРіРѕ С‡Р°С‚Р°';


--
-- Name: chats; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE chats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chats IS 'Р§Р°С‚С‹ (Р»РёС‡РЅС‹Рµ Рё РіСЂСѓРїРїРѕРІС‹Рµ)';


--
-- Name: COLUMN chats.is_group; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chats.is_group IS 'true - РіСЂСѓРїРїРѕРІРѕР№ С‡Р°С‚, false - Р»РёС‡РЅС‹Р№ РґРёР°Р»РѕРі';


--
-- Name: chats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chats_id_seq OWNED BY public.chats.id;


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contacts (
    user_id integer NOT NULL,
    contact_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE departments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.departments IS 'РџРѕРґСЂР°Р·РґРµР»РµРЅРёСЏ РѕСЂРіР°РЅРёР·Р°С†РёРё';


--
-- Name: COLUMN departments.parent_department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.parent_department_id IS 'РЎСЃС‹Р»РєР° РЅР° СЂРѕРґРёС‚РµР»СЊСЃРєРѕРµ РїРѕРґСЂР°Р·РґРµР»РµРЅРёРµ (РґР»СЏ РёРµСЂР°СЂС…РёРё)';


--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: message_attachments; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE message_attachments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.message_attachments IS 'Р¤Р°Р№Р»С‹, РїСЂРёРєСЂРµРїР»РµРЅРЅС‹Рµ Рє СЃРѕРѕР±С‰РµРЅРёСЏРј';


--
-- Name: COLUMN message_attachments.file_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.message_attachments.file_type IS 'РўРёРї: image, document, video, audio';


--
-- Name: message_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.message_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: message_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.message_attachments_id_seq OWNED BY public.message_attachments.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
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
    deleted_at timestamp with time zone
);


--
-- Name: TABLE messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.messages IS 'РЎРѕРѕР±С‰РµРЅРёСЏ РІ С‡Р°С‚Р°С…';


--
-- Name: COLUMN messages.is_edited; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.is_edited IS 'Р‘С‹Р»Рѕ Р»Рё РѕС‚СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРѕ';


--
-- Name: COLUMN messages.is_deleted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.is_deleted IS 'РЈРґР°Р»РµРЅРѕ (soft delete)';


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    content text,
    data jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notifications IS 'РЈРІРµРґРѕРјР»РµРЅРёСЏ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№';


--
-- Name: COLUMN notifications.data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.data IS 'Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Рµ РґР°РЅРЅС‹Рµ РІ JSON (chat_id, message_id, Рё С‚.Рґ.)';


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    department_id integer,
    name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE posts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.posts IS 'Р”РѕР»Р¶РЅРѕСЃС‚Рё СЃРѕС‚СЂСѓРґРЅРёРєРѕРІ';


--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.roles IS 'Р РѕР»Рё РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ СЃ РїСЂР°РІР°РјРё РґРѕСЃС‚СѓРїР°';


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
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
    expires_at timestamp with time zone
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sessions IS 'РђРєС‚РёРІРЅС‹Рµ СЃРµСЃСЃРёРё РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№';


--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'РџРѕР»СЊР·РѕРІР°С‚РµР»Рё СЃРёСЃС‚РµРјС‹';


--
-- Name: COLUMN users.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.status IS 'РЎС‚Р°С‚СѓСЃ: active - Р°РєС‚РёРІРµРЅ, inactive - РЅРµР°РєС‚РёРІРµРЅ, blocked - Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ';


--
-- Name: COLUMN users.last_seen_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.last_seen_at IS 'Р’СЂРµРјСЏ РїРѕСЃР»РµРґРЅРµР№ Р°РєС‚РёРІРЅРѕСЃС‚Рё (РґР»СЏ РѕРїСЂРµРґРµР»РµРЅРёСЏ РѕРЅР»Р°Р№РЅ)';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: backups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backups ALTER COLUMN id SET DEFAULT nextval('public.backups_id_seq'::regclass);


--
-- Name: chat_folders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_folders ALTER COLUMN id SET DEFAULT nextval('public.chat_folders_id_seq'::regclass);


--
-- Name: chats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats ALTER COLUMN id SET DEFAULT nextval('public.chats_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: message_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_attachments ALTER COLUMN id SET DEFAULT nextval('public.message_attachments_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: backups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.backups (id, filename, filepath, size_bytes, type, created_by, created_at, status) FROM stdin;
2	backup_2026-05-22T13-55-14.sql	D:\\Учёба\\КИС\\KIS_backend\\backups\\backup_2026-05-22T13-55-14.sql	44671	full	12	2026-05-22 20:55:17.410076+07	completed
\.


--
-- Data for Name: chat_folder_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chat_folder_items (folder_id, chat_id, added_at) FROM stdin;
\.


--
-- Data for Name: chat_folders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chat_folders (id, user_id, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: chat_participants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chat_participants (chat_id, user_id, joined_at, last_read_at, is_muted) FROM stdin;
\.


--
-- Data for Name: chats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chats (id, name, is_group, avatar_uri, created_by, created_at, last_message_at) FROM stdin;
\.


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contacts (user_id, contact_id, created_at) FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.departments (id, name, parent_department_id, manager_id, code, manager_position, description, email, phone, location, created_at) FROM stdin;
7	Администрирование	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-22 17:59:40.128558+07
\.


--
-- Data for Name: message_attachments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_attachments (id, message_id, file_uri, file_name, file_size, file_type, mime_type, uploaded_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, chat_id, user_id, content, created_at, updated_at, is_edited, is_deleted, deleted_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, content, data, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.posts (id, department_id, name, created_at) FROM stdin;
10	\N	Супер-администратор	2026-05-22 17:59:40.123607+07
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, name, permissions, created_at) FROM stdin;
1	admin	{"all": true}	2026-05-21 13:09:11.798485+07
2	user	{"chats": {"create": true, "delete_own_messages": true}, "contacts": {"add": true}}	2026-05-21 13:09:11.798485+07
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (id, user_id, token, device, application, location, ip_address, user_agent, is_current, started_at, last_activity, expires_at) FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_settings (id, setting_key, setting_value, setting_type, description, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, surname, name, patronymic, birthday, post_id, department_id, email, tel_num, password_hash, status, role_id, avatar_uri, last_seen_at, created_at, settings, start_date, deleted_at, is_super_admin) FROM stdin;
12	admin	Системный	Администратор		\N	10	7	admin@company.ru	+79000000001	$2b$10$wS2D7203S9iTd3QLwiVF.eTDsoZ7V381sRbJeEA2JBtAQZ/4MHw9y	active	1	\N	2026-05-24 10:37:08.379956+07	2026-05-22 17:59:40.252276+07	{}	\N	\N	t
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, true);


--
-- Name: backups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.backups_id_seq', 2, true);


--
-- Name: chat_folders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.chat_folders_id_seq', 9, true);


--
-- Name: chats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.chats_id_seq', 4, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.departments_id_seq', 7, true);


--
-- Name: message_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.message_attachments_id_seq', 19, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 65, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 15, true);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.posts_id_seq', 10, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_seq', 3, true);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sessions_id_seq', 1, false);


--
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 12, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 12, true);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: backups backups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_pkey PRIMARY KEY (id);


--
-- Name: chat_folder_items chat_folder_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_folder_items
    ADD CONSTRAINT chat_folder_items_pkey PRIMARY KEY (folder_id, chat_id);


--
-- Name: chat_folders chat_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_folders
    ADD CONSTRAINT chat_folders_pkey PRIMARY KEY (id);


--
-- Name: chat_participants chat_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_pkey PRIMARY KEY (chat_id, user_id);


--
-- Name: chats chats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (user_id, contact_id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: message_attachments message_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_key UNIQUE (token);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_tel_num_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tel_num_key UNIQUE (tel_num);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_attachments_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachments_message_id ON public.message_attachments USING btree (message_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_backups_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backups_created_at ON public.backups USING btree (created_at DESC);


--
-- Name: idx_chat_folder_items_chat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_folder_items_chat_id ON public.chat_folder_items USING btree (chat_id);


--
-- Name: idx_chat_folder_items_folder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_folder_items_folder_id ON public.chat_folder_items USING btree (folder_id);


--
-- Name: idx_chat_folders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_folders_user_id ON public.chat_folders USING btree (user_id);


--
-- Name: idx_chat_participants_chat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_participants_chat_id ON public.chat_participants USING btree (chat_id);


--
-- Name: idx_chat_participants_last_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_participants_last_read ON public.chat_participants USING btree (last_read_at);


--
-- Name: idx_chat_participants_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_participants_user_id ON public.chat_participants USING btree (user_id);


--
-- Name: idx_contacts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_user_id ON public.contacts USING btree (user_id);


--
-- Name: idx_messages_chat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_chat_id ON public.messages USING btree (chat_id) WHERE (is_deleted = false);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- Name: idx_messages_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_user_id ON public.messages USING btree (user_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read) WHERE (is_read = false);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_sessions_is_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_is_current ON public.sessions USING btree (is_current) WHERE (is_current = true);


--
-- Name: idx_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_token ON public.sessions USING btree (token);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: idx_system_settings_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_settings_key ON public.system_settings USING btree (setting_key);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_last_seen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_last_seen ON public.users USING btree (last_seen_at);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role_id);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username) WHERE (deleted_at IS NULL);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: backups backups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: chat_folder_items chat_folder_items_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_folder_items
    ADD CONSTRAINT chat_folder_items_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;


--
-- Name: chat_folder_items chat_folder_items_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_folder_items
    ADD CONSTRAINT chat_folder_items_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.chat_folders(id) ON DELETE CASCADE;


--
-- Name: chat_folders chat_folders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_folders
    ADD CONSTRAINT chat_folders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_participants chat_participants_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;


--
-- Name: chat_participants chat_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chats chats_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: contacts contacts_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: contacts contacts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: departments departments_parent_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_parent_department_id_fkey FOREIGN KEY (parent_department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: message_attachments message_attachments_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: messages messages_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;


--
-- Name: messages messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: posts posts_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: users users_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: users users_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--

\unrestrict ZTbdRQDulqg8JaJWFy5eupuUKv6ITwrzaKZIYmxEWtjLTyWmwMqbmif5tcD9bOP

