$ErrorActionPreference = 'Stop'
# Exclusivo do banco QA local já autorizado. Não altera registros existentes.
$databaseContainer = 'mottainai-local-qa-postgres-1'
$apiContainer = 'mottainai-local-qa-api-1'
$email = 'estoquista@mottainai.com'
$firebaseUid = '6Rq1eHXeCTPcfrKRb9fitRux9aJ2'

$apiEnvironment = @{}
$entries = docker inspect $apiContainer --format '{{json .Config.Env}}' | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível consultar o container local.' }
foreach ($entry in $entries) {
  $pair = $entry -split '=', 2
  $apiEnvironment[$pair[0]] = $pair[1]
}
if ($apiEnvironment['FIREBASE_PROJECT_ID'] -ne 'mottainai-operacional') { throw 'Projeto Firebase inesperado.' }
$encryptionKey = [Convert]::FromBase64String($apiEnvironment['STAFF_DATA_ENCRYPTION_KEY'])
$lookupKey = [Convert]::FromBase64String($apiEnvironment['STAFF_DATA_LOOKUP_KEY'])
$keyVersion = if ($apiEnvironment.ContainsKey('STAFF_DATA_KEY_VERSION')) { [int]$apiEnvironment['STAFF_DATA_KEY_VERSION'] } else { 1 }
if ($encryptionKey.Length -ne 32 -or $lookupKey.Length -ne 32 -or $keyVersion -lt 1) { throw 'Configuração criptográfica inválida.' }

function Protect-StaffField([string]$field, [string]$value) {
  $nonce = [Security.Cryptography.RandomNumberGenerator]::GetBytes(12)
  $plaintext = [Text.Encoding]::UTF8.GetBytes($value)
  $ciphertext = [byte[]]::new($plaintext.Length)
  $tag = [byte[]]::new(16)
  $aes = [Security.Cryptography.AesGcm]::new($encryptionKey, 16)
  try {
    $aes.Encrypt($nonce, $plaintext, $ciphertext, $tag, [Text.Encoding]::UTF8.GetBytes("mottainai:operational:$field"))
    return @{ Cipher = [Convert]::ToHexString([byte[]]($ciphertext + $tag)); Nonce = [Convert]::ToHexString($nonce) }
  } finally { $aes.Dispose() }
}
function Get-Lookup([string]$value) {
  $hmac = [Security.Cryptography.HMACSHA256]::new($lookupKey)
  try { return [Convert]::ToHexString($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($value))) }
  finally { $hmac.Dispose() }
}
$name = Protect-StaffField 'employee.name' 'Estoquista TESTE LOCAL'
$cpf = Protect-StaffField 'staff.cpf' '52998224725'
$contact = Protect-StaffField 'employee.email' $email
$cpfLookup = Get-Lookup '52998224725'
$emailLookup = Get-Lookup "EMAIL:$email"
$token = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_')
$tokenHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($token))).ToLowerInvariant()

$sql = @"
BEGIN;
SET LOCAL search_path = mottainai, public;
SELECT pg_advisory_xact_lock(764210);
DO `$$ BEGIN
  IF current_database() <> 'mottainai_qa' THEN RAISE EXCEPTION 'Banco inesperado'; END IF;
  IF EXISTS (SELECT 1 FROM company) OR EXISTS (SELECT 1 FROM retail_store)
     OR EXISTS (SELECT 1 FROM employee) OR EXISTS (SELECT 1 FROM app_user)
  THEN RAISE EXCEPTION 'Bootstrap interrompido: existem cadastros; nenhum será substituído'; END IF;
  IF NOT EXISTS (SELECT 1 FROM subscription_plan WHERE name='Free' AND active)
     OR NOT EXISTS (SELECT 1 FROM employee_role WHERE name='Operator' AND active)
  THEN RAISE EXCEPTION 'Plano ou cargo esperado ausente'; END IF;
END `$$;
WITH company_created AS (
  INSERT INTO company(plan_id,official_name,trade_name,cnpj,email)
  SELECT plan_id,'Empresa TESTE LOCAL','Empresa TESTE LOCAL','11222333000181',
    'EMAIL_SHA256_' || encode(digest('empresa-teste@example.invalid','sha256'),'hex')
  FROM subscription_plan WHERE name='Free' AND active RETURNING company_id
), address_created AS (
  INSERT INTO address(zip_code,street,number,neighborhood,city,state)
  VALUES ('00000000','Rua TESTE LOCAL','0','Bairro TESTE LOCAL','Cidade TESTE LOCAL','SP') RETURNING address_id
), store_created AS (
  INSERT INTO retail_store(company_id,address_id,name,cnpj)
  SELECT company_id,address_id,'Loja TESTE LOCAL','11222333000262'
  FROM company_created CROSS JOIN address_created RETURNING store_id
), employee_created AS (
  INSERT INTO employee(store_id,role_id,active,cpf_lookup_hmac,email_lookup_hmac)
  SELECT store_id,role_id,false,decode('$cpfLookup','hex'),decode('$emailLookup','hex')
  FROM store_created CROSS JOIN employee_role WHERE name='Operator' AND active RETURNING employee_id
), private_created AS (
  INSERT INTO employee_private_data(employee_id,name_ciphertext,name_nonce,name_masked,
    cpf_ciphertext,cpf_nonce,cpf_masked,email_ciphertext,email_nonce,email_masked,
    key_version,algorithm,protection_state,encrypted_at)
  SELECT employee_id,decode('$($name.Cipher)','hex'),decode('$($name.Nonce)','hex'),'***',
    decode('$($cpf.Cipher)','hex'),decode('$($cpf.Nonce)','hex'),'***.***.***-**',
    decode('$($contact.Cipher)','hex'),decode('$($contact.Nonce)','hex'),'***@***',
    $keyVersion,'AES-256-GCM','ENCRYPTED',CURRENT_TIMESTAMP
  FROM employee_created RETURNING employee_id
), user_created AS (
  INSERT INTO app_user(employee_id,password_hash,active,password_set,firebase_uid)
  SELECT employee_id,crypt(encode(gen_random_bytes(32),'hex'),gen_salt('bf',10)),false,false,'$firebaseUid'
  FROM private_created RETURNING user_id
)
INSERT INTO password_reset_token(user_id,token_hash,code_hash,token_type,expires_at)
SELECT user_id,'$tokenHash','$tokenHash','EMPLOYEE_INVITATION',CURRENT_TIMESTAMP + INTERVAL '24 hours'
FROM user_created;
COMMIT;
"@
$sql | docker exec -i $databaseContainer psql -X -U qa_admin -d mottainai_qa -v ON_ERROR_STOP=1 -q
if ($LASTEXITCODE -ne 0) { throw 'Bootstrap não concluído. A transação foi revertida.' }
$validation = Invoke-RestMethod -Uri "http://127.0.0.1:18080/api/v1/auth/password-reset/validate?token=$token" -TimeoutSec 10
if (-not $validation.valid) { throw 'Cadastros criados, mas o convite precisa de verificação.' }
Write-Output 'Cadastros de teste local criados; convite reconhecido pela API.'
Write-Output "http://127.0.0.1:5174/activate-access#token=$token"
