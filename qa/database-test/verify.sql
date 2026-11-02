\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL search_path = mottainai, public;
DO $$ BEGIN
    IF current_database() <> 'mottainai_seed_test' THEN RAISE EXCEPTION 'Banco inesperado'; END IF;
    IF NOT EXISTS (SELECT 1 FROM qa_fixture.seed_version WHERE version = 1) THEN RAISE EXCEPTION 'Carga incompleta'; END IF;
    IF (SELECT count(*) FROM company) <> 1 OR (SELECT count(*) FROM retail_store) <> 3
       OR (SELECT count(*) FROM product) <> 120 OR (SELECT count(*) FROM supplier) <> 8
       OR (SELECT count(*) FROM batch) <> 360 OR (SELECT count(*) FROM inventory) <> 360
       OR (SELECT count(*) FROM store_product_price) <> 360
       OR (SELECT count(*) FROM sales_transaction) <> 900 OR (SELECT count(*) FROM sale_item) <> 1800
       OR (SELECT count(*) FROM sale_payment) <> 900 THEN
        RAISE EXCEPTION 'Contagens diferentes da carga v1';
    END IF;
    IF EXISTS (
        SELECT 1 FROM sales_transaction s
        LEFT JOIN (SELECT sale_id, sale_date, sum(subtotal) amount FROM sale_item GROUP BY sale_id, sale_date) i USING(sale_id,sale_date)
        LEFT JOIN (SELECT sale_id, sale_date, sum(amount) amount FROM sale_payment GROUP BY sale_id, sale_date) p USING(sale_id,sale_date)
        WHERE s.total_amount IS DISTINCT FROM i.amount OR s.total_amount IS DISTINCT FROM p.amount
    ) THEN RAISE EXCEPTION 'Venda com total, itens ou pagamentos divergentes'; END IF;
    IF EXISTS (
        SELECT 1 FROM inventory i LEFT JOIN
        (SELECT inventory_id, sum(moved_quantity) quantity FROM inventory_movement GROUP BY inventory_id) m USING(inventory_id)
        WHERE i.current_quantity IS DISTINCT FROM m.quantity
    ) THEN RAISE EXCEPTION 'Saldo diferente da soma das movimentacoes'; END IF;
    IF EXISTS (
        SELECT 1 FROM (SELECT previous_balance,
            lag(current_balance, 1, 0::numeric) OVER (PARTITION BY inventory_id ORDER BY movement_date, movement_id) expected
            FROM inventory_movement) m WHERE previous_balance <> expected
    ) THEN RAISE EXCEPTION 'Sequencia de saldos inconsistente'; END IF;
    IF EXISTS (
        SELECT 1 FROM sale_item si JOIN batch b USING(batch_id) JOIN sales_transaction s USING(sale_id,sale_date)
        JOIN inventory i ON i.batch_id = b.batch_id AND i.store_id = s.store_id
        WHERE b.product_id <> si.product_id OR b.expiration_date < si.sale_date::date
    ) THEN RAISE EXCEPTION 'Venda com lote incompativel ou vencido'; END IF;
    IF EXISTS (
        SELECT 1 FROM purchase_order po LEFT JOIN
        (SELECT purchase_order_id, order_date, sum(subtotal) amount FROM purchase_order_item GROUP BY purchase_order_id, order_date) i
        USING(purchase_order_id,order_date) WHERE po.total_amount IS DISTINCT FROM i.amount
    ) THEN RAISE EXCEPTION 'Total de pedido divergente'; END IF;
    IF EXISTS (SELECT 1 FROM app_user) THEN
        IF to_regclass('qa_fixture.api_user_mapping') IS NULL THEN
            RAISE EXCEPTION 'Contas presentes sem importacao registrada';
        END IF;
        IF EXISTS (SELECT 1 FROM app_user u LEFT JOIN qa_fixture.api_user_mapping m
                   ON m.target_user_id = u.user_id WHERE m.target_user_id IS NULL) THEN
            RAISE EXCEPTION 'Contas adicionais nao pertencem a importacao inicial';
        END IF;
    END IF;
    IF (SELECT count(*) FROM purchase_order) <> 24 OR (SELECT count(*) FROM receiving) <> 24
       OR (SELECT count(*) FROM promotion) <> 3 OR (SELECT count(*) FROM transfer) <> 3
       OR (SELECT count(*) FROM donation) <> 3 OR (SELECT count(*) FROM replenishment_pre_list) <> 3
       OR (SELECT count(*) FROM alert) <> 360 OR (SELECT count(*) FROM suggested_action) <> 360 THEN
        RAISE EXCEPTION 'Contagem de operacoes pendentes divergente';
    END IF;
    IF EXISTS (SELECT 1 FROM receiving WHERE status <> 'PENDING')
       OR EXISTS (SELECT 1 FROM promotion WHERE active OR status <> 'PENDING_APPROVAL')
       OR EXISTS (SELECT 1 FROM transfer WHERE status <> 'REQUESTED')
       OR EXISTS (SELECT 1 FROM donation WHERE status <> 'REGISTERED') THEN
        RAISE EXCEPTION 'Operacao pendente com estado inesperado';
    END IF;
    IF EXISTS (SELECT 1 FROM pos_shift WHERE closing_amount <> 0 OR expected_amount IS DISTINCT FROM 0::numeric) THEN
        RAISE EXCEPTION 'PIX nao deve aumentar o dinheiro fisico do caixa';
    END IF;
END $$;

SELECT 'lojas' AS entidade, count(*) AS quantidade FROM retail_store
UNION ALL SELECT 'fornecedores', count(*) FROM supplier
UNION ALL SELECT 'produtos', count(*) FROM product
UNION ALL SELECT 'precos por loja', count(*) FROM store_product_price
UNION ALL SELECT 'lotes', count(*) FROM batch
UNION ALL SELECT 'estoques', count(*) FROM inventory
UNION ALL SELECT 'movimentacoes', count(*) FROM inventory_movement
UNION ALL SELECT 'vendas', count(*) FROM sales_transaction
UNION ALL SELECT 'itens de venda', count(*) FROM sale_item
UNION ALL SELECT 'pagamentos', count(*) FROM sale_payment
UNION ALL SELECT 'alertas', count(*) FROM alert
UNION ALL SELECT 'sugestoes', count(*) FROM suggested_action
UNION ALL SELECT 'pedidos', count(*) FROM purchase_order
UNION ALL SELECT 'recebimentos pendentes', count(*) FROM receiving
UNION ALL SELECT 'promocoes pendentes', count(*) FROM promotion
UNION ALL SELECT 'transferencias solicitadas', count(*) FROM transfer
UNION ALL SELECT 'doacoes registradas', count(*) FROM donation
UNION ALL SELECT 'pre-listas', count(*) FROM replenishment_pre_list;
COMMIT;
\echo 'OK: contagens, totais financeiros, lotes e saldos verificados.'
