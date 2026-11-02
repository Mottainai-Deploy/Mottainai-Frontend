\set ON_ERROR_STOP on
BEGIN;
SET LOCAL search_path = mottainai, public;
SELECT pg_advisory_xact_lock(20261102, 15432);

DO $$ BEGIN
    IF current_database() <> 'mottainai_seed_test'
       OR NOT EXISTS (SELECT 1 FROM qa_fixture.environment WHERE ready) THEN
        RAISE EXCEPTION 'Carga permitida apenas no ambiente isolado de testes';
    END IF;
END $$;
SELECT EXISTS (SELECT 1 FROM qa_fixture.seed_version WHERE version = 1) AS already_loaded \gset
\if :already_loaded
    \echo 'Carga v1 já aplicada; registros preservados.'
\else
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM company) OR EXISTS (SELECT 1 FROM product)
       OR EXISTS (SELECT 1 FROM retail_store) OR EXISTS (SELECT 1 FROM supplier)
       OR EXISTS (SELECT 1 FROM employee) OR EXISTS (SELECT 1 FROM app_user) THEN
        RAISE EXCEPTION 'Banco já possui cadastros. Carga cancelada sem substituir dados.';
    END IF;
END $$;

-- CNPJ sintético com dígitos verificadores. Não representa cadastro real.
CREATE FUNCTION pg_temp.test_cnpj(base BIGINT) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    digits TEXT := lpad(base::text, 12, '0');
    weights INTEGER[];
    total INTEGER;
    digit INTEGER;
    pass INTEGER;
    position INTEGER;
BEGIN
    FOR pass IN 1..2 LOOP
        weights := CASE WHEN pass = 1 THEN ARRAY[5,4,3,2,9,8,7,6,5,4,3,2]
                        ELSE ARRAY[6,5,4,3,2,9,8,7,6,5,4,3,2] END;
        total := 0;
        FOR position IN 1..length(digits) LOOP
            total := total + substring(digits, position, 1)::int * weights[position];
        END LOOP;
        digit := CASE WHEN total % 11 < 2 THEN 0 ELSE 11 - total % 11 END;
        digits := digits || digit::text;
    END LOOP;
    RETURN digits;
END $$;

-- Partições históricas exigidas pelas vendas dos últimos 30 dias.
DO $$
DECLARE table_name TEXT; month_start DATE;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['sales_transaction','inventory_movement','purchase_order','audit_log'] LOOP
        FOR month_start IN SELECT generate_series(date_trunc('month', current_date) - interval '2 months',
                                                  date_trunc('month', current_date) + interval '1 month',
                                                  interval '1 month')::date LOOP
            EXECUTE format('CREATE TABLE IF NOT EXISTS mottainai.%I PARTITION OF mottainai.%I FOR VALUES FROM (%L) TO (%L)',
                table_name || '_' || to_char(month_start, 'YYYY_MM'), table_name, month_start, month_start + interval '1 month');
        END LOOP;
    END LOOP;
END $$;

INSERT INTO company (plan_id, official_name, trade_name, cnpj, email)
SELECT plan_id, 'Empresa SINTETICA QA', 'Mottainai TESTE', pg_temp.test_cnpj(900000000001),
       'EMAIL_SHA256_' || encode(digest('empresa-qa@example.invalid', 'sha256'), 'hex')
FROM subscription_plan WHERE name = 'Professional';

INSERT INTO address (zip_code, street, number, neighborhood, city, state)
SELECT '00000000', 'Rua SINTETICA QA', n::text, 'Bairro TESTE', 'Cidade TESTE', 'SP'
FROM generate_series(1, 3) n;

INSERT INTO retail_store (company_id, address_id, name, cnpj)
SELECT c.company_id, a.address_id, 'Loja TESTE ' || a.number,
       pg_temp.test_cnpj(900000000100 + a.number::int)
FROM company c CROSS JOIN address a;

-- Funcionários técnicos inativos, sem dados pessoais e sem conta de login.
INSERT INTO employee (store_id, role_id, active)
SELECT s.store_id, r.role_id, false FROM retail_store s
CROSS JOIN employee_role r WHERE r.name = 'Manager';

INSERT INTO supplier (address_id, trade_name, cnpj, email)
SELECT (SELECT min(address_id) FROM address), 'Fornecedor SINTETICO ' || n, pg_temp.test_cnpj(900000000200 + n),
       'EMAIL_SHA256_' || encode(digest('fornecedor-' || n || '@example.invalid', 'sha256'), 'hex')
FROM generate_series(1, 8) n;

INSERT INTO product (company_id, category_id, tax_profile_id, sku, barcode, ncm,
                     name, description, brand, unit_measure, avg_cost, suggested_price)
SELECT c.company_id, cat.category_id, t.tax_profile_id, 'QA-' || lpad(n::text, 4, '0'),
       'QA-BARCODE-' || lpad(n::text, 4, '0'), '00000000',
       (ARRAY['Arroz','Feijao','Leite','Cafe','Suco','Agua','Detergente','Sabonete'])[(n-1)%8+1] || ' TESTE ' || lpad(n::text, 3, '0'),
       'Produto sintetico para teste; sem validade fiscal', 'Marca TESTE', 'UN',
       round((2 + n * 0.15)::numeric, 2), round((3 + n * 0.25)::numeric, 2)
FROM generate_series(1, 120) n CROSS JOIN company c
JOIN product_category cat ON cat.name = (ARRAY['Food','Beverages','Cleaning','Personal Care'])[(n-1)%4+1]
CROSS JOIN tax_profile t WHERE t.code = 'DEFAULT';

-- IDs de sequences podem avançar após rollback; cenários usam posição, não ID fixo.
CREATE TEMP TABLE fixture_product ON COMMIT DROP AS
SELECT p.*, row_number() OVER (ORDER BY product_id)::int AS ordinal FROM product p;

INSERT INTO store_product_price (store_id, product_id, regular_price)
SELECT s.store_id, p.product_id, p.suggested_price FROM retail_store s CROSS JOIN product p;

INSERT INTO supplier_product (supplier_id, product_id, purchase_price, lead_time)
SELECT s.supplier_id, p.product_id, p.avg_cost, 2 + p.ordinal%6
FROM fixture_product p JOIN supplier s ON s.trade_name = 'Fornecedor SINTETICO ' || ((p.ordinal-1)%8+1);

-- Três lotes por produto, um em cada loja; datas relativas ao dia da carga.
INSERT INTO batch (product_id, batch_code, manufacture_date, expiration_date, initial_quantity, unit_cost)
SELECT p.product_id, 'QA-P' || p.product_id || '-S' || s.store_id, current_date - 120,
       current_date + (ARRAY[-3,0,2,5,10,30,60,90])[(p.ordinal-1)%8+1], 500, p.avg_cost
FROM fixture_product p CROSS JOIN retail_store s;

INSERT INTO inventory (store_id, batch_id, current_quantity, minimum_quantity, maximum_quantity, location)
SELECT s.store_id, b.batch_id, 500, 10, 100, 'Deposito TESTE'
FROM batch b JOIN retail_store s ON b.batch_code LIKE '%-S' || s.store_id;

INSERT INTO inventory_movement (inventory_id, store_id, movement_date, movement_type, moved_quantity, previous_balance, current_balance, observation)
SELECT inventory_id, store_id, current_date - 31 + time '07:00', 'IN', 500, 0, 500, 'QA: saldo inicial sintetico' FROM inventory;

-- Um caixa fechado por loja/dia para manter datas de venda e turno coerentes.
INSERT INTO pos_terminal (store_id, terminal_code, name)
SELECT store_id, 'QA-01', 'Caixa TESTE' FROM retail_store;
INSERT INTO pos_shift (terminal_id, employee_id, opened_at, closed_at, opening_amount, closing_amount, status)
SELECT t.terminal_id, e.employee_id, current_date - d + time '08:00',
       current_date - d + time '20:00', 0, 0, 'CLOSED'
FROM pos_terminal t JOIN employee e ON e.store_id = t.store_id CROSS JOIN generate_series(1,30) d;

-- 900 vendas, cada uma com 2 itens e pagamento PIX. Movimentações registram a baixa.
DO $$
DECLARE sh RECORD; prod RECORD; inv RECORD; sale_key INTEGER; sale_time TIMESTAMP;
        total NUMERIC; slot INTEGER; row_number INTEGER := 0;
BEGIN
    FOR sh IN SELECT ps.*, t.store_id FROM pos_shift ps JOIN pos_terminal t USING(terminal_id) ORDER BY opened_at, t.store_id LOOP
        FOR slot IN 1..10 LOOP
            row_number := row_number + 1;
            sale_time := sh.opened_at + slot * interval '30 minutes';
            INSERT INTO sales_transaction (store_id, employee_id, shift_id, sale_date, total_amount, observation)
            VALUES (sh.store_id, sh.employee_id, sh.shift_id, sale_time, 0, 'Venda SINTETICA QA') RETURNING sale_id INTO sale_key;
            total := 0;
            FOR prod IN SELECT * FROM fixture_product WHERE ordinal IN (((row_number-1)%15)*8+6, ((row_number-1)%15)*8+7) LOOP
                SELECT i.* INTO STRICT inv FROM inventory i JOIN batch b USING(batch_id)
                WHERE i.store_id = sh.store_id AND b.product_id = prod.product_id;
                INSERT INTO sale_item (sale_id, sale_date, product_id, batch_id, quantity_sold, unit_price)
                VALUES (sale_key, sale_time, prod.product_id, inv.batch_id, 1, prod.suggested_price);
                INSERT INTO inventory_movement (inventory_id, store_id, employee_id, movement_date, movement_type,
                                                moved_quantity, previous_balance, current_balance, observation)
                VALUES (inv.inventory_id, sh.store_id, sh.employee_id, sale_time, 'OUT', -1,
                        inv.current_quantity, inv.current_quantity-1, 'QA: venda sintetica');
                UPDATE inventory SET current_quantity = current_quantity - 1 WHERE inventory_id = inv.inventory_id;
                total := total + prod.suggested_price;
            END LOOP;
            UPDATE sales_transaction SET total_amount = total WHERE sale_id = sale_key AND sale_date = sale_time;
            INSERT INTO sale_payment (sale_id, sale_date, payment_method, amount, paid_at)
            VALUES (sale_key, sale_time, 'PIX', total, sale_time);
        END LOOP;
    END LOOP;
END $$;

-- Pagamentos PIX não aumentam o dinheiro físico da gaveta do caixa.
UPDATE pos_shift SET closing_amount = 0, expected_amount = 0;

-- Ajuste explícito para criar cenários de ruptura, baixo estoque e excesso.
INSERT INTO inventory_movement (inventory_id, store_id, movement_type, moved_quantity, previous_balance, current_balance, observation)
SELECT i.inventory_id, i.store_id, 'ADJUSTMENT', target.quantity-i.current_quantity, i.current_quantity, target.quantity,
       'QA: ajuste para cenario de estoque'
FROM inventory i JOIN batch b USING(batch_id) JOIN fixture_product p USING(product_id)
CROSS JOIN LATERAL (SELECT (ARRAY[0,3,8,40,80,150])[(p.ordinal-1)%6+1]::numeric quantity) target
WHERE target.quantity <> i.current_quantity;
UPDATE inventory i SET current_quantity = (ARRAY[0,3,8,40,80,150])[(p.ordinal-1)%6+1]
FROM batch b JOIN fixture_product p USING(product_id) WHERE b.batch_id = i.batch_id;

INSERT INTO alert (store_id, title, description, alert_type, priority)
SELECT i.store_id, 'QA vencimento: ' || p.name, 'Lote ' || b.batch_code || '; vencimento ' || b.expiration_date,
       'EXPIRATION', CASE WHEN b.expiration_date <= current_date THEN 'CRITICAL'::priority_level ELSE 'HIGH'::priority_level END
FROM inventory i JOIN batch b USING(batch_id) JOIN product p USING(product_id)
WHERE b.expiration_date <= current_date + 10 AND i.current_quantity > 0;
INSERT INTO alert (store_id, title, description, alert_type, priority)
SELECT store_id, 'QA estoque: ' || inventory_id, 'Cenario sintetico de saldo ' || current_quantity,
       CASE WHEN current_quantity = 0 THEN 'RUPTURE'::alert_type ELSE 'CRITICAL_STOCK'::alert_type END, 'HIGH'
FROM inventory WHERE current_quantity < minimum_quantity;
INSERT INTO suggested_action (alert_id, action_type, description, priority)
SELECT alert_id, CASE WHEN alert_type = 'EXPIRATION' THEN 'PROMOTION'::suggested_action_type ELSE 'PURCHASE_ORDER'::suggested_action_type END,
       'Sugestao SINTETICA QA para validacao; requer analise humana', priority FROM alert;

-- Pedidos/recebimentos pendentes: ainda não representam entrada de estoque.
INSERT INTO purchase_order (store_id, supplier_id, employee_id, expected_delivery_date, observation, total_amount)
SELECT s.store_id, sp.supplier_id, e.employee_id, current_date + 3, 'Pedido SINTETICO QA', sp.purchase_price * 20
FROM retail_store s JOIN employee e USING(store_id) CROSS JOIN supplier_product sp
JOIN fixture_product p USING(product_id) WHERE p.ordinal <= 8;
INSERT INTO purchase_order_item (purchase_order_id, order_date, product_id, requested_quantity, unit_price)
SELECT po.purchase_order_id, po.order_date, sp.product_id, 20, sp.purchase_price
FROM purchase_order po JOIN supplier_product sp USING(supplier_id)
JOIN fixture_product p USING(product_id) WHERE p.ordinal <= 8;
INSERT INTO receiving (purchase_order_id, order_date, employee_id, observation)
SELECT purchase_order_id, order_date, employee_id, 'Recebimento QA pendente; sem itens e sem entrada'
FROM purchase_order;

INSERT INTO promotion (store_id, name, description, promotion_type, starts_at, ends_at)
SELECT store_id, 'Promocao TESTE pendente', 'Sem aprovacao; nao altera precos', 'SPECIAL_PRICE', now(), now() + interval '7 days'
FROM retail_store;
INSERT INTO promotion_item (promotion_id, product_id, original_price, promotional_price, quantity_available)
SELECT pr.promotion_id, p.product_id, p.suggested_price, round(p.suggested_price*0.8,2), 10
FROM promotion pr CROSS JOIN fixture_product p WHERE p.ordinal <= 5;

INSERT INTO transfer (source_store_id, destination_store_id, employee_id, observation)
SELECT s.store_id, (SELECT min(store_id) FROM retail_store WHERE store_id <> s.store_id), e.employee_id, 'Transferencia QA solicitada; sem baixa'
FROM retail_store s JOIN employee e USING(store_id);
INSERT INTO transfer_item (transfer_id, batch_id, transferred_quantity)
SELECT t.transfer_id, i.batch_id, 2 FROM transfer t JOIN inventory i ON i.store_id = t.source_store_id
JOIN batch b USING(batch_id) JOIN fixture_product p USING(product_id) WHERE p.ordinal = 4;

INSERT INTO donation (store_id, employee_id, institution, observation)
SELECT store_id, employee_id, 'Instituicao SINTETICA QA', 'Registrada; entrega ainda nao realizada' FROM employee;
INSERT INTO donation_item (donation_id, batch_id, donated_quantity)
SELECT d.donation_id, i.batch_id, 2 FROM donation d JOIN inventory i USING(store_id)
JOIN batch b USING(batch_id) JOIN fixture_product p USING(product_id) WHERE p.ordinal = 5;

INSERT INTO replenishment_pre_list (store_id, employee_id) SELECT store_id, employee_id FROM employee;
INSERT INTO replenishment_pre_list_item (pre_list_id, product_id, suggested_quantity, priority)
SELECT pre_list_id, p.product_id, 10, 'HIGH' FROM replenishment_pre_list CROSS JOIN fixture_product p WHERE p.ordinal <= 5;

INSERT INTO qa_fixture.seed_version (version, reference_date) VALUES (1, current_date);
\endif
COMMIT;
