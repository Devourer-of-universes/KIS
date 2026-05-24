--
-- PostgreSQL database dump
--

\restrict QTnKJegxKqzM6ZPUdcBcSgH0os4RcqEkzBKH3y0JJUjETpKdJbvXozL3qJ5n6fM

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
-- Name: departments; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    parent_department_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    manager_id integer,
    code character varying(50),
    manager_position character varying(100),
    description text,
    email character varying(100),
    phone character varying(20),
    location character varying(200)
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
    deleted_at timestamp with time zone
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
-- Name: notifications; Type: TABLE; Schema: public; Owner: messenger_user
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
    expires_at timestamp with time zone
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
-- Name: users; Type: TABLE; Schema: public; Owner: messenger_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    surname character varying(50) NOT NULL,
    name character varying(50) NOT NULL,
    patronymic character varying(50),
    birthday date NOT NULL,
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
    deleted_at timestamp with time zone,
    start_date date,
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'away'::character varying, 'offline'::character varying, 'blocked'::character varying])::text[])))
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
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: message_attachments id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.message_attachments ALTER COLUMN id SET DEFAULT nextval('public.message_attachments_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


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
-- Name: users id; Type: DEFAULT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.audit_logs (id, user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent, created_at) FROM stdin;
1	6	UPDATE settings	system	\N	\N	{"org_name": "ООО Тест", "log_level": "error", "org_email": "info@company.ru", "org_phone": "+7 (495) 000-00-00", "enable_2fa": false, "backup_time": "02:00", "notify_email": "admin@company.ru", "storage_path": "./uploads", "max_file_size": 50, "auto_numbering": "auto", "backup_schedule": "daily", "session_timeout": 480, "auto_archive_days": 365, "notify_suspicious": true, "allowed_file_types": [], "log_retention_days": 90, "password_min_length": 6, "backup_retention_days": 30, "notify_critical_errors": true, "password_require_special": true}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-21 09:52:34.212652+07
\.


--
-- Data for Name: backups; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.backups (id, filename, filepath, size_bytes, type, created_by, created_at, status) FROM stdin;
\.


--
-- Data for Name: chat_folder_items; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.chat_folder_items (folder_id, chat_id, added_at) FROM stdin;
6	4	2026-04-19 14:52:46.603701+07
7	3	2026-04-19 14:53:27.269285+07
8	4	2026-04-20 13:51:25.386372+07
\.


--
-- Data for Name: chat_folders; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.chat_folders (id, user_id, name, created_at, updated_at) FROM stdin;
6	6	gggh	2026-04-19 14:38:30.726799+07	2026-04-19 14:38:37.915646+07
7	6	private	2026-04-19 14:53:20.946224+07	2026-04-19 14:53:20.946224+07
8	6	123456	2026-04-20 13:51:16.431691+07	2026-04-20 13:51:16.431691+07
\.


--
-- Data for Name: chat_participants; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.chat_participants (chat_id, user_id, joined_at, last_read_at, is_muted) FROM stdin;
1	1	2026-04-02 10:23:16.513769+07	2026-04-02 10:23:16.513769+07	f
1	2	2026-04-02 10:23:16.513769+07	2026-04-02 10:23:16.513769+07	f
2	2	2026-04-02 10:23:16.513769+07	2026-04-02 10:23:16.513769+07	f
2	3	2026-04-02 10:23:16.513769+07	2026-04-02 10:23:16.513769+07	f
2	4	2026-04-02 10:23:16.513769+07	2026-04-02 10:23:16.513769+07	f
3	2	2026-04-09 17:03:35.407999+07	2026-04-09 17:03:35.407999+07	f
4	1	2026-04-09 17:04:06.039932+07	2026-04-09 17:04:06.039932+07	f
4	2	2026-04-09 17:04:06.043241+07	2026-04-09 17:04:06.043241+07	f
4	5	2026-04-09 17:04:06.044015+07	2026-04-09 17:04:06.044015+07	f
4	3	2026-04-09 17:04:06.044842+07	2026-04-09 17:04:06.044842+07	f
4	4	2026-04-09 17:04:06.045599+07	2026-04-09 17:04:06.045599+07	f
4	6	2026-04-09 17:04:06.046071+07	2026-05-16 09:04:57.10283+07	f
3	6	2026-04-09 17:03:35.407999+07	2026-05-16 09:04:59.326766+07	f
\.


--
-- Data for Name: chats; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.chats (id, name, is_group, avatar_uri, created_by, created_at, last_message_at) FROM stdin;
1	\N	f	\N	1	2026-04-02 10:23:16.513769+07	2026-04-02 10:23:16.513769+07
2	Developers	t	\N	3	2026-04-02 10:23:16.513769+07	2026-04-02 10:23:16.513769+07
4	1234	t	\N	6	2026-04-09 17:04:06.037094+07	2026-04-20 13:52:36.139153+07
3	\N	f	\N	6	2026-04-09 17:03:35.397566+07	2026-05-16 09:03:04.611532+07
\.


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.contacts (user_id, contact_id, created_at) FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.departments (id, name, parent_department_id, created_at, manager_id, code, manager_position, description, email, phone, location) FROM stdin;
5	ООО Тест	\N	2026-05-04 11:18:41.260387+07	4	0001	Генеральный директор		test@testmail.ru	88000000000	ул. Тестовая, д. 1
\.


--
-- Data for Name: message_attachments; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.message_attachments (id, message_id, file_uri, file_name, file_size, file_type, mime_type, uploaded_at) FROM stdin;
2	28	/uploads/chat-files/1776158464564-648322259.png	Ð¢Ð¢ ÐÐ»Ð°Ð²Ð½Ð°Ñ.png	47714	image	image/png	2026-04-14 16:21:04.572237+07
4	30	/uploads/chat-files/1776168584020-759929090.docx	Ð¡ÑÐ°ÑÑÑ ÐÐÐ¡.docx	33101	document	application/vnd.openxmlformats-officedocument.wordprocessingml.document	2026-04-14 19:09:44.026488+07
5	31	/uploads/chat-files/1776170980434-49862898.pptx	Presentation 1.pptx	5034290	document	application/vnd.openxmlformats-officedocument.presentationml.presentation	2026-04-14 19:49:40.48161+07
8	35	/uploads/chat-files/1776171969684-469753121.png	ТТ Чат (2).png	29977	image	image/png	2026-04-14 20:06:09.695188+07
9	42	/uploads/chat-files/1776334829962-61751566.png	ТТ Чат (2).png	29977	image	image/png	2026-04-16 17:20:29.981826+07
10	43	/uploads/chat-files/1776334853046-359792789.png	ТТ Чат (2).png	29977	image	image/png	2026-04-16 17:20:53.060509+07
11	45	/uploads/chat-files/1776339640182-648686629.png	ТТ Чат (2).png	29977	image	image/png	2026-04-16 18:40:40.194843+07
13	47	/uploads/chat-files/1776339675906-62435580.png	ТТ Чат (2).png	29977	image	image/png	2026-04-16 18:41:15.916828+07
14	49	/uploads/chat-files/1776339692018-719395103.png	Главная (2).png	39422	image	image/png	2026-04-16 18:41:32.025353+07
15	52	/uploads/chat-files/1776340650517-44041122.png	ТТ Чат (2).png	29977	image	image/png	2026-04-16 18:57:30.52893+07
16	54	/uploads/chat-files/1776588093947-44955438.pptx	Presentation 1 (2).pptx	5034290	document	application/vnd.openxmlformats-officedocument.presentationml.presentation	2026-04-19 15:41:33.966676+07
17	56	/uploads/chat-files/1776588103409-533789163.pptx	Presentation 1 (1).pptx	5034290	document	application/vnd.openxmlformats-officedocument.presentationml.presentation	2026-04-19 15:41:43.44603+07
18	59	/uploads/chat-files/1776667937402-958560217.pptx	Presentation 1 (1).pptx	5034290	document	application/vnd.openxmlformats-officedocument.presentationml.presentation	2026-04-20 13:52:17.559558+07
19	61	/uploads/chat-files/1776667956028-996924779.pptx	Presentation 1 (1) (2).pptx	5034290	document	application/vnd.openxmlformats-officedocument.presentationml.presentation	2026-04-20 13:52:36.132308+07
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.messages (id, chat_id, user_id, content, created_at, updated_at, is_edited, is_deleted, deleted_at) FROM stdin;
1	1	1	Hello Maria! How are you?	2026-04-02 08:23:16.513769+07	\N	f	f	\N
2	1	2	Hi Ivan! All good, working on new project	2026-04-02 09:23:16.513769+07	\N	f	f	\N
3	2	2	Good morning everyone!	2026-04-02 07:23:16.513769+07	\N	f	f	\N
4	2	3	Good morning!	2026-04-02 07:53:16.513769+07	\N	f	f	\N
5	2	4	Hello everyone!	2026-04-02 08:23:16.513769+07	\N	f	f	\N
6	4	6	fffff	2026-04-09 17:16:17.075183+07	\N	f	f	\N
7	4	6	ffff	2026-04-09 17:17:11.897619+07	\N	f	f	\N
8	4	6	aaaaa	2026-04-09 17:17:15.8807+07	\N	f	f	\N
9	4	6	привет!	2026-04-09 17:17:30.631038+07	\N	f	f	\N
10	3	6	абуба	2026-04-09 17:17:41.408532+07	\N	f	f	\N
11	3	6	ааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааа	2026-04-09 17:20:22.435017+07	\N	f	f	\N
12	3	6	ggg	2026-04-12 10:12:59.570399+07	\N	f	f	\N
13	3	6	ffff	2026-04-12 10:15:05.857278+07	\N	f	f	\N
14	4	6	dddd	2026-04-12 10:15:11.13664+07	\N	f	f	\N
16	3	6	dddd	2026-04-12 10:17:07.647012+07	\N	f	f	\N
17	3	6	ааа	2026-04-12 11:06:00.807037+07	\N	f	f	\N
20	3	6	fff	2026-04-12 14:29:38.030046+07	\N	f	f	\N
21	3	6	sdbnbjksfbkjsjkm	2026-04-13 11:06:53.476598+07	\N	f	f	\N
22	3	6	fffff	2026-04-13 12:00:39.778859+07	\N	f	f	\N
31	3	6	📎 Presentation 1.pptx	2026-04-14 19:49:40.477245+07	\N	f	f	\N
34	3	6	https://cyberleninka.ru/	2026-04-14 20:01:29.126211+07	\N	f	f	\N
25	4	6	📷 *изображение*\ndata:image/png;base64,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	2026-04-13 15:03:23.373998+07	\N	f	t	2026-04-15 16:15:41.087897+07
32	3	6	📷 Изображение	2026-04-14 19:49:58.157755+07	\N	f	t	2026-04-19 11:09:59.129316+07
35	4	6	📷 Изображение\n/uploads/chat-files/1776171969684-469753121.png	2026-04-14 20:06:09.691503+07	\N	f	t	2026-04-15 16:21:22.860902+07
28	4	6	📷 Изображение	2026-04-14 16:21:04.569074+07	\N	f	t	2026-04-15 16:21:42.189879+07
37	4	6	ааааffff	2026-04-16 15:45:05.17723+07	\N	f	t	2026-04-16 15:45:34.072106+07
27	3	6	📷 Изображение	2026-04-14 16:17:11.56298+07	\N	f	t	2026-04-19 11:10:02.93933+07
36	4	6	ааааfffffffffff	2026-04-15 15:52:33.61751+07	2026-04-16 16:27:22.623021+07	t	t	2026-04-16 16:27:28.112941+07
38	4	6	ааааffffg	2026-04-16 16:00:18.18372+07	\N	f	t	2026-04-16 16:27:36.75887+07
39	4	6	ddd	2026-04-16 16:41:27.750272+07	\N	f	t	2026-04-16 16:41:50.191303+07
24	4	6	/	2026-04-13 14:53:19.266117+07	\N	f	t	2026-04-16 16:43:13.971246+07
15	4	6	fffff	2026-04-12 10:17:03.504206+07	\N	f	t	2026-04-16 16:43:19.873395+07
40	4	6	cool	2026-04-16 16:55:06.216272+07	\N	f	f	\N
41	4	6	This messenger is good	2026-04-16 16:55:58.641925+07	\N	f	f	\N
30	3	6	📎 Ð¡ÑÐ°ÑÑÑ ÐÐÐ¡.docx	2026-04-14 19:09:44.0228+07	\N	f	t	2026-04-16 17:03:58.835705+07
42	4	6	📷 Изображение\n/uploads/chat-files/1776334829962-61751566.png	2026-04-16 17:20:29.977718+07	\N	f	t	2026-04-16 17:20:42.598646+07
44	4	6	ff	2026-04-16 17:21:01.206818+07	\N	f	f	\N
43	4	6	📷 Изображение\n/uploads/chat-files/1776334853046-359792789.png	2026-04-16 17:20:53.056641+07	\N	f	t	2026-04-16 18:40:15.178336+07
45	4	6	📷 Изображение\n/uploads/chat-files/1776339640182-648686629.png	2026-04-16 18:40:40.190885+07	\N	f	f	\N
48	4	6	.	2026-04-16 18:41:31.93116+07	\N	f	f	\N
49	4	6	📷 Изображение\n/uploads/chat-files/1776339692018-719395103.png	2026-04-16 18:41:32.023979+07	\N	f	t	2026-04-16 18:56:45.464946+07
50	4	6	/	2026-04-16 18:57:21.753919+07	\N	f	f	\N
51	4	6	dssdaad	2026-04-16 18:57:30.467305+07	\N	f	f	\N
52	4	6	📷 Изображение\n/uploads/chat-files/1776340650517-44041122.png	2026-04-16 18:57:30.526921+07	\N	f	t	2026-04-16 18:59:22.335238+07
47	4	6	📷 Изображение\n/uploads/chat-files/1776339675906-62435580.png	2026-04-16 18:41:15.913455+07	\N	f	t	2026-04-16 18:59:26.114534+07
46	4	6	📷 Изображение\n/uploads/chat-files/1776339640211-201329576.png	2026-04-16 18:40:40.217656+07	\N	f	t	2026-04-19 11:09:21.827296+07
26	3	6	📷 *изображение*\ndata:image/png;base64,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IAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgcAEAQBA4AIAgCBwAQBIEDAAiCwAEABEHgAACCIHAAAEEQOACAIAgc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	2026-04-14 15:51:17.82541+07	\N	f	t	2026-04-19 11:09:49.812886+07
33	3	6	📷 Изображение\n/uploads/chat-files/1776171684538-886816893.png	2026-04-14 20:01:24.548854+07	\N	f	t	2026-04-19 11:09:54.128207+07
19	3	6	📷 *изображение*\ndata:image/png;base64,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fW6mwffijCeWzYo+XzNdR3BKBw3gTgMAWBwkDuMv608gjCbERvh6UNa9ViksmoABAIDFQSIhN1jteTOr17iJs9/biNik6e0c169ijFRe2gbRAQBYHNKXrB1xShq5NltyUqiEZuy0N7iJZOvs1myY9UAW7/QtnFF2q/X2O8LN7bl/7j7du69yHV6HDQBDSnftOrfyNX/neolrrHfb5el7c/QqA1tdOp27I5FJhEmTR8cU+rzb4ObzsLRNBr39j3RzB52Qu0/3/uucQ3AAYMiR8HTXntNXpFk/DGwezlJ7NcH4d//edbY95gAAoD1Kv/ETAADAqPPamsprqSE+AABQJ3q5suAwFwcAAOoYH5UW71wykz9XrXHRUsxsJ0INAGBAVA4aWAoutZmT/kv0++4d33VjP/2eAwCAfOrowrJ842d344+ioc+dR+92AABQjK8LZUWnskttKZBO7iQsGgCgL2xpm7JUWkuNpW0AAEBID6qO6Veeh0OUGgAADCxKjdWih59bb73Vbd++3Z1wQnzpHr0R86lPfao78sgj3TCjdy5dd9117uGHH07/1rs29DK1Yc/3qPDEE0+4q666yq1du3aXe8Xq/v7770//t3322GOPwnR1zC233JKmL4466qjoNbPz65NrO9rUMT4qWThYN8PLfffdl/mqXr2mWIKkfYYZdUJ6D706PXVGBx10UPq9xPI73/mOg/5Qvap+dS+E94rVvd6aqteBq+7195e//OVUiPLQ/WX76TgJlK6Zzhc7hz61n65xbD8YPRqNUlsqq0UvR9S41SGMAuq0dH+dffbZbs8995z/XtaOflNHduKJJzqoju4BdewvfOEL3fXXXx/9XXX/8pe/3K1cuTL9TpbHZz/72VSczArR/aTrIVHyj9V18a+Nrp++960oiYuuoc5h6FzaTxaRBAhGh4FHqY160MD4DV91TtsyQU+c6qjVWZirw/jBD36QdhxGlntDT8N60n3kkUfSziJ0lSgdHet3NkpX36tzU8ejfKjTsqffGDrP448/7l796lcvEBthrh11mP555MbRd1l5U5py8/iogzvjjDPSv1UnOl550/HqRGMdnzrKsP6Up+c///nO6vkb3/hG+r++N9Sxq0y2n1+fvtXgp1WGMD9lXFMqn+pW5Y8JzvHHH++e85znzIuN0HXQpjL451a966FA+VY5JCD77rvv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	2026-04-12 12:57:31.375347+07	\N	f	t	2026-04-19 11:10:05.69564+07
53	4	6	f	2026-04-19 11:18:42.767503+07	\N	f	f	\N
29	3	6	📎 ÐÐ¾ÑÐ¿Ð¾ÑÐ°Ñ (3).zip	2026-04-14 19:09:01.009312+07	\N	f	t	2026-04-19 11:32:32.323129+07
18	3	6	📎 *файл*: КИС ЦРП.pptx	2026-04-12 12:50:50.535929+07	\N	f	t	2026-04-19 11:32:43.32989+07
54	4	6	📎 Presentation 1 (2).pptx	2026-04-19 15:41:33.964397+07	\N	f	f	\N
55	4	6	gg	2026-04-19 15:41:43.386671+07	\N	f	f	\N
56	4	6	📎 Presentation 1 (1).pptx	2026-04-19 15:41:43.445364+07	\N	f	f	\N
57	4	6	dhdhhsdhsd	2026-04-20 10:00:03.390587+07	\N	f	f	\N
58	4	6	Hello!	2026-04-20 13:51:48.079379+07	\N	f	f	\N
59	4	6	📎 Presentation 1 (1).pptx\n/uploads/chat-files/1776667937402-958560217.pptx	2026-04-20 13:52:17.552535+07	\N	f	f	\N
60	4	6	P1	2026-04-20 13:52:35.812106+07	\N	f	f	\N
61	4	6	📎 Presentation 1 (1) (2).pptx\n/uploads/chat-files/1776667956028-996924779.pptx	2026-04-20 13:52:36.126969+07	\N	f	f	\N
62	3	6	Привет!	2026-04-20 14:29:55.907311+07	\N	f	f	\N
63	3	6	Привет!	2026-04-20 14:29:55.915769+07	\N	f	f	\N
23	3	6	📎 *файл*: Статья КИС.docx	2026-04-13 14:32:12.597974+07	\N	f	t	2026-04-26 10:30:01.096169+07
64	3	6	ывчаспмрьптпиаыв	2026-05-16 09:02:57.002147+07	\N	f	f	\N
65	3	6	рпгппг	2026-05-16 09:03:04.610313+07	\N	f	f	\N
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.notifications (id, user_id, type, title, content, data, is_read, created_at) FROM stdin;
1	1	deleted_message	Сообщение удалено	Пользователь удалил сообщение	{"chatId": 4, "deletedBy": 6, "messageId": "25", "originalContent": "📷 *изображение*\\ndata:image/png;base64,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"}	f	2026-04-15 16:15:41.090573+07
2	1	deleted_message	Сообщение удалено	Пользователь удалил сообщение	{"chatId": 4, "deletedBy": 6, "messageId": "35", "originalContent": "📷 Изображение\\n/uploads/chat-files/1776171969684-469753121.png"}	f	2026-04-15 16:21:22.862282+07
3	1	deleted_message	Сообщение удалено	Пользователь удалил сообщение	{"chatId": 4, "deletedBy": 6, "messageId": "28", "originalContent": "📷 Изображение"}	f	2026-04-15 16:21:42.191543+07
4	1	deleted_message	Сообщение удалено	Пользователь удалил сообщение	{"chatId": 4, "deletedBy": 6, "messageId": "37", "originalContent": "ааааffff"}	f	2026-04-16 15:45:34.07397+07
5	1	deleted_message	Сообщение удалено	Пользователь удалил сообщение	{"chatId": 4, "deletedBy": 6, "messageId": "36", "originalContent": "ааааfffffffffff"}	f	2026-04-16 16:27:28.115227+07
6	1	deleted_message	Сообщение удалено	Пользователь удалил сообщение	{"chatId": 4, "deletedBy": 6, "messageId": "38", "originalContent": "ааааffffg"}	f	2026-04-16 16:27:36.760727+07
7	1	deleted_message	Сообщение удалено	Пользователь удалил сообщение	{"chatId": 4, "deletedBy": 6, "messageId": "39", "originalContent": "ddd"}	f	2026-04-16 16:41:50.193569+07
8	1	deleted_message	Сообщение удалено	Пользователь удалил сообщение	{"chatId": 4, "deletedBy": 6, "messageId": "24", "originalContent": "/"}	f	2026-04-16 16:43:13.973026+07
9	1	deleted_message	Сообщение удалено	Пользователь удалил сообщение	{"chatId": 4, "deletedBy": 6, "messageId": "15", "originalContent": "fffff"}	f	2026-04-16 16:43:19.874722+07
10	1	deleted_message	Сообщение удалено	Пользователь удалил сообщение	{"chatId": 3, "deletedBy": 6, "messageId": "30", "originalContent": "📎 Ð¡ÑÐ°ÑÑÑ ÐÐÐ¡.docx"}	f	2026-04-16 17:03:58.83716+07
11	1	deleted_message	Сообщение удалено	Пользователь удалил сообщение	{"chatId": 4, "deletedBy": 6, "messageId": "42", "originalContent": "📷 Изображение\\n/uploads/chat-files/1776334829962-61751566.png"}	f	2026-04-16 17:20:42.600509+07
12	1	deleted_message	Сообщение удалено	Пользователь удалил сообщение	{"chatId": 4, "deletedBy": 6, "messageId": "43", "originalContent": "📷 Изображение\\n/uploads/chat-files/1776334853046-359792789.png"}	f	2026-04-16 18:40:15.18064+07
13	1	deleted_message	Сообщение удалено	Пользователь удалил сообщение	{"chatId": 4, "deletedBy": 6, "messageId": "49", "originalContent": "📷 Изображение\\n/uploads/chat-files/1776339692018-719395103.png"}	f	2026-04-16 18:56:45.467303+07
14	1	deleted_message	Сообщение удалено	Пользователь удалил сообщение	{"chatId": 4, "deletedBy": 6, "messageId": "52", "originalContent": "📷 Изображение\\n/uploads/chat-files/1776340650517-44041122.png"}	f	2026-04-16 18:59:22.337557+07
15	1	deleted_message	Сообщение удалено	Пользователь удалил сообщение	{"chatId": 4, "deletedBy": 6, "messageId": "47", "originalContent": "📷 Изображение\\n/uploads/chat-files/1776339675906-62435580.png"}	f	2026-04-16 18:59:26.116509+07
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.posts (id, department_id, name, created_at) FROM stdin;
7	5	Рядовой	2026-05-11 10:59:59.484507+07
8	5	Руководитель отдела	2026-05-12 09:18:33.57288+07
9	5	Генеральный директор	2026-05-12 09:35:37.282612+07
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.roles (id, name, permissions, created_at) FROM stdin;
1	admin	{"all": true}	2026-04-02 10:23:16.513769+07
2	user	{"chats": {"create": true, "delete_own_messages": true}, "contacts": {"add": true}}	2026-04-02 10:23:16.513769+07
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.sessions (id, user_id, token, device, application, location, ip_address, user_agent, is_current, started_at, last_activity, expires_at) FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.system_settings (id, setting_key, setting_value, setting_type, description, updated_at, updated_by) FROM stdin;
2	org_logo		string	Џгвм Є «®Ј®вЁЇг	2026-05-18 14:22:45.509469+07	\N
10	backup_enabled	false	boolean	‚Є«озЁвм аҐ§Ґаў­®Ґ Є®ЇЁа®ў ­ЁҐ	2026-05-18 14:22:45.509469+07	\N
1	org_name	ООО Тест	string	Ќ §ў ­ЁҐ ®аЈ ­Ё§ жЁЁ	2026-05-21 09:52:34.180824+07	6
3	org_email	info@company.ru	string	Љ®­в Єв­л© email	2026-05-21 09:52:34.190571+07	6
4	org_phone	+7 (495) 000-00-00	string	Љ®­в Єв­л© вҐ«Ґд®­	2026-05-21 09:52:34.192128+07	6
5	session_timeout	480	number	‚аҐ¬п ¦Ё§­Ё бҐббЁЁ ў ¬Ё­гв е (8 з б®ў)	2026-05-21 09:52:34.197753+07	6
6	password_min_length	6	number	ЊЁ­Ё¬ «м­ п ¤«Ё­  Ї а®«п	2026-05-21 09:52:34.199537+07	6
7	password_require_special	true	boolean	’аҐЎ®ў вм бЇҐжбЁ¬ў®«л ў Ї а®«Ґ	2026-05-21 09:52:34.200774+07	6
8	enable_2fa	false	boolean	‚Є«озЁвм ¤ўгед Єв®а­го  гвҐ­вЁдЁЄ жЁо	2026-05-21 09:52:34.201967+07	6
11	backup_schedule	daily	string	ђ бЇЁб ­ЁҐ ЎнЄ Ї®ў (daily/weekly/monthly)	2026-05-21 09:52:34.203252+07	6
12	backup_time	02:00	string	‚аҐ¬п б®§¤ ­Ёп ЎнЄ Ї 	2026-05-21 09:52:34.204298+07	6
9	notify_email	admin@company.ru	string	Email ¤«п гўҐ¤®¬«Ґ­Ё©	2026-05-21 09:52:34.20619+07	6
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: messenger_user
--

COPY public.users (id, username, surname, name, patronymic, birthday, post_id, department_id, email, tel_num, password_hash, status, role_id, avatar_uri, last_seen_at, created_at, settings, deleted_at, start_date) FROM stdin;
6	testuser2	Тестов	Тест	Тестович	1990-01-01	7	5	test2@example.com	+79009999999	$2b$10$5DCEVBUEJAzU1Yc1tnMqZ..t1YAqhk1tJZrJz9SdQRxwD3GFeDNBW	active	2	\N	2026-05-21 10:11:04.017843+07	2026-04-05 13:54:03.195181+07	{}	\N	\N
2	ivanov.i	Ivanov	Ivan	Ivanovich	1990-01-15	7	5	ivanov@company.ru	+79001234567	$2a$10$XQ7vH5Yq5V5Q5V5Q5V5QuO5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q	active	1	\N	2026-04-02 10:23:16.513769+07	2026-04-02 10:23:16.513769+07	{}	\N	\N
4	sidorov.a	Sidorov	Alexey	Vladimirovich	1988-07-10	9	5	sidorov@company.ru	+79005556677	$2a$10$XQ7vH5Yq5V5Q5V5Q5V5QuO5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q	active	2	\N	2026-04-02 10:23:16.513769+07	2026-04-02 10:23:16.513769+07	{}	\N	\N
5	kozlova.e	Kozlova	Elena	Vladimirovna	1985-11-25	\N	\N	kozlova@company.ru	+79008889900	$2a$10$XQ7vH5Yq5V5Q5V5Q5V5QuO5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q	active	2	\N	2026-04-02 10:23:16.513769+07	2026-04-02 10:23:16.513769+07	{}	2026-05-03 15:04:16.538213+07	\N
3	petrova.m	Petrova	Maria	Sergeevna	1992-03-20	7	5	petrova@company.ru	+79007654321	$2a$10$XQ7vH5Yq5V5Q5V5Q5V5QuO5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q	active	2	\N	2026-04-02 10:23:16.513769+07	2026-04-02 10:23:16.513769+07	{}	\N	\N
1	admin	Admin	System	Admin	1990-01-01	9	5	admin@company.ru	+79000000001	$2a$10$XQ7vH5Yq5V5Q5V5Q5V5QuO5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q5V5Q	active	1	\N	2026-04-02 10:23:16.513769+07	2026-04-02 10:23:16.513769+07	{}	2026-05-16 09:10:10.791873+07	\N
8	nn.n	nn	nn	nn	2000-01-01	7	5	artem.degterev1101@gmail.com	88000000000	$2b$10$kDOiL/hHCQXdRgpZ5xnpTe9sAigcl1LhLc53iW9ssAajK.KOd49lC	active	1	\N	2026-05-12 17:43:44.300951+07	2026-05-12 17:43:44.300951+07	{}	2026-05-16 08:50:23.074172+07	\N
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, true);


--
-- Name: backups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.backups_id_seq', 1, false);


--
-- Name: chat_folders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.chat_folders_id_seq', 8, true);


--
-- Name: chats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.chats_id_seq', 4, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.departments_id_seq', 6, true);


--
-- Name: message_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.message_attachments_id_seq', 19, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.messages_id_seq', 65, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.notifications_id_seq', 15, true);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.posts_id_seq', 9, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.roles_id_seq', 3, true);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.sessions_id_seq', 1, false);


--
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 12, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: messenger_user
--

SELECT pg_catalog.setval('public.users_id_seq', 8, true);


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
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


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
-- Name: idx_messages_chat_id; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_messages_chat_id ON public.messages USING btree (chat_id) WHERE (is_deleted = false);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- Name: idx_messages_user_id; Type: INDEX; Schema: public; Owner: messenger_user
--

CREATE INDEX idx_messages_user_id ON public.messages USING btree (user_id);


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
-- Name: departments departments_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- Name: departments departments_parent_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: messenger_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_parent_department_id_fkey FOREIGN KEY (parent_department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


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
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO messenger_user;


--
-- PostgreSQL database dump complete
--

\unrestrict QTnKJegxKqzM6ZPUdcBcSgH0os4RcqEkzBKH3y0JJUjETpKdJbvXozL3qJ5n6fM

