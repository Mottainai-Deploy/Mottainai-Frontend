-- Ajuste restrito ao banco QA local; a função apenas valida o formato do hash.
BEGIN;
DO $$
BEGIN
  IF current_database() <> 'mottainai_qa' THEN
    RAISE EXCEPTION 'Este ajuste só pode ser aplicado no banco QA local';
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION mottainai.fn_is_bcrypt_hash(TEXT) TO mottainai_qa_app;
COMMIT;
