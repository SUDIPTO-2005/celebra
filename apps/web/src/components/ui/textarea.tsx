import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }
>(({ className, error, id, ...props }, ref) => {
  const errorId = error && id ? `${id}-error` : undefined;
  return (
    <div className="w-full">
      <textarea
        id={id}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-destructive' : 'border-border',
          className,
        )}
        ref={ref}
        aria-describedby={errorId}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
