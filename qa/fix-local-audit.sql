-- Compatibilidade exclusiva da API com o banco QA local.
BEGIN;
DO $$ BEGIN
  IF current_database() <> 'mottainai_qa' THEN
    RAISE EXCEPTION 'Ajuste permitido somente no banco QA local';
  END IF;
END $$;
CREATE OR REPLACE FUNCTION mottainai.fn_api_record_audit(
  p_table VARCHAR, p_operation mottainai.audit_operation, p_record_id VARCHAR,
  p_actor_user_id INTEGER, p_old_data JSONB, p_new_data JSONB
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = mottainai, pg_temp
AS $$
DECLARE
  v_user_id INTEGER := mottainai.fn_get_current_user_id();
  v_company_id INTEGER := mottainai.fn_get_current_company_id();
  v_store_id INTEGER := mottainai.fn_get_current_store_id();
BEGIN
  IF v_user_id IS NULL OR v_company_id IS NULL OR v_store_id IS NULL
     OR p_actor_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Contexto de auditoria inválido' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM mottainai.app_user u
    JOIN mottainai.employee e ON e.employee_id = u.employee_id
    JOIN mottainai.retail_store s ON s.store_id = e.store_id
    WHERE u.user_id = v_user_id AND s.company_id = v_company_id
      AND s.store_id = v_store_id AND u.deleted_at IS NULL AND e.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Contexto de auditoria inválido' USING ERRCODE = '42501';
  END IF;
  IF p_record_id IS NULL OR btrim(p_record_id) = '' OR p_operation IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM pg_catalog.pg_trigger t
       JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
       JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'mottainai' AND c.relname = p_table
         AND t.tgfoid = 'mottainai.fn_trg_audit_log()'::regprocedure
         AND NOT t.tgisinternal
     ) THEN
    RAISE EXCEPTION 'Registro de auditoria inválido';
  END IF;
  INSERT INTO mottainai.audit_log(
    table_affected, operation, record_id, user_id, old_data, new_data,
    company_id, store_id, client_ip, application_name, transaction_id
  ) VALUES (
    p_table, p_operation, p_record_id, v_user_id,
    mottainai.fn_sanitize_audit_json(p_old_data), mottainai.fn_sanitize_audit_json(p_new_data),
    v_company_id, v_store_id, inet_client_addr(),
    current_setting('application_name', TRUE), txid_current()
  );
  RETURN TRUE;
END $$;
REVOKE ALL ON FUNCTION mottainai.fn_api_record_audit(VARCHAR, mottainai.audit_operation, VARCHAR, INTEGER, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mottainai.fn_api_record_audit(VARCHAR, mottainai.audit_operation, VARCHAR, INTEGER, JSONB, JSONB) TO mottainai_qa_app;
COMMIT;
