import type { OperationDateRange } from '@/types/stock-disposal.types';
import type { OperationalQuery } from '@/types/operational-query.types';

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Informe as datas inicial e final.');
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error('Informe datas válidas.');
  return parsed;
}

export function operationDateParams(range: OperationDateRange): URLSearchParams {
  const start = parseDate(range.from);
  const end = parseDate(range.to);
  if (end < start) throw new Error('A data final deve ser igual ou posterior à inicial.');
  const limit = new Date(start);
  limit.setUTCDate(1);
  limit.setUTCMonth(limit.getUTCMonth() + 6);
  const lastDate = new Date(limit);
  lastDate.setUTCMonth(lastDate.getUTCMonth() + 1, 0);
  limit.setUTCDate(Math.min(start.getUTCDate(), lastDate.getUTCDate()));
  if (end.getTime() + 86400000 > limit.getTime()) throw new Error('Escolha um período de até seis meses, incluindo o dia final.');
  return new URLSearchParams({ from: `${range.from}T00:00:00`, to: `${range.to}T23:59:59.999` });
}

export function currentMonthRange(now = new Date()): OperationDateRange {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return { from: `${year}-${month}-01`, to: `${year}-${month}-${String(now.getDate()).padStart(2, '0')}` };
}

export function operationalQueryForRange(storeId: number, range: OperationDateRange): OperationalQuery {
  const params = operationDateParams(range);
  return {
    storeId,
    from: params.get('from') ?? '',
    to: (params.get('to') ?? '').slice(0, 19),
  };
}
