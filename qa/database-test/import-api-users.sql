\set ON_ERROR_STOP on
BEGIN;
SET LOCAL search_path = mottainai, public;
SELECT pg_advisory_xact_lock(20261102, 15432);
DO $$ BEGIN
    IF current_database() <> 'mottainai_seed_test'
       OR NOT EXISTS (SELECT 1 FROM qa_fixture.seed_version WHERE version = 1) THEN
        RAISE EXCEPTION 'Importacao restrita ao banco da carga de testes';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS qa_fixture.api_user_mapping (
    source_user_id INTEGER PRIMARY KEY,
    target_user_id INTEGER NOT NULL UNIQUE REFERENCES mottainai.app_user(user_id),
    target_employee_id INTEGER NOT NULL UNIQUE REFERENCES mottainai.employee(employee_id),
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TEMP TABLE access_import (payload JSONB) ON COMMIT DROP;
INSERT INTO access_import VALUES (convert_from(decode(:'access_payload_hex', 'hex'), 'UTF8')::jsonb);

DO $$
DECLARE
    item JSONB;
    source_employee mottainai.employee;
    source_user mottainai.app_user;
    target_store INTEGER;
    target_role INTEGER;
    target_employee INTEGER;
    target_user INTEGER;
BEGIN
    SELECT min(store_id) INTO STRICT target_store FROM retail_store WHERE active AND deleted_at IS NULL;
    IF target_store IS NULL THEN RAISE EXCEPTION 'Loja de teste ausente'; END IF;
    FOR item IN SELECT jsonb_array_elements(payload) FROM access_import LOOP
        source_user := jsonb_populate_record(NULL::mottainai.app_user, item->'user');
        source_employee := jsonb_populate_record(NULL::mottainai.employee, item->'employee');
        SELECT m.target_user_id INTO target_user FROM qa_fixture.api_user_mapping m WHERE m.source_user_id = source_user.user_id;
        IF FOUND THEN
            IF NOT EXISTS (SELECT 1 FROM app_user WHERE user_id = target_user AND firebase_uid = source_user.firebase_uid) THEN
                RAISE EXCEPTION 'Mapeamento de conta divergente; nenhuma conta foi substituida';
            END IF;
            CONTINUE;
        END IF;
        IF NOT source_user.active OR NOT source_user.password_set OR source_user.deleted_at IS NOT NULL
           OR NOT source_employee.active OR source_employee.deleted_at IS NOT NULL
           OR item->'private'->>'protection_state' IS DISTINCT FROM 'ENCRYPTED' THEN
            RAISE EXCEPTION 'Conta de origem nao esta pronta para uso';
        END IF;
        IF EXISTS (SELECT 1 FROM app_user WHERE firebase_uid = source_user.firebase_uid) THEN
            RAISE EXCEPTION 'Identidade ja cadastrada sem mapeamento; importacao interrompida';
        END IF;
        SELECT role_id INTO STRICT target_role FROM employee_role
        WHERE name = item->>'role_name' AND active AND deleted_at IS NULL;
        INSERT INTO employee (store_id, role_id, active, hire_date, cpf_lookup_hmac, email_lookup_hmac)
        VALUES (target_store, target_role, source_employee.active, source_employee.hire_date,
                source_employee.cpf_lookup_hmac, source_employee.email_lookup_hmac)
        RETURNING employee_id INTO target_employee;
        INSERT INTO employee_private_data
        SELECT (jsonb_populate_record(NULL::mottainai.employee_private_data,
                 item->'private' || jsonb_build_object('employee_id', target_employee))).*;
        INSERT INTO app_user (employee_id, password_hash, active, password_set, token_version, firebase_uid)
        VALUES (target_employee, source_user.password_hash, source_user.active, source_user.password_set,
                coalesce(source_user.token_version, 0) + 1, source_user.firebase_uid)
        RETURNING user_id INTO target_user;
        INSERT INTO qa_fixture.api_user_mapping (source_user_id, target_user_id, target_employee_id)
        VALUES (source_user.user_id, target_user, target_employee);
    END LOOP;
END $$;
COMMIT;
