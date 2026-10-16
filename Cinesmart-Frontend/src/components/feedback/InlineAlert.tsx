import { CircleCheck, Info, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type Variant = 'error' | 'warning' | 'success' | 'info';

const styles: Record<Variant, { icon: LucideIcon; className: string }> = {
  error: { icon: OctagonAlert, className: 'border-destructive/50 text-destructive-foreground' },
  warning: { icon: TriangleAlert, className: 'border-primary/50 text-primary' },
  success: { icon: CircleCheck, className: 'border-success/50 text-success' },
  info: { icon: Info, className: 'border-info/50 text-info' },
};

interface InlineAlertProps {
  variant: Variant;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** shadcn Alert; `role="alert"` for errors, `status` otherwise ([COMP-4]). */
export function InlineAlert({ variant, title, children, className }: InlineAlertProps) {
  const { icon: Icon, className: variantClass } = styles[variant];
  return (
    <Alert
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn('bg-surface', variantClass, className)}
    >
      <Icon aria-hidden />
      {title && <AlertTitle>{title}</AlertTitle>}
      {children && <AlertDescription className="text-foreground/85">{children}</AlertDescription>}
    </Alert>
  );
}
