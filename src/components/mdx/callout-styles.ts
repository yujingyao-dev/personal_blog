export type CalloutType = 'info' | 'warning' | 'success' | 'danger';

export const calloutStyles: Record<CalloutType, string> = {
  info: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-100',
  warning:
    'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100',
  success:
    'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100',
  danger:
    'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-100',
};

export const calloutLabels: Record<CalloutType, string> = {
  info: '提示',
  warning: '注意',
  success: '成功',
  danger: '警告',
};
