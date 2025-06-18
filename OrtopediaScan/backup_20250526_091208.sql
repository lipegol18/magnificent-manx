--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.5

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
-- Name: cid_categories; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.cid_categories AS ENUM (
    'Joelho',
    'Coluna',
    'Ombro',
    'Quadril',
    'Pé e tornozelo',
    'Outros'
);


ALTER TYPE public.cid_categories OWNER TO neondb_owner;

--
-- Name: cid_laterality; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.cid_laterality AS ENUM (
    'esquerdo',
    'direito',
    'bilateral',
    'indeterminado'
);


ALTER TYPE public.cid_laterality OWNER TO neondb_owner;

--
-- Name: cidades_rj; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.cidades_rj AS ENUM (
    'Rio de Janeiro',
    'São Gonçalo',
    'Niterói'
);


ALTER TYPE public.cidades_rj OWNER TO neondb_owner;

--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.notification_type AS ENUM (
    'info',
    'warning',
    'success'
);


ALTER TYPE public.notification_type OWNER TO neondb_owner;

--
-- Name: permission; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.permission AS ENUM (
    'dashboard_view',
    'patients_view',
    'patients_create',
    'patients_edit',
    'patients_delete',
    'hospitals_view',
    'hospitals_create',
    'hospitals_edit',
    'hospitals_delete',
    'orders_view',
    'orders_create',
    'orders_edit',
    'orders_delete',
    'catalog_view',
    'catalog_create',
    'catalog_edit',
    'catalog_delete',
    'reports_view',
    'reports_create',
    'reports_export',
    'users_view',
    'users_create',
    'users_edit',
    'users_delete',
    'roles_view',
    'roles_create',
    'roles_edit',
    'roles_delete',
    'system_settings'
);


ALTER TYPE public.permission OWNER TO neondb_owner;

--
-- Name: procedure_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.procedure_type AS ENUM (
    'internacao',
    'ambulatorial',
    'eletiva',
    'urgencia'
);


ALTER TYPE public.procedure_type OWNER TO neondb_owner;

--
-- Name: uf; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.uf AS ENUM (
    'RJ',
    'SP',
    'MG'
);


ALTER TYPE public.uf OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: medical_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.medical_orders (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    user_id integer NOT NULL,
    hospital_id integer,
    procedure_id integer NOT NULL,
    procedure_date date,
    report_content text,
    clinical_indication text NOT NULL,
    cid_code_id integer,
    procedure_cbhpm_id integer,
    procedure_cbhpm_quantity integer DEFAULT 1,
    secondary_procedure_ids integer[],
    secondary_procedure_quantities integer[],
    opme_item_ids integer[],
    opme_item_quantities integer[],
    procedure_type text,
    medical_report_url text,
    additional_notes text,
    complexity text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    cid_laterality public.cid_laterality,
    procedure_laterality public.cid_laterality,
    secondary_procedure_lateralities text[],
    status_code text DEFAULT 'em_preenchimento'::text NOT NULL,
    exam_images_url text[],
    exam_image_count integer DEFAULT 0,
    clinical_justification text,
    multiple_cid_ids integer[] DEFAULT '{}'::integer[],
    supplier_ids integer[],
    order_pdf_url text
);


ALTER TABLE public.medical_orders OWNER TO neondb_owner;

--
-- Name: COLUMN medical_orders.clinical_justification; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.medical_orders.clinical_justification IS 'Sugestão de justificativa clínica para o procedimento';


--
-- Name: COLUMN medical_orders.multiple_cid_ids; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.medical_orders.multiple_cid_ids IS 'Array de IDs de códigos CID-10 adicionais relacionados ao pedido';


--
-- Name: create_medical_order(integer, integer, integer, integer, date, text, text, integer, text, integer, integer, text, integer[], integer[], text[], integer[], integer[], text, text[], integer, text, text, text, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.create_medical_order(p_patient_id integer, p_user_id integer, p_hospital_id integer, p_procedure_id integer, p_procedure_date date, p_report_content text, p_clinical_indication text, p_cid_code_id integer, p_cid_laterality text, p_procedure_cbhpm_id integer, p_procedure_cbhpm_quantity integer, p_procedure_laterality text, p_secondary_procedure_ids integer[], p_secondary_procedure_quantities integer[], p_secondary_procedure_lateralities text[], p_opme_item_ids integer[], p_opme_item_quantities integer[], p_procedure_type text, p_exam_images_url text[], p_exam_image_count integer, p_medical_report_url text, p_additional_notes text, p_status_code text, p_complexity text) RETURNS SETOF public.medical_orders
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_order_id INTEGER;
    result medical_orders%ROWTYPE;
BEGIN
    INSERT INTO medical_orders (
        patient_id, 
        user_id, 
        hospital_id, 
        procedure_id, 
        procedure_date,
        report_content, 
        clinical_indication, 
        cid_code_id, 
        cid_laterality,
        procedure_cbhpm_id, 
        procedure_cbhpm_quantity, 
        procedure_laterality,
        secondary_procedure_ids, 
        secondary_procedure_quantities, 
        secondary_procedure_lateralities,
        opme_item_ids, 
        opme_item_quantities, 
        procedure_type,
        exam_images_url, 
        exam_image_count, 
        medical_report_url, 
        additional_notes,
        status_code, 
        complexity
    ) VALUES (
        p_patient_id,
        p_user_id,
        p_hospital_id,
        p_procedure_id,
        p_procedure_date,
        p_report_content,
        p_clinical_indication,
        p_cid_code_id,
        p_cid_laterality,
        p_procedure_cbhpm_id,
        p_procedure_cbhpm_quantity,
        p_procedure_laterality,
        p_secondary_procedure_ids,
        p_secondary_procedure_quantities,
        p_secondary_procedure_lateralities,
        p_opme_item_ids,
        p_opme_item_quantities,
        p_procedure_type,
        p_exam_images_url,
        p_exam_image_count,
        p_medical_report_url,
        p_additional_notes,
        p_status_code,
        p_complexity
    ) RETURNING id INTO new_order_id;
    
    SELECT * INTO result FROM medical_orders WHERE id = new_order_id;
    RETURN NEXT result;
    RETURN;
END;
$$;


ALTER FUNCTION public.create_medical_order(p_patient_id integer, p_user_id integer, p_hospital_id integer, p_procedure_id integer, p_procedure_date date, p_report_content text, p_clinical_indication text, p_cid_code_id integer, p_cid_laterality text, p_procedure_cbhpm_id integer, p_procedure_cbhpm_quantity integer, p_procedure_laterality text, p_secondary_procedure_ids integer[], p_secondary_procedure_quantities integer[], p_secondary_procedure_lateralities text[], p_opme_item_ids integer[], p_opme_item_quantities integer[], p_procedure_type text, p_exam_images_url text[], p_exam_image_count integer, p_medical_report_url text, p_additional_notes text, p_status_code text, p_complexity text) OWNER TO neondb_owner;

--
-- Name: brazilian_states; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.brazilian_states (
    id integer NOT NULL,
    state_code character(2) NOT NULL,
    name character varying(50) NOT NULL,
    ibge_code integer NOT NULL,
    region character varying(20) NOT NULL
);


ALTER TABLE public.brazilian_states OWNER TO neondb_owner;

--
-- Name: brazilian_states_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.brazilian_states_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.brazilian_states_id_seq OWNER TO neondb_owner;

--
-- Name: brazilian_states_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.brazilian_states_id_seq OWNED BY public.brazilian_states.id;


--
-- Name: cid_codes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.cid_codes (
    id integer NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    category public.cid_categories DEFAULT 'Outros'::public.cid_categories NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cid_codes OWNER TO neondb_owner;

--
-- Name: cid_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.cid_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cid_codes_id_seq OWNER TO neondb_owner;

--
-- Name: cid_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.cid_codes_id_seq OWNED BY public.cid_codes.id;


--
-- Name: doctor_hospitals; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.doctor_hospitals (
    id integer NOT NULL,
    user_id integer NOT NULL,
    hospital_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.doctor_hospitals OWNER TO neondb_owner;

--
-- Name: doctor_hospitals_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.doctor_hospitals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.doctor_hospitals_id_seq OWNER TO neondb_owner;

--
-- Name: doctor_hospitals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.doctor_hospitals_id_seq OWNED BY public.doctor_hospitals.id;


--
-- Name: doctor_patients; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.doctor_patients (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    patient_id integer NOT NULL,
    associated_at timestamp without time zone DEFAULT now() NOT NULL,
    notes text,
    is_active boolean DEFAULT true
);


ALTER TABLE public.doctor_patients OWNER TO neondb_owner;

--
-- Name: doctor_patients_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.doctor_patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.doctor_patients_id_seq OWNER TO neondb_owner;

--
-- Name: doctor_patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.doctor_patients_id_seq OWNED BY public.doctor_patients.id;


--
-- Name: health_insurance_providers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.health_insurance_providers (
    id integer NOT NULL,
    name text NOT NULL,
    cnpj text NOT NULL,
    ans_code text NOT NULL,
    address text,
    city text,
    state text,
    zip_code text,
    phone text,
    email text,
    website text,
    contact_person text,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.health_insurance_providers OWNER TO neondb_owner;

--
-- Name: health_insurance_providers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.health_insurance_providers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.health_insurance_providers_id_seq OWNER TO neondb_owner;

--
-- Name: health_insurance_providers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.health_insurance_providers_id_seq OWNED BY public.health_insurance_providers.id;


--
-- Name: hospitals; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.hospitals (
    id integer NOT NULL,
    name text NOT NULL,
    cnpj text NOT NULL,
    uf text NOT NULL,
    business_name text,
    cnes text,
    city public.cidades_rj,
    cep text,
    address text,
    number integer,
    logo_url text
);


ALTER TABLE public.hospitals OWNER TO neondb_owner;

--
-- Name: hospitals_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.hospitals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hospitals_id_seq OWNER TO neondb_owner;

--
-- Name: hospitals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.hospitals_id_seq OWNED BY public.hospitals.id;


--
-- Name: medical_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.medical_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.medical_orders_id_seq OWNER TO neondb_owner;

--
-- Name: medical_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.medical_orders_id_seq OWNED BY public.medical_orders.id;


--
-- Name: municipalities; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.municipalities (
    id integer NOT NULL,
    name text NOT NULL,
    ibge_code integer NOT NULL,
    state_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.municipalities OWNER TO neondb_owner;

--
-- Name: municipalities_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.municipalities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.municipalities_id_seq OWNER TO neondb_owner;

--
-- Name: municipalities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.municipalities_id_seq OWNED BY public.municipalities.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    message text NOT NULL,
    type public.notification_type DEFAULT 'info'::public.notification_type NOT NULL,
    read boolean DEFAULT false NOT NULL,
    link text,
    entity_type text,
    entity_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO neondb_owner;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO neondb_owner;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: opme_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.opme_items (
    id integer NOT NULL,
    anvisa_registration_number character varying(255),
    process_number character varying(255),
    technical_name character varying(255) NOT NULL,
    commercial_name character varying(255) NOT NULL,
    risk_class character varying(255),
    holder_cnpj character varying(255),
    registration_holder character varying(255),
    manufacturer_name character varying(255) NOT NULL,
    country_of_manufacture character varying(255),
    registration_date date,
    expiration_date date,
    is_valid boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.opme_items OWNER TO neondb_owner;

--
-- Name: opme_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.opme_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.opme_items_id_seq OWNER TO neondb_owner;

--
-- Name: opme_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.opme_items_id_seq OWNED BY public.opme_items.id;


--
-- Name: opme_suppliers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.opme_suppliers (
    id integer NOT NULL,
    opme_item_id integer NOT NULL,
    supplier_id integer NOT NULL,
    registration_anvisa character varying(30),
    commercial_description text,
    is_preferred boolean DEFAULT false,
    active boolean DEFAULT true,
    unit_price numeric(10,2),
    last_price_update date,
    delivery_time_days integer,
    minimum_quantity integer DEFAULT 1,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.opme_suppliers OWNER TO neondb_owner;

--
-- Name: opme_suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.opme_suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.opme_suppliers_id_seq OWNER TO neondb_owner;

--
-- Name: opme_suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.opme_suppliers_id_seq OWNED BY public.opme_suppliers.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    opme_item_id integer NOT NULL,
    quantity integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.order_items OWNER TO neondb_owner;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO neondb_owner;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: order_statuses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.order_statuses (
    code text NOT NULL,
    name text NOT NULL,
    display_order integer NOT NULL,
    color text,
    icon text
);


ALTER TABLE public.order_statuses OWNER TO neondb_owner;

--
-- Name: patients; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.patients (
    id integer NOT NULL,
    full_name text NOT NULL,
    cpf text NOT NULL,
    birth_date date NOT NULL,
    gender text NOT NULL,
    email text,
    phone text,
    phone2 text,
    insurance text,
    insurance_number text,
    plan text,
    notes text,
    is_active boolean DEFAULT false,
    activated_by text
);


ALTER TABLE public.patients OWNER TO neondb_owner;

--
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patients_id_seq OWNER TO neondb_owner;

--
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- Name: procedures; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.procedures (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    code text DEFAULT 'CBHPM-0000'::text NOT NULL,
    active boolean DEFAULT true,
    porte text,
    custo_operacional text,
    numero_auxiliares integer,
    porte_anestesista text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.procedures OWNER TO neondb_owner;

--
-- Name: procedures_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.procedures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.procedures_id_seq OWNER TO neondb_owner;

--
-- Name: procedures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.procedures_id_seq OWNED BY public.procedures.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer NOT NULL,
    permission public.permission NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO neondb_owner;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_id_seq OWNER TO neondb_owner;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO neondb_owner;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO neondb_owner;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: scanned_documents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.scanned_documents (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    document_type text NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.scanned_documents OWNER TO neondb_owner;

--
-- Name: scanned_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.scanned_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scanned_documents_id_seq OWNER TO neondb_owner;

--
-- Name: scanned_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.scanned_documents_id_seq OWNED BY public.scanned_documents.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO neondb_owner;

--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    company_name character varying(255) NOT NULL,
    trade_name character varying(255),
    cnpj character varying(18) NOT NULL,
    municipality_id integer NOT NULL,
    address character varying(255),
    neighborhood character varying(100),
    postal_code character varying(9),
    phone character varying(20),
    email character varying(100),
    website character varying(150),
    anvisa_code character varying(30),
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.suppliers OWNER TO neondb_owner;

--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO neondb_owner;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_permissions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    permission public.permission NOT NULL,
    granted boolean NOT NULL
);


ALTER TABLE public.user_permissions OWNER TO neondb_owner;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_permissions_id_seq OWNER TO neondb_owner;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_permissions_id_seq OWNED BY public.user_permissions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    email text DEFAULT 'temp@example.com'::text NOT NULL,
    role_id integer,
    active boolean DEFAULT true,
    last_login timestamp without time zone,
    password_reset_token text,
    password_reset_expires timestamp without time zone,
    failed_login_attempts integer DEFAULT 0,
    lockout_until timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_doctor boolean DEFAULT false,
    crm integer,
    consent_accepted timestamp without time zone,
    signature_url text,
    logo_url text
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: brazilian_states id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.brazilian_states ALTER COLUMN id SET DEFAULT nextval('public.brazilian_states_id_seq'::regclass);


--
-- Name: cid_codes id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cid_codes ALTER COLUMN id SET DEFAULT nextval('public.cid_codes_id_seq'::regclass);


--
-- Name: doctor_hospitals id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctor_hospitals ALTER COLUMN id SET DEFAULT nextval('public.doctor_hospitals_id_seq'::regclass);


--
-- Name: doctor_patients id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctor_patients ALTER COLUMN id SET DEFAULT nextval('public.doctor_patients_id_seq'::regclass);


--
-- Name: health_insurance_providers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.health_insurance_providers ALTER COLUMN id SET DEFAULT nextval('public.health_insurance_providers_id_seq'::regclass);


--
-- Name: hospitals id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.hospitals ALTER COLUMN id SET DEFAULT nextval('public.hospitals_id_seq'::regclass);


--
-- Name: medical_orders id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_orders ALTER COLUMN id SET DEFAULT nextval('public.medical_orders_id_seq'::regclass);


--
-- Name: municipalities id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.municipalities ALTER COLUMN id SET DEFAULT nextval('public.municipalities_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: opme_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opme_items ALTER COLUMN id SET DEFAULT nextval('public.opme_items_id_seq'::regclass);


--
-- Name: opme_suppliers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opme_suppliers ALTER COLUMN id SET DEFAULT nextval('public.opme_suppliers_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- Name: procedures id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.procedures ALTER COLUMN id SET DEFAULT nextval('public.procedures_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: scanned_documents id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.scanned_documents ALTER COLUMN id SET DEFAULT nextval('public.scanned_documents_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: user_permissions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_permissions ALTER COLUMN id SET DEFAULT nextval('public.user_permissions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: brazilian_states; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.brazilian_states (id, state_code, name, ibge_code, region) FROM stdin;
1	AC	Acre	12	North
2	AM	Amazonas	13	North
3	AP	Amapá	16	North
4	PA	Pará	15	North
5	RO	Rondônia	11	North
6	RR	Roraima	14	North
7	TO	Tocantins	17	North
8	AL	Alagoas	27	Northeast
9	BA	Bahia	29	Northeast
10	CE	Ceará	23	Northeast
11	MA	Maranhão	21	Northeast
12	PB	Paraíba	25	Northeast
13	PE	Pernambuco	26	Northeast
14	PI	Piauí	22	Northeast
15	RN	Rio Grande do Norte	24	Northeast
16	SE	Sergipe	28	Northeast
17	DF	Distrito Federal	53	Midwest
18	GO	Goiás	52	Midwest
19	MS	Mato Grosso do Sul	50	Midwest
20	MT	Mato Grosso	51	Midwest
21	ES	Espírito Santo	32	Southeast
22	MG	Minas Gerais	31	Southeast
23	RJ	Rio de Janeiro	33	Southeast
24	SP	São Paulo	35	Southeast
25	PR	Paraná	41	South
26	RS	Rio Grande do Sul	43	South
27	SC	Santa Catarina	42	South
\.


--
-- Data for Name: cid_codes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.cid_codes (id, code, description, category, created_at, updated_at) FROM stdin;
1	M17.0	Gonartrose primária bilateral	Joelho	2025-05-11 20:50:49.381429	2025-05-11 20:50:49.381429
2	M17.1	Gonartrose primária unilateral	Joelho	2025-05-11 20:50:49.381429	2025-05-11 20:50:49.381429
3	M17.2	Gonartrose pós-traumática bilateral	Joelho	2025-05-11 20:50:49.381429	2025-05-11 20:50:49.381429
4	M17.3	Gonartrose pós-traumática unilateral	Joelho	2025-05-11 20:50:49.381429	2025-05-11 20:50:49.381429
5	M22.4	Condromalácia da rótula	Joelho	2025-05-11 20:50:49.381429	2025-05-11 20:50:49.381429
6	M23.2	Transtorno do menisco devido a ruptura ou lesão antiga	Joelho	2025-05-11 20:50:49.381429	2025-05-11 20:50:49.381429
7	M23.3	Outros transtornos do menisco	Joelho	2025-05-11 20:50:49.381429	2025-05-11 20:50:49.381429
8	M23.4	Afrouxamento do corpo livre na articulação do joelho	Joelho	2025-05-11 20:50:49.381429	2025-05-11 20:50:49.381429
9	M23.5	Instabilidade crônica do joelho	Joelho	2025-05-11 20:50:49.381429	2025-05-11 20:50:49.381429
10	M23.6	Outras rupturas espontâneas de ligamentos do joelho	Joelho	2025-05-11 20:50:49.381429	2025-05-11 20:50:49.381429
11	S83.2	Ruptura recente do menisco	Joelho	2025-05-11 20:50:49.381429	2025-05-11 20:50:49.381429
12	S83.5	Entorse e distensão envolvendo ligamento cruzado (anterior) (posterior) do joelho	Joelho	2025-05-11 20:50:49.381429	2025-05-11 20:50:49.381429
13	S82.1	Fratura da extremidade proximal da tíbia	Joelho	2025-05-11 20:50:49.381429	2025-05-11 20:50:49.381429
14	M40.0	Cifose postural	Coluna	2025-05-11 20:50:58.602657	2025-05-11 20:50:58.602657
15	M40.2	Outras cifoses	Coluna	2025-05-11 20:50:58.602657	2025-05-11 20:50:58.602657
16	M43.1	Espondilolistese	Coluna	2025-05-11 20:50:58.602657	2025-05-11 20:50:58.602657
17	M48.0	Estenose da coluna vertebral	Coluna	2025-05-11 20:50:58.602657	2025-05-11 20:50:58.602657
18	M50.0	Transtorno do disco cervical com mielopatia	Coluna	2025-05-11 20:50:58.602657	2025-05-11 20:50:58.602657
19	M50.1	Transtorno do disco cervical com radiculopatia	Coluna	2025-05-11 20:50:58.602657	2025-05-11 20:50:58.602657
20	M51.0	Transtornos de discos lombares e de outros discos intervertebrais com mielopatia	Coluna	2025-05-11 20:50:58.602657	2025-05-11 20:50:58.602657
21	M51.1	Transtornos de discos lombares e de outros discos intervertebrais com radiculopatia	Coluna	2025-05-11 20:50:58.602657	2025-05-11 20:50:58.602657
22	M54.3	Ciática	Coluna	2025-05-11 20:50:58.602657	2025-05-11 20:50:58.602657
23	M54.4	Lumbago com ciática	Coluna	2025-05-11 20:50:58.602657	2025-05-11 20:50:58.602657
24	M54.5	Dor lombar baixa	Coluna	2025-05-11 20:50:58.602657	2025-05-11 20:50:58.602657
25	M75.0	Capsulite adesiva do ombro	Ombro	2025-05-11 20:51:48.702682	2025-05-11 20:51:48.702682
26	M75.1	Síndrome do manguito rotador	Ombro	2025-05-11 20:51:48.702682	2025-05-11 20:51:48.702682
27	M75.2	Tendinite bicipital	Ombro	2025-05-11 20:51:48.702682	2025-05-11 20:51:48.702682
28	M75.3	Tendinite calcificante do ombro	Ombro	2025-05-11 20:51:48.702682	2025-05-11 20:51:48.702682
29	M75.4	Síndrome de colisão do ombro	Ombro	2025-05-11 20:51:48.702682	2025-05-11 20:51:48.702682
30	M75.5	Bursite do ombro	Ombro	2025-05-11 20:51:48.702682	2025-05-11 20:51:48.702682
31	S42.0	Fratura da clavícula	Ombro	2025-05-11 20:51:48.702682	2025-05-11 20:51:48.702682
32	S42.1	Fratura da escápula	Ombro	2025-05-11 20:51:48.702682	2025-05-11 20:51:48.702682
33	S42.2	Fratura da extremidade superior do úmero	Ombro	2025-05-11 20:51:48.702682	2025-05-11 20:51:48.702682
34	S43.0	Luxação da articulação do ombro	Ombro	2025-05-11 20:51:48.702682	2025-05-11 20:51:48.702682
35	M16.0	Coxartrose primária bilateral	Quadril	2025-05-11 20:52:02.44896	2025-05-11 20:52:02.44896
36	M16.1	Coxartrose primária unilateral	Quadril	2025-05-11 20:52:02.44896	2025-05-11 20:52:02.44896
37	M16.2	Coxartrose bilateral resultante de displasia	Quadril	2025-05-11 20:52:02.44896	2025-05-11 20:52:02.44896
38	M16.3	Outras coxartroses displásicas	Quadril	2025-05-11 20:52:02.44896	2025-05-11 20:52:02.44896
39	M16.4	Coxartrose pós-traumática bilateral	Quadril	2025-05-11 20:52:02.44896	2025-05-11 20:52:02.44896
40	M16.5	Coxartrose pós-traumática unilateral	Quadril	2025-05-11 20:52:02.44896	2025-05-11 20:52:02.44896
41	M16.6	Outras coxartroses secundárias bilaterais	Quadril	2025-05-11 20:52:02.44896	2025-05-11 20:52:02.44896
42	M16.7	Outras coxartroses secundárias unilaterais	Quadril	2025-05-11 20:52:02.44896	2025-05-11 20:52:02.44896
43	S72.0	Fratura do colo do fêmur	Quadril	2025-05-11 20:52:02.44896	2025-05-11 20:52:02.44896
44	S72.1	Fratura pertrocantérica	Quadril	2025-05-11 20:52:02.44896	2025-05-11 20:52:02.44896
45	S72.2	Fratura subtrocantérica	Quadril	2025-05-11 20:52:02.44896	2025-05-11 20:52:02.44896
46	S73.0	Luxação do quadril	Quadril	2025-05-11 20:52:02.44896	2025-05-11 20:52:02.44896
47	M10.0	Gota idiopática	Pé e tornozelo	2025-05-11 20:52:09.541425	2025-05-11 20:52:09.541425
48	M20.1	Hallux valgus (adquirido)	Pé e tornozelo	2025-05-11 20:52:09.541425	2025-05-11 20:52:09.541425
49	M20.2	Hallux rigidus	Pé e tornozelo	2025-05-11 20:52:09.541425	2025-05-11 20:52:09.541425
50	M20.3	Outras deformidades do hallux (adquiridas)	Pé e tornozelo	2025-05-11 20:52:09.541425	2025-05-11 20:52:09.541425
51	M21.4	Pé chato (adquirido)	Pé e tornozelo	2025-05-11 20:52:09.541425	2025-05-11 20:52:09.541425
52	M24.2	Transtorno de ligamentos	Pé e tornozelo	2025-05-11 20:52:09.541425	2025-05-11 20:52:09.541425
53	M25.5	Dor articular	Pé e tornozelo	2025-05-11 20:52:09.541425	2025-05-11 20:52:09.541425
54	S82.5	Fratura do maléolo medial	Pé e tornozelo	2025-05-11 20:52:09.541425	2025-05-11 20:52:09.541425
55	S82.6	Fratura do maléolo lateral	Pé e tornozelo	2025-05-11 20:52:09.541425	2025-05-11 20:52:09.541425
56	S86.0	Lesão do tendão de Aquiles	Pé e tornozelo	2025-05-11 20:52:09.541425	2025-05-11 20:52:09.541425
57	S93.0	Luxação da articulação do tornozelo	Pé e tornozelo	2025-05-11 20:52:09.541425	2025-05-11 20:52:09.541425
58	S93.4	Entorse e distensão do tornozelo	Pé e tornozelo	2025-05-11 20:52:09.541425	2025-05-11 20:52:09.541425
\.


--
-- Data for Name: doctor_hospitals; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.doctor_hospitals (id, user_id, hospital_id, created_at) FROM stdin;
34	43	5	2025-05-24 16:18:11.368904+00
35	43	10	2025-05-24 16:18:11.368904+00
36	43	1	2025-05-24 16:18:11.368904+00
41	41	5	2025-05-25 14:59:41.714681+00
42	41	1	2025-05-25 14:59:41.714681+00
43	41	3	2025-05-25 14:59:41.714681+00
44	41	2	2025-05-25 14:59:41.714681+00
\.


--
-- Data for Name: doctor_patients; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.doctor_patients (id, doctor_id, patient_id, associated_at, notes, is_active) FROM stdin;
7	41	4	2025-05-19 20:41:32.75		t
9	43	1	2025-05-23 20:00:12.727508		t
10	41	2	2025-05-24 06:17:48.539687		t
11	41	1	2025-05-24 06:17:57.924664		t
12	43	3	2025-05-24 15:31:14.055619		t
15	43	4	2025-05-24 16:10:50.955437		t
16	12	7	2025-05-25 18:52:58.025519		t
17	12	3	2025-05-25 18:53:03.525735		t
18	12	9	2025-05-25 21:15:07.986778		t
19	12	2	2025-05-25 21:50:24.174531		t
20	12	4	2025-05-25 21:50:32.643985		t
\.


--
-- Data for Name: health_insurance_providers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.health_insurance_providers (id, name, cnpj, ans_code, address, city, state, zip_code, phone, email, website, contact_person, active, created_at, updated_at) FROM stdin;
2	teste de operadora	12.345.678/0001-95	11112	Estrada Alarico de Souza, 547	Niterói	RJ	24315-000	21987364870	felipecorreati@gmail.com		ccasdas	t	2025-05-19 17:40:11.408556	2025-05-19 17:40:11.408556
3	PROASA SAÚDE	83.367.342/0001-71	406554						atendimento@adventisthealth.com.br	https://proasasaude.com.br/		t	2025-05-25 09:53:44.423457	2025-05-25 09:53:44.423457
4	AMIL	29.309.127/0001-79	326305									t	2025-05-25 09:54:40.457433	2025-05-25 09:54:40.457433
5	SulAmérica	01.685.053/0001-56	006246									t	2025-05-25 09:59:57.552949	2025-05-25 09:59:57.552949
6	Saúde Caixa	00.360.305/0001-04	312924							https://saude.caixa.gov.br		t	2025-05-25 21:13:51.428677	2025-05-25 21:13:51.428677
\.


--
-- Data for Name: hospitals; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.hospitals (id, name, cnpj, uf, business_name, cnes, city, cep, address, number, logo_url) FROM stdin;
15	HOSPITAL QUINTA DOR	06047087001020	RJ	\N	\N	\N	\N	\N	\N	\N
16	HOSPITAL PRO CARDIACO	29435005005198	RJ	\N	\N	\N	\N	\N	\N	\N
17	HOSPITAL PANAMERICANO	33575127000600	RJ	\N	\N	\N	\N	\N	\N	\N
18	HOSPITAL OESTE D'OR	06047087003316	RJ	\N	\N	\N	\N	\N	\N	\N
19	HOSPITAL NORTE D'OR	09578217000158	RJ	\N	\N	\N	\N	\N	\N	\N
21	HOSPITAL COPA STAR	06047087002697	RJ	\N	\N	\N	\N	\N	\N	\N
22	HOSPITAL COPA D'OR\t	06047087000996	RJ	\N	\N	\N	\N	\N	\N	\N
23	HOSPITAL BARRA D'OR\t	02284062000521	RJ	\N	\N	\N	\N	\N	\N	\N
24	HOSPITAL ADVENTISTA SILVESTRE\t	73696718000219	RJ	\N	\N	\N	\N	\N	\N	\N
20	HOSPITAL GLÓRIA D'OR	31635857000454	RJ	\N	\N	\N	\N	\N	\N	\N
1	CHN - COMPLEXO HOSPITALAR DE NITERÓI	60884855001207	SP	\N	\N	Rio de Janeiro	\N	\N	\N	/uploads/hospital-logos/hospital_logo_1747231641597.png
5	\tHOSPITAL DE CLÍNICAS DO INGÁ	40258699000109	RJ	\N	\N	\N	\N	\N	\N	/uploads/hospital-logos/hospital_logo_1747231641597.png
10	HOSPITAL SAMARITANO\t	29435005006160	RJ	Tiju	\N	Rio de Janeiro	\N	\N	\N	\N
11	HOSPITAL VITORIA AMC\t	08100676002293	RJ	teste	\N	Rio de Janeiro	\N	\N	\N	\N
3	CENTRO ORTOPÉDICO SÃO LUCAS - NITERÓI	30091722000160	RJ	\N	\N	Rio de Janeiro	\N	\N	\N	\N
2	HOSPITAL SANTA MARTHA - NITERÓI	30079461000162	RJ	\N	\N	Rio de Janeiro	\N	\N	\N	\N
12	HOSPITAL SÃO LUCAS - COPACABANA	60884855001630	RJ	teste	\N	Rio de Janeiro	\N	\N	\N	\N
6	HOSPITAL NITERÓI D'OR	30145502000171	RJ	\N	\N	Rio de Janeiro	\N	\N	\N	\N
13	HOSPITAL RIOS D'OR\t	29259736000403	RJ	\N	\N	Rio de Janeiro	\N	\N	\N	\N
14	HOSPITAL RIOMAR	32154700000127	RJ	asdsadsadewq	\N	Rio de Janeiro	\N	\N	\N	\N
25	CLÍNICA SÃO VICENTE DA GÁVEA	31635857000101	RJ	erwer	\N	Rio de Janeiro	\N	\N	\N	\N
9	TIJUTRAUMA - CENTRO ORTOPÉDICO TRAUMATOLÓGICO TIJUCA LTDA\t	30939375000263	RJ	tiju2	\N	Rio de Janeiro	\N	\N	\N	\N
\.


--
-- Data for Name: medical_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.medical_orders (id, patient_id, user_id, hospital_id, procedure_id, procedure_date, report_content, clinical_indication, cid_code_id, procedure_cbhpm_id, procedure_cbhpm_quantity, secondary_procedure_ids, secondary_procedure_quantities, opme_item_ids, opme_item_quantities, procedure_type, medical_report_url, additional_notes, complexity, created_at, updated_at, cid_laterality, procedure_laterality, secondary_procedure_lateralities, status_code, exam_images_url, exam_image_count, clinical_justification, multiple_cid_ids, supplier_ids, order_pdf_url) FROM stdin;
56	3	43	10	1	\N	\N	dsakljdash	38	3	1	{2}	{1}	{}	{}	eletiva	\N	sdfsdfhds	\N	2025-05-23 20:43:00.427188	2025-05-23 20:45:30.62	\N	esquerdo	{}	em_avaliacao	{}	0	dafwefdsfw	{}	\N	\N
64	2	41	1	1	\N	\N	Indicação Clínica *	26	1	1	{2,3}	{1,1}	{1,4}	{1,1}	urgencia	/uploads/reports/report_1748081257905.jpeg	Observações Adicionais	\N	2025-05-24 10:07:00.807146	2025-05-25 06:09:34.938	\N	direito	{}	em_preenchimento	{/uploads/images/1748081785244.jpeg,/uploads/images/1748081786281.jpeg}	2	Sugestão de Justificativa Clínica	{26,29}	\N	\N
62	7	12	1	1	\N	\N	Dor lombar e hernia discal	\N	\N	1	{}	{}	{}	{}	eletiva	\N	\N	\N	2025-05-24 09:20:07.028466	2025-05-24 09:26:58.257	\N	\N	{}	em_preenchimento	{}	0	Paciente apresenta dor lombar com irradiaçao para o membro inferior direito, não tolera atividades laborais	{}	\N	\N
66	4	43	1	1	\N	\N	Indicação Clínica *	26	1	1	{2}	{1}	{1}	{1}	eletiva	\N	Indicação Clínica *	\N	2025-05-24 16:15:38.939076	2025-05-24 17:18:50.241	\N	bilateral	{}	em_preenchimento	{}	0	Sugestão de Justificativa Clínica\n	{26}	\N	\N
53	4	21	5	1	\N	\N	Teste de indicação Clínica do Felipe correa	8	1	1	{4}	{1}	{}	{}	eletiva	\N	Observações adicionais do Felipe correa	\N	2025-05-23 17:39:14.659114	2025-05-23 18:33:53.385	\N	direito	{}	em_preenchimento	{}	0	TESTES	{8}	\N	\N
55	1	43	5	1	\N	\N	Teste de indicação clinica	47	1	1	{1}	{1}	{}	{}	eletiva	\N	teste de observação adicional	\N	2025-05-23 19:51:29.907054	2025-05-23 19:59:14.214	\N	direito	{}	em_avaliacao	{}	0	teste de sugestão de clinica	{}	\N	\N
52	1	21	9	1	\N	\N	A ser preenchido	\N	\N	1	{}	{}	{}	{}	eletiva	\N	\N	\N	2025-05-22 11:14:44.691388	2025-05-22 11:14:44.691388	\N	\N	{}	em_preenchimento	{}	0	\N	{}	\N	\N
75	1	41	5	1	\N	\N	Lesao do manguito rotador	26	3	1	{}	{}	{}	{}	eletiva	/uploads/reports/report_1748197884505.jpg	Ruptura	\N	2025-05-25 18:30:53.276331	2025-05-25 18:33:30.483	\N	direito	{}	em_preenchimento	{}	0	Paciente com ruptura do manguito rotador do ombro direito	{26}	{1,3,2}	\N
77	7	12	1	1	\N	\N	Lesão do manguito rotador	26	3	1	{1}	{1}	{2}	{1}	eletiva	/uploads/reports/report_1748209937942.pdf	Ombro direito\nTrauma	\N	2025-05-25 21:51:28.743767	2025-05-25 21:55:56.337	\N	direito	{}	em_preenchimento	{}	0	Paciente com lesão traumatica do manguito rotador, com necessidade de tratamento cirúrgico 	{26}	{3,1,6}	\N
76	3	43	1	1	\N	\N	Lesao do manguito	26	3	1	{3}	{1}	{1}	{1}	eletiva	\N	manguito	\N	2025-05-25 18:58:28.992537	2025-05-25 19:02:34.276	\N	direito	{}	aguardando_envio	{}	0	lesão manguito rotador direito\n\nprocure um médico e opere	{}	{1,3,2}	/uploads/pdfs/pedido_1748199753268.pdf
72	4	41	1	1	\N	\N	Indicação Clínica * Indicação Clínica *Indicação Clínica *Indicação Clínica *Indicação Clínica *Indicação Clínica *Indicação Clínica *	26	1	1	{2,3}	{1,1}	{1,4}	{1,1}	eletiva	/uploads/reports/report_1748155002062.jpeg	Observações Adicionais	\N	2025-05-25 06:35:17.449963	2025-05-25 18:04:38.204	\N	direito	{}	em_preenchimento	{/uploads/images/1748154928228.jpeg,/uploads/images/1748154928914.jpeg}	2	Paciente vítima de queda da própria altura e trauma de alta energia no punho esquerdo, apresenta fratura desviada e cominutiva na extremidade distal do rádio, apresenta dor intensa, deformidade no punho e parestesia no território do nervo mediano, devido síndrome compressiva. \nSolicito autorização para internação hospitalar e tratamento cirúrgico fratura com urgência, devido fratura articular da extremidade distal do rádio, presença de desvio dorsal do punho e síndrome compressiva.\n	{26}	{5,3,4}	/uploads/pdfs/pedido_1748196277892.pdf
\.


--
-- Data for Name: municipalities; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.municipalities (id, name, ibge_code, state_id, created_at) FROM stdin;
1	Angra dos Reis	3300100	23	2025-05-17 06:44:48.425193+00
2	Aperibé	3300159	23	2025-05-17 06:44:48.425193+00
3	Araruama	3300209	23	2025-05-17 06:44:48.425193+00
4	Areal	3300225	23	2025-05-17 06:44:48.425193+00
5	Armação dos Búzios	3300233	23	2025-05-17 06:44:48.425193+00
6	Arraial do Cabo	3300258	23	2025-05-17 06:44:48.425193+00
7	Barra do Piraí	3300308	23	2025-05-17 06:44:48.425193+00
8	Barra Mansa	3300407	23	2025-05-17 06:44:48.425193+00
9	Belford Roxo	3300456	23	2025-05-17 06:44:48.425193+00
10	Bom Jardim	3300506	23	2025-05-17 06:44:48.425193+00
11	Bom Jesus do Itabapoana	3300605	23	2025-05-17 06:44:48.425193+00
12	Cabo Frio	3300704	23	2025-05-17 06:44:48.425193+00
13	Cachoeiras de Macacu	3300803	23	2025-05-17 06:44:48.425193+00
14	Cambuci	3300902	23	2025-05-17 06:44:48.425193+00
15	Campos dos Goytacazes	3301009	23	2025-05-17 06:44:48.425193+00
16	Cantagalo	3301108	23	2025-05-17 06:44:48.425193+00
17	Carapebus	3300936	23	2025-05-17 06:44:48.425193+00
18	Cardoso Moreira	3301157	23	2025-05-17 06:44:48.425193+00
19	Carmo	3301207	23	2025-05-17 06:44:48.425193+00
20	Casimiro de Abreu	3301306	23	2025-05-17 06:44:48.425193+00
21	Comendador Levy Gasparian	3300951	23	2025-05-17 06:44:48.425193+00
22	Conceição de Macabu	3301405	23	2025-05-17 06:44:48.425193+00
23	Cordeiro	3301504	23	2025-05-17 06:44:48.425193+00
24	Duas Barras	3301603	23	2025-05-17 06:44:48.425193+00
25	Duque de Caxias	3301702	23	2025-05-17 06:44:48.425193+00
26	Engenheiro Paulo de Frontin	3301801	23	2025-05-17 06:44:48.425193+00
27	Guapimirim	3301850	23	2025-05-17 06:44:48.425193+00
28	Iguaba Grande	3301876	23	2025-05-17 06:44:48.425193+00
29	Itaboraí	3301900	23	2025-05-17 06:44:48.425193+00
30	Itaguaí	3302007	23	2025-05-17 06:44:48.425193+00
31	Italva	3302056	23	2025-05-17 06:44:48.425193+00
32	Itaocara	3302106	23	2025-05-17 06:44:48.425193+00
33	Itaperuna	3302205	23	2025-05-17 06:44:48.425193+00
34	Itatiaia	3302254	23	2025-05-17 06:44:48.425193+00
35	Japeri	3302270	23	2025-05-17 06:44:48.425193+00
36	Laje do Muriaé	3302304	23	2025-05-17 06:44:48.425193+00
37	Macaé	3302403	23	2025-05-17 06:44:48.425193+00
38	Macuco	3302452	23	2025-05-17 06:44:48.425193+00
39	Magé	3302502	23	2025-05-17 06:44:48.425193+00
40	Mangaratiba	3302601	23	2025-05-17 06:44:48.425193+00
41	Maricá	3302700	23	2025-05-17 06:44:48.425193+00
42	Mendes	3302809	23	2025-05-17 06:44:48.425193+00
43	Mesquita	3302858	23	2025-05-17 06:44:48.425193+00
44	Miguel Pereira	3302908	23	2025-05-17 06:44:48.425193+00
45	Miracema	3303005	23	2025-05-17 06:44:48.425193+00
46	Natividade	3303104	23	2025-05-17 06:44:48.425193+00
47	Nilópolis	3303203	23	2025-05-17 06:44:48.425193+00
48	Niterói	3303302	23	2025-05-17 06:44:48.425193+00
49	Nova Friburgo	3303401	23	2025-05-17 06:44:48.425193+00
50	Nova Iguaçu	3303500	23	2025-05-17 06:44:48.425193+00
51	Paracambi	3303609	23	2025-05-17 06:44:48.425193+00
52	Paraíba do Sul	3303708	23	2025-05-17 06:44:48.425193+00
53	Paraty	3303807	23	2025-05-17 06:44:48.425193+00
54	Paty do Alferes	3303856	23	2025-05-17 06:44:48.425193+00
55	Petrópolis	3303906	23	2025-05-17 06:44:48.425193+00
56	Pinheiral	3303955	23	2025-05-17 06:44:48.425193+00
57	Piraí	3304003	23	2025-05-17 06:44:48.425193+00
58	Porciúncula	3304102	23	2025-05-17 06:44:48.425193+00
59	Porto Real	3304110	23	2025-05-17 06:44:48.425193+00
60	Quatis	3304128	23	2025-05-17 06:44:48.425193+00
61	Queimados	3304144	23	2025-05-17 06:44:48.425193+00
62	Quissamã	3304151	23	2025-05-17 06:44:48.425193+00
63	Resende	3304201	23	2025-05-17 06:44:48.425193+00
64	Rio Bonito	3304300	23	2025-05-17 06:44:48.425193+00
65	Rio Claro	3304409	23	2025-05-17 06:44:48.425193+00
66	Rio das Flores	3304508	23	2025-05-17 06:44:48.425193+00
67	Rio das Ostras	3304524	23	2025-05-17 06:44:48.425193+00
68	Rio de Janeiro	3304557	23	2025-05-17 06:44:48.425193+00
69	Santa Maria Madalena	3304607	23	2025-05-17 06:44:48.425193+00
70	Santo Antônio de Pádua	3304706	23	2025-05-17 06:44:48.425193+00
71	São Fidélis	3304805	23	2025-05-17 06:44:48.425193+00
72	São Francisco de Itabapoana	3304755	23	2025-05-17 06:44:48.425193+00
73	São Gonçalo	3304904	23	2025-05-17 06:44:48.425193+00
74	São João da Barra	3305000	23	2025-05-17 06:44:48.425193+00
75	São João de Meriti	3305109	23	2025-05-17 06:44:48.425193+00
76	São José de Ubá	3305133	23	2025-05-17 06:44:48.425193+00
77	São José do Vale do Rio Preto	3305158	23	2025-05-17 06:44:48.425193+00
78	São Pedro da Aldeia	3305208	23	2025-05-17 06:44:48.425193+00
79	São Sebastião do Alto	3305307	23	2025-05-17 06:44:48.425193+00
80	Sapucaia	3305406	23	2025-05-17 06:44:48.425193+00
81	Saquarema	3305505	23	2025-05-17 06:44:48.425193+00
82	Seropédica	3305554	23	2025-05-17 06:44:48.425193+00
83	Silva Jardim	3305604	23	2025-05-17 06:44:48.425193+00
84	Sumidouro	3305703	23	2025-05-17 06:44:48.425193+00
85	Tanguá	3305752	23	2025-05-17 06:44:48.425193+00
86	Teresópolis	3305802	23	2025-05-17 06:44:48.425193+00
87	Trajano de Moraes	3305901	23	2025-05-17 06:44:48.425193+00
88	Três Rios	3306008	23	2025-05-17 06:44:48.425193+00
89	Valença	3306107	23	2025-05-17 06:44:48.425193+00
90	Varre-Sai	3306156	23	2025-05-17 06:44:48.425193+00
91	Vassouras	3306206	23	2025-05-17 06:44:48.425193+00
92	Volta Redonda	3306305	23	2025-05-17 06:44:48.425193+00
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.notifications (id, user_id, message, type, read, link, entity_type, entity_id, created_at, updated_at) FROM stdin;
2	21	Novo pedido cirúrgico criado com sucesso	success	t	\N	\N	\N	2025-05-14 17:34:28.701308+00	2025-05-14 18:49:38.031+00
1	21	Bem-vindo ao novo sistema de notificações!	info	t	\N	\N	\N	2025-05-14 18:34:28.701308+00	2025-05-14 18:49:57.913+00
3	21	Atualização do sistema programada para amanhã	warning	t	\N	\N	\N	2025-05-13 18:34:28.701308+00	2025-05-14 18:49:57.913+00
\.


--
-- Data for Name: opme_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.opme_items (id, anvisa_registration_number, process_number, technical_name, commercial_name, risk_class, holder_cnpj, registration_holder, manufacturer_name, country_of_manufacture, registration_date, expiration_date, is_valid, created_at, updated_at) FROM stdin;
1	10380700077	25351.144193/2020-28	PLACA BLOQUEADA DE TITÂNIO PARA FIXAÇÃO DE OSSOS	SISTEMA DE PLACAS BLOQUEADAS TARGON	III	01.618.707/0001-01	B. BRAUN BRASIL LTDA	AESCULAP AG	ALEMANHA	2020-07-27	2030-07-27	t	2025-05-17 08:02:41.416524+00	2025-05-17 08:02:41.416524+00
2	10380700180	25351.328759/2019-49	PARAFUSO ÓSSEO NÃO ABSORVÍVEL	PARAFUSOS ÓSSEOS AESCULAP	III	01.618.707/0001-01	B. BRAUN BRASIL LTDA	AESCULAP AG	ALEMANHA	2019-11-13	2029-11-13	t	2025-05-17 08:02:41.416524+00	2025-05-17 08:02:41.416524+00
3	80145901520	25351.323745/2022-75	PRÓTESE TOTAL DE QUADRIL	SISTEMA ACETABULAR TRILOGY	IV	01.645.409/0001-78	ZIMMER BIOMET BRASIL LTDA.	ZIMMER, INC.	ESTADOS UNIDOS	2022-09-18	2032-09-18	t	2025-05-17 08:02:41.416524+00	2025-05-17 08:02:41.416524+00
4	10223710073	25351.206044/2021-21	PLACA CERVICAL	SISTEMA ATLANTIS VISION ELITE	III	33.158.874/0001-54	MEDTRONIC COMERCIAL LTDA	MEDTRONIC SOFAMOR DANEK	ESTADOS UNIDOS	2021-08-05	2031-08-05	t	2025-05-17 08:02:41.416524+00	2025-05-17 08:02:41.416524+00
5	10247899008	25351.248197/2023-34	HASTE INTRAMEDULAR	SISTEMA DE HASTE FEMORAL T2	III	02.340.250/0001-22	STRYKER DO BRASIL LTDA	STRYKER TRAUMA GMBH	ALEMANHA	2023-06-12	2033-06-12	t	2025-05-17 08:02:41.416524+00	2025-05-17 08:02:41.416524+00
6	80858840019	25351.186452/2020-45	PRÓTESE TOTAL DE JOELHO	SISTEMA DE JOELHO COLUMBUS	IV	10.493.818/0001-33	MERIL LIFE SCIENCES DO BRASIL	MERIL LIFE SCIENCES PVT. LTD.	ÍNDIA	2021-01-22	2031-01-22	t	2025-05-17 08:02:41.416524+00	2025-05-17 08:02:41.416524+00
\.


--
-- Data for Name: opme_suppliers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.opme_suppliers (id, opme_item_id, supplier_id, registration_anvisa, commercial_description, is_preferred, active, unit_price, last_price_update, delivery_time_days, minimum_quantity, notes, created_at, updated_at) FROM stdin;
1	3	3	80145901520-A	SISTEMA ACETABULAR TRILOGY - VERSÃO HOSPITALAR	t	t	12850.75	\N	\N	1	Fornecedor com entrega em 48h para hospitais da rede	2025-05-17 08:16:08.460492+00	2025-05-17 08:16:08.460492+00
2	1	1	10380700077-PP	SISTEMA DE PLACAS BLOQUEADAS TARGON - TITÂNIO GRAU MÉDICO	t	t	8250.50	\N	3	1	Fornecedor oficial da marca, com garantia estendida de 5 anos	2025-05-17 08:16:19.177915+00	2025-05-17 08:16:19.177915+00
3	1	4	10380700077-DMO	SISTEMA DE PLACAS BLOQUEADAS TARGON - IMPORTADO	f	t	7890.25	\N	5	2	Preço mais baixo, mas requer pedido mínimo de 2 unidades	2025-05-17 08:16:19.177915+00	2025-05-17 08:16:19.177915+00
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.order_items (id, order_id, opme_item_id, quantity) FROM stdin;
\.


--
-- Data for Name: order_statuses; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.order_statuses (code, name, display_order, color, icon) FROM stdin;
em_preenchimento	Em preenchimento	1	#FFA500	edit
em_avaliacao	Em avaliação	2	#0088CC	search
aceito	Aceito	3	#008000	check
realizado	Realizado	4	#800080	calendar
aguardando_envio	Aguardando Envio	5	#f59e0b	clock
enviado	Enviado	6	#3b82f6	send
cancelado	Cancelado	7	#ef4444	x
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.patients (id, full_name, cpf, birth_date, gender, email, phone, phone2, insurance, insurance_number, plan, notes, is_active, activated_by) FROM stdin;
3	Rodrigo Roitman Pozzatti	05877050788	1987-04-09	Masculino	rodrigopozzatti@hotmail.com	21982097426		SULAMÉRICA	88888487287690012	ESPECIAL 100	Produto 557\nAcomodação: Apartamento	f	\N
2	Maria Silva Santos	123.456.789-00	1979-12-31		felipecorreati@gmail.com	21987364870		Unimed	123456789	Premium		f	
1	FelipeSantosCorrea	071.755.877-08	1975-11-06	Masculino	felipecorreati@gmail.com	21987364870		Bradesco Saúde	23432	fwfds	sdfds	f	
7	Gisele Cerutti	10108754774	1986-03-12	Feminino	dragiselecerutti@gmail.com	21981954423		SULAMÉRICA				f	\N
4	João do pé de Feijão1	10208206752	1985-05-30	Masculino	danielroitman@gmail.com	21987364870	00000000					f	\N
9	NILZA PALADINO	07348248748	1927-06-13	Feminino		21988566626		Saúde Caixa				t	Rodrigo Roitman Pozzatti
\.


--
-- Data for Name: procedures; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.procedures (id, name, description, code, active, porte, custo_operacional, numero_auxiliares, porte_anestesista, created_at, updated_at) FROM stdin;
8	Artroplastia parcial do quadril	Hemiartroplastia do quadril	3.07.15.24-9	t	\N	\N	\N	\N	2025-05-13 13:40:13.957033	2025-05-13 13:40:13.957033
1	Artroplastia total do joelho	Substituição total da articulação do joelho por prótese	3.07.15.01-0	t	9B	11,07	2	4	2025-05-13 13:40:13.957033	2025-05-13 13:40:13.957033
2	Artroplastia total do quadril	Substituição total da articulação do quadril por prótese	3.07.15.03-6	t	10A	12,26	2	5	2025-05-13 13:40:13.957033	2025-05-13 13:40:13.957033
3	Artroplastia total do ombro	Substituição total da articulação do ombro por prótese	3.07.15.10-9	t	9C	11,54	2	4	2025-05-13 13:40:13.957033	2025-05-13 13:40:13.957033
4	Artroscopia para tratamento de lesão do menisco	Tratamento artroscópico de lesão meniscal do joelho	3.07.26.06-0	t	7C	5,86	1	3	2025-05-13 13:40:13.957033	2025-05-13 13:40:13.957033
5	Fixação de fratura de fêmur com DHS	Tratamento cirúrgico para fixação de fratura do fêmur com DHS	3.07.24.08-4	t	8B	9,26	2	4	2025-05-13 13:40:13.957033	2025-05-13 13:40:13.957033
6	Tratamento cirúrgico da hérnia de disco lombar	Discectomia lombar para remoção de hérnia de disco	3.07.30.10-7	t	8C	8,97	2	4	2025-05-13 13:40:13.957033	2025-05-13 13:40:13.957033
7	Revisão de artroplastia total do joelho	Cirurgia de revisão após artroplastia prévia do joelho	3.07.15.15-0	t	\N	\N	2	\N	2025-05-13 13:40:13.957033	2025-05-13 13:40:13.957033
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.role_permissions (id, role_id, permission) FROM stdin;
1	1	dashboard_view
2	1	patients_view
3	1	patients_create
4	1	patients_edit
5	1	patients_delete
6	1	hospitals_view
7	1	hospitals_create
8	1	hospitals_edit
9	1	hospitals_delete
10	1	orders_view
11	1	orders_create
12	1	orders_edit
13	1	orders_delete
14	1	catalog_view
15	1	catalog_create
16	1	catalog_edit
17	1	catalog_delete
18	1	reports_view
19	1	reports_create
20	1	reports_export
21	1	users_view
22	1	users_create
23	1	users_edit
24	1	users_delete
25	1	roles_view
26	1	roles_create
27	1	roles_edit
28	1	roles_delete
29	1	system_settings
30	2	dashboard_view
31	2	patients_view
32	2	patients_create
33	2	patients_edit
34	2	hospitals_view
35	2	orders_view
36	2	orders_create
37	2	orders_edit
38	2	catalog_view
39	2	reports_view
40	2	reports_create
41	2	reports_export
42	3	dashboard_view
43	3	patients_view
44	3	patients_create
45	3	patients_edit
46	3	hospitals_view
47	3	orders_view
48	3	orders_create
49	3	catalog_view
50	3	reports_view
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.roles (id, name, description, is_default, created_at, updated_at) FROM stdin;
1	Administrador	Acesso completo ao sistema	t	2025-05-09 20:12:55.399903	2025-05-09 20:12:55.399903
2	Médico	Acesso a pacientes e pedidos médicos	f	2025-05-09 20:12:55.399903	2025-05-09 20:12:55.399903
3	Assistente Básico	Assistente administrativo para tarefas básicas	f	2025-05-09 20:12:55.399903	2025-05-09 20:12:55.399903
5	Assistente Administrativo	Assistente Administrativo	f	2025-05-14 19:40:10.317082	2025-05-14 19:40:10.317082
\.


--
-- Data for Name: scanned_documents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.scanned_documents (id, patient_id, document_type, content, created_at) FROM stdin;
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.session (sid, sess, expire) FROM stdin;
cdSt1322tYbuYa3OVaA50wm9AX6fRbGb	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-17T19:30:44.564Z","secure":true,"httpOnly":true,"path":"/"},"passport":{"user":14}}	2025-06-17 19:49:52
fEBWxHDuvDd1kDPzTbgrFa_anQAenA3E	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-09T16:28:06.868Z","secure":true,"httpOnly":true,"path":"/"},"passport":{"user":13}}	2025-06-24 10:05:29
BR8ouPneE-_yN4TZLAdVLg7G1iZmrBLx	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-14T19:30:32.985Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":21}}	2025-06-14 19:30:33
4LD_olMurswML84rWxEC04sJ15b63G3w	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-14T19:34:58.981Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":21}}	2025-06-14 19:34:59
VEWC3sJQ8R_1P3Ob223hpF5Y_XjIZguW	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-14T19:44:47.839Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":21}}	2025-06-14 19:44:48
rY_DoJezy2kQy96Q2dVMTQHBpuiSScnD	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-23T13:59:03.998Z","secure":true,"httpOnly":true,"path":"/"},"passport":{"user":43}}	2025-06-23 13:59:05
eVPsE2TPHJ9zuNsmXloBklrClCBZRsdg	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-24T22:40:23.654Z","secure":true,"httpOnly":true,"path":"/"},"passport":{"user":21}}	2025-06-24 23:21:18
Be6ceyHezok17hbBY0gbLm-i-kVFaK2S	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-19T15:28:30.780Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":41}}	2025-06-19 15:28:38
ueG-s4_SGw045GSlQn3XedTws8aRh3HU	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-24T07:19:04.300Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":41}}	2025-06-24 23:12:12
-NULBnYFOtwVM0x_LalkpXvXy6Jlcfph	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-22T21:02:38.508Z","secure":true,"httpOnly":true,"path":"/"},"passport":{"user":41}}	2025-06-23 17:37:23
1ecYP89ESX8oQ347QN1K-7g7nCznrVx6	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-15T14:21:34.377Z","secure":false,"httpOnly":true,"path":"/"}}	2025-06-15 15:29:17
kVc2e5SW40iRlEugGlAn-tg0ZmjTzH4g	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-15T11:54:09.784Z","secure":false,"httpOnly":true,"path":"/"}}	2025-06-15 11:54:11
hsaL0IWRvYxJ6GLfRPjvmK6s18yGpcD4	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-23T13:54:42.641Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":43}}	2025-06-23 17:22:47
SS5Fjjt2INjd3xQn7sCJgq-ohkftilaE	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-14T20:04:26.479Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":21}}	2025-06-14 20:04:27
JaTbCcVV7OHk3-DtqiD5W52OMykOio6y	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-14T20:04:43.610Z","secure":false,"httpOnly":true,"path":"/"}}	2025-06-14 20:04:44
phR17pvAyQ4eB_rEhGmG13-ipNtgVuDj	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-15T14:54:31.559Z","secure":false,"httpOnly":true,"path":"/"}}	2025-06-15 14:54:32
GnsATP-tTK6c4aN_TU5xMAfu7BxbaI9S	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-19T12:20:49.904Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":41}}	2025-06-22 16:18:29
rzOAax5OKvqEuInmPx5abAr74T_WRpRW	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-14T20:24:50.516Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":21}}	2025-06-14 20:26:53
UzTGEVmTeR_9tro_T1KSBZHDBAvDm5mW	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-19T07:13:56.394Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":41}}	2025-06-25 09:11:41
sEp7xUEL5zyF7IrG7cEypfmID0Ql5yql	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-19T20:23:30.780Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":41}}	2025-06-25 06:31:56
jozT3HeW1JVKtMzyeY-3R75XyBD8nLEp	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-24T23:08:34.030Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":21}}	2025-06-24 23:38:49
BtdOvPXZHaYS_zYYRepG635Y57-YjBb5	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-24T22:13:19.352Z","secure":true,"httpOnly":true,"path":"/"},"passport":{"user":12}}	2025-06-25 01:12:55
ZXC_No_lG3e_gk3cUa2fnoJbW6V3RXy6	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-22T09:47:57.793Z","secure":true,"httpOnly":true,"path":"/"},"passport":{"user":41}}	2025-06-22 10:52:26
foNVP2R9QuUaIubXUSakl4iq1JjD6V4o	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-06-24T18:55:09.964Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":43}}	2025-06-24 19:04:15
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.suppliers (id, company_name, trade_name, cnpj, municipality_id, address, neighborhood, postal_code, phone, email, website, anvisa_code, active, created_at, updated_at) FROM stdin;
1	Per Prima Comércio Importação e Exportação Ltda	Per Prima	40.179.558/0001-09	68	Rua Conde de Lages, 44 – Sala 1304 – Glória	Glória	20061-080	(21) 2221-1244	contato@perprima.com.br	https://perprima.com.br	\N	t	2025-05-17 07:28:13.003281+00	2025-05-17 07:28:13.003281+00
2	Porto Surgical Ltda	Porto Surgical	00.000.000/0001-00	68	Rua José Silva de Azevedo Neto, 200 – Bloco 3 – Sala 301 – Barra da Tijuca	Barra da Tijuca	22631-170	(21) 99127-1142	marcio.bueno@portosurgical.com.br	https://portosurgical.com.br	25351.435423/2023-92	t	2025-05-17 07:28:13.104482+00	2025-05-17 07:28:13.104482+00
3	BlueSynthes Produtos Hospitalares Ltda	BlueSynthes	00.000.000/0001-01	48	Estrada Caetano Monteiro, 4550 / 203 – Pendotiba	Pendotiba	24342-560	(21) 99999-9999	contato@bluesynthes.com.br	\N	\N	t	2025-05-17 07:28:13.196708+00	2025-05-17 07:28:13.196708+00
4	DMO – Distribuidora de Materiais Ortopédicos	DMO	00.000.000/0001-02	68	Rua Maurício da Costa Faria, 190 – Recreio dos Bandeirantes	Recreio dos Bandeirantes	22790-285	(21) 3289-8900	\N	https://www.dmorj.com.br/	\N	t	2025-05-17 07:28:13.288508+00	2025-05-17 07:28:13.288508+00
5	Axiste Comércio de Produtos Médicos Hospitalares Ltda	Axiste	09.409.545/0001-20	68	Rua General André Chaves, 134 – Anil	Anil	22755-100	(21) 3094-9750	cotacao@axiste.com.br	https://axiste.com.br/	\N	t	2025-05-17 07:28:13.380164+00	2025-05-17 07:28:13.380164+00
6	Endo RJ Distribuidora	Endo RJ	00.000.000/0001-03	68	Rua Victor Civita, 66 – Bloco 2, Edifício 4, Conjuntos 301 a 305 – Barra da Tijuca	Barra da Tijuca	22775-044	(21) 3976-0189	cotacao@endorj.com.br	https://endorj.com.br/	\N	t	2025-05-17 07:28:36.916475+00	2025-05-17 07:28:36.916475+00
\.


--
-- Data for Name: user_permissions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_permissions (id, user_id, permission, granted) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, name, email, role_id, active, last_login, password_reset_token, password_reset_expires, failed_login_attempts, lockout_until, created_at, updated_at, is_doctor, crm, consent_accepted, signature_url, logo_url) FROM stdin;
28	Danielroitman	78ba88a26f3519a43e9bff02a8eaf3dd2927f408cf9f6c8d8eb41e664d2c927363f4eac334f60719ae8b1b29e33d503526223078ae12efafeb3ddb2d1276aa6d.592fd26e6a4fb49272cdc7a5c9e7c09f	Daniel Pozzatti 	danielroitman@hotmail.com	3	f	\N	\N	\N	0	\N	2025-05-14 21:30:34.757673	2025-05-14 21:30:34.757673	f	\N	\N	\N	\N
34	jorgeduarte	4a202b7f839fe141e09b239e61348da959b554a45f1144cdd9f608dd687546b687b521bb4d835cdabdeb2650a02c0ebb75fce2f61890f82076bcdd40516f05ce.0bea2fca7be3395277bbec7ad33e96fc	Jorge Duarte	emailteste123@gmail.com	3	f	\N	\N	\N	0	\N	2025-05-15 19:41:03.718857	2025-05-15 19:41:03.718857	f	\N	\N	\N	\N
13	Gisele Cerutti	475d427c40b9476f0e0f8d5b28662a7adc24f9ea4dd69262fdf22eaa0e2ce0acac908f9ff9de1db9ff5ce205680253cbc386326b9747a65312854697be7d1174.f87be799e8a4000a589a0a4f181ef58a	Gisele Cerutti	gisa_cerutti@gmail.com	1	t	\N	\N	\N	0	\N	2025-05-10 16:28:06.635498	2025-05-13 21:02:40.465	f	\N	2025-05-13 21:02:40.465	\N	\N
21	lipegol18	e5b40d0e7dc51f506384e0a1181413a660da1341c2064b28e950dc493ec04e00e4b52fe5d7b3e8926497dbb0dfcbfcfa438a0562beb4632ff05a5fcb6166e189.92bb646a85e4c3763f2d7ce49041e7f8	Felipe Santos Corrêa	felipecorreati@gmail.com	1	t	2025-05-25 23:08:33.892	\N	\N	0	\N	2025-05-13 17:24:22.236922	2025-05-25 23:08:33.892	f	\N	2025-05-13 19:39:25.659	\N	\N
41	danielpozzatti	37d7121d23ad78fe82b1e9c2c64be43ac799e9f53be64736f2b151ffc39617af792002b9ca4d7cf578425329a8d63a798aa8f4a25253d78f793654b2f7adbac4.07cb547c92903349a70ec148bbec3241	daniel pozzatti	danielroitman@ualg.com	2	t	2025-05-25 07:19:04.159	\N	\N	0	\N	2025-05-19 10:17:26.585384	2025-05-25 17:52:42.865	t	521017039	\N	/uploads/doctors/user_41/signature.jpg	/uploads/doctors/user_41/logo.jpg
33	jorgeduartejr	459437786aa7269a4ec97b69c7585c10a2fc99c6adef72ecce41d355a7ea710c0b6fef915f39995a21ada2452c176113af28c8ef0f751ed2356f5e3a58b55520.7a279602f2bc1c8feff709e9f4a9af62	Jorge Duarte	migueljunior1000@gmail.com	3	f	\N	\N	\N	0	\N	2025-05-15 18:57:24.014624	2025-05-15 18:57:24.014624	f	\N	\N	\N	\N
14	danielroitman	2270c7cbf111499750a2f47b241792f8c2692b1b840b857bd3fd00a6a470cd4af2b93073e20dffea69998f32c46678a48950a5c75a434cd5f93be4e2e18233ca.e395dd227beacfe57564c893d4e20958	Daniel Roitman Pozzatti	danielroitman@gmail.com	1	t	2025-05-22 11:24:09.826	\N	\N	0	\N	2025-05-11 06:41:36.255671	2025-05-22 11:24:09.826	f	\N	2025-05-14 05:27:22.961	\N	\N
42	Sunda2	080e542a31cb240e992184d7e14daa6cb436c741fd6a74f7273435d1093e2a254840a967d1ca6b5ee0684224964a35c9bc148aad501284f8ea6332633b71f0b0.65c69433b68dd3468527e5db7a42db15	Sunda	sunda1@gmail.com	2	f	\N	\N	\N	0	\N	2025-05-19 10:18:33.975868	2025-05-19 10:18:33.975868	f	\N	\N	\N	\N
43	medico01	42e0eca1f07e9044fa06d294e30b1907389466e77ab4d0b94b6c4d73151725b1bf97554cd9fe264c6e8eaa19032179ed89802e13356d52e089d3ec454ffe6ee5.6fca510b6a4644965049b32c7dd6d499	médico 01 Teste	felipecorreatii@gmail.com	2	t	2025-05-25 18:55:09.825	\N	\N	0	\N	2025-05-23 17:21:31.359871	2025-05-25 18:58:03.135	f	52251289	\N	/uploads/doctors/user_43/signature.jpg	/uploads/doctors/user_43/logo.jpg
12	Roitman	3bfd7e460f7a34e00f802f8a9ec2e5938f1e9d0b5187303b540c7c3af4961fee29cbb87a619cb7a23e06101aeff678554eaee75190b1f182c5f835db22d24d7f.542a63e6ec0161d592db4005a25c102d	Rodrigo Roitman Pozzatti	rodrigopozzatti@hotmail.com	1	t	2025-05-25 22:13:19.205	\N	\N	0	\N	2025-05-10 10:42:01.753193	2025-05-25 22:13:19.205	f	\N	2025-05-15 00:05:20.133	\N	\N
\.


--
-- Name: brazilian_states_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.brazilian_states_id_seq', 27, true);


--
-- Name: cid_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.cid_codes_id_seq', 58, true);


--
-- Name: doctor_hospitals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.doctor_hospitals_id_seq', 44, true);


--
-- Name: doctor_patients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.doctor_patients_id_seq', 20, true);


--
-- Name: health_insurance_providers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.health_insurance_providers_id_seq', 6, true);


--
-- Name: hospitals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.hospitals_id_seq', 26, true);


--
-- Name: medical_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.medical_orders_id_seq', 77, true);


--
-- Name: municipalities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.municipalities_id_seq', 92, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.notifications_id_seq', 3, true);


--
-- Name: opme_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.opme_items_id_seq', 6, true);


--
-- Name: opme_suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.opme_suppliers_id_seq', 3, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.order_items_id_seq', 1, false);


--
-- Name: patients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.patients_id_seq', 9, true);


--
-- Name: procedures_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.procedures_id_seq', 8, true);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.role_permissions_id_seq', 56, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.roles_id_seq', 5, true);


--
-- Name: scanned_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.scanned_documents_id_seq', 1, false);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 6, true);


--
-- Name: user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.user_permissions_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq', 43, true);


--
-- Name: brazilian_states brazilian_states_ibge_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.brazilian_states
    ADD CONSTRAINT brazilian_states_ibge_code_key UNIQUE (ibge_code);


--
-- Name: brazilian_states brazilian_states_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.brazilian_states
    ADD CONSTRAINT brazilian_states_pkey PRIMARY KEY (id);


--
-- Name: brazilian_states brazilian_states_state_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.brazilian_states
    ADD CONSTRAINT brazilian_states_state_code_key UNIQUE (state_code);


--
-- Name: cid_codes cid_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cid_codes
    ADD CONSTRAINT cid_codes_code_key UNIQUE (code);


--
-- Name: cid_codes cid_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cid_codes
    ADD CONSTRAINT cid_codes_pkey PRIMARY KEY (id);


--
-- Name: doctor_hospitals doctor_hospitals_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctor_hospitals
    ADD CONSTRAINT doctor_hospitals_pkey PRIMARY KEY (id);


--
-- Name: doctor_patients doctor_patients_doctor_id_patient_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctor_patients
    ADD CONSTRAINT doctor_patients_doctor_id_patient_id_key UNIQUE (doctor_id, patient_id);


--
-- Name: doctor_patients doctor_patients_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctor_patients
    ADD CONSTRAINT doctor_patients_pkey PRIMARY KEY (id);


--
-- Name: health_insurance_providers health_insurance_providers_ans_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.health_insurance_providers
    ADD CONSTRAINT health_insurance_providers_ans_code_key UNIQUE (ans_code);


--
-- Name: health_insurance_providers health_insurance_providers_cnpj_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.health_insurance_providers
    ADD CONSTRAINT health_insurance_providers_cnpj_key UNIQUE (cnpj);


--
-- Name: health_insurance_providers health_insurance_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.health_insurance_providers
    ADD CONSTRAINT health_insurance_providers_pkey PRIMARY KEY (id);


--
-- Name: hospitals hospitals_cnpj_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.hospitals
    ADD CONSTRAINT hospitals_cnpj_unique UNIQUE (cnpj);


--
-- Name: hospitals hospitals_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.hospitals
    ADD CONSTRAINT hospitals_pkey PRIMARY KEY (id);


--
-- Name: medical_orders medical_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_orders
    ADD CONSTRAINT medical_orders_pkey PRIMARY KEY (id);


--
-- Name: municipalities municipalities_ibge_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.municipalities
    ADD CONSTRAINT municipalities_ibge_code_key UNIQUE (ibge_code);


--
-- Name: municipalities municipalities_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.municipalities
    ADD CONSTRAINT municipalities_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: opme_items opme_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opme_items
    ADD CONSTRAINT opme_items_pkey PRIMARY KEY (id);


--
-- Name: opme_suppliers opme_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opme_suppliers
    ADD CONSTRAINT opme_suppliers_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_statuses order_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_statuses
    ADD CONSTRAINT order_statuses_pkey PRIMARY KEY (code);


--
-- Name: patients patients_cpf_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_cpf_unique UNIQUE (cpf);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: procedures procedures_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: scanned_documents scanned_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.scanned_documents
    ADD CONSTRAINT scanned_documents_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: suppliers suppliers_cnpj_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_cnpj_key UNIQUE (cnpj);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: procedures unique_procedure_code; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT unique_procedure_code UNIQUE (code);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: idx_doctor_patients_doctor_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_doctor_patients_doctor_id ON public.doctor_patients USING btree (doctor_id);


--
-- Name: idx_doctor_patients_patient_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_doctor_patients_patient_id ON public.doctor_patients USING btree (patient_id);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: doctor_hospitals doctor_hospitals_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctor_hospitals
    ADD CONSTRAINT doctor_hospitals_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE CASCADE;


--
-- Name: doctor_hospitals doctor_hospitals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctor_hospitals
    ADD CONSTRAINT doctor_hospitals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: doctor_patients doctor_patients_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctor_patients
    ADD CONSTRAINT doctor_patients_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: doctor_patients doctor_patients_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctor_patients
    ADD CONSTRAINT doctor_patients_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: medical_orders fk_medical_orders_status; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_orders
    ADD CONSTRAINT fk_medical_orders_status FOREIGN KEY (status_code) REFERENCES public.order_statuses(code);


--
-- Name: medical_orders medical_orders_cid_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_orders
    ADD CONSTRAINT medical_orders_cid_code_id_fkey FOREIGN KEY (cid_code_id) REFERENCES public.cid_codes(id);


--
-- Name: medical_orders medical_orders_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_orders
    ADD CONSTRAINT medical_orders_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id);


--
-- Name: medical_orders medical_orders_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_orders
    ADD CONSTRAINT medical_orders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: medical_orders medical_orders_procedure_cbhpm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_orders
    ADD CONSTRAINT medical_orders_procedure_cbhpm_id_fkey FOREIGN KEY (procedure_cbhpm_id) REFERENCES public.procedures(id);


--
-- Name: medical_orders medical_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_orders
    ADD CONSTRAINT medical_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: municipalities municipalities_state_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.municipalities
    ADD CONSTRAINT municipalities_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.brazilian_states(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: opme_suppliers opme_suppliers_opme_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opme_suppliers
    ADD CONSTRAINT opme_suppliers_opme_item_id_fkey FOREIGN KEY (opme_item_id) REFERENCES public.opme_items(id);


--
-- Name: opme_suppliers opme_suppliers_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opme_suppliers
    ADD CONSTRAINT opme_suppliers_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: suppliers suppliers_municipality_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_municipality_id_fkey FOREIGN KEY (municipality_id) REFERENCES public.municipalities(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

