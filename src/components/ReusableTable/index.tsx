import { useId } from 'react';
import type {
    ReusableTableColumn,
    ReusableTableProps,
    TableCellTone,
} from '@/types/reusable-table.types';
import styles from './style.module.css';

const toneClasses: Record<TableCellTone, string> = {
    neutral: styles.neutral,
    success: styles.success,
    warning: styles.warning,
    danger: styles.danger,
    info: styles.info,
};

const alignmentClasses: Record<NonNullable<ReusableTableColumn<object>['align']>, string> = {
    start: styles.alignStart,
    center: styles.alignCenter,
    end: styles.alignEnd,
};

// Keyboard focus lets users scroll the table horizontally without a pointer.
const keyboardScrollProps = { tabIndex: 0 } as const;

function ReusableTable<T extends object>({
    title,
    columns,
    data,
    rowKey,
    emptyMessage = 'Nenhum registro encontrado.',
    variant = 'default',
}: ReusableTableProps<T>) {
    const titleId = useId();

    return (
        <section className={`${styles.card} ${variant === 'plain' ? styles.plain : ''}`}>
            <h2 className={styles.title} id={titleId}>{title}</h2>

            <div
                className={styles.scrollArea}
                role="region"
                aria-labelledby={titleId}
                {...keyboardScrollProps}
            >
                <table className={styles.table}>
                    <thead>
                        <tr>
                            {columns.map((column) => (
                                <th
                                    className={alignmentClasses[column.align ?? 'start']}
                                    key={column.id}
                                    scope="col"
                                >
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {data.map((row) => (
                            <tr key={rowKey(row)}>
                                {columns.map((column) => {
                                    const content = column.renderCell(row);
                                    const alignmentClass = alignmentClasses[column.align ?? 'start'];
                                    const tone = column.tone?.(row) ?? 'neutral';
                                    const actionText = column.display === 'action'
                                        ? column.actionText?.(row) ?? 'Ver'
                                        : undefined;

                                    return (
                                        <td className={alignmentClass} key={column.id}>
                                            {column.display === 'badge' ? (
                                                <span
                                                    className={`${styles.badge} ${toneClasses[tone]}`}
                                                    data-a11y-light-surface="true"
                                                    data-tone={tone}
                                                >
                                                    {content}
                                                </span>
                                            ) : column.display === 'action' ? (
                                                <button
                                                    type="button"
                                                    className={`${styles.actionButton} a11y-table-action table-action-transition`}
                                                    onClick={(event) => column.onAction?.(row, event)}
                                                    aria-label={column.actionLabel?.(row) ?? 'Ver ação'}
                                                    aria-haspopup={column.actionHasPopup === false ? undefined : 'dialog'}
                                                >
                                                    {actionText ?? 'Ver'}
                                                </button>
                                            ) : content}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}

                        {data.length === 0 && (
                            <tr>
                                <td className={styles.emptyState} colSpan={columns.length || 1}>
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default ReusableTable;
