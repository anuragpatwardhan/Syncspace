import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, error, leftIcon, rightSlot, className, id, ...rest },
  ref
) {
  const inputId = id ?? `in-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-ink-300 mb-1.5 tracking-wide">
          {label}
        </label>
      )}
      <div
        className={cn(
          'group relative flex items-center h-11 rounded-xl',
          'bg-white/[0.04] border border-white/10',
          'transition-all duration-200',
          'focus-within:bg-white/[0.06] focus-within:border-violet-400/40 focus-within:shadow-[0_0_0_4px_rgba(139,92,246,0.10)]',
          error && 'border-red-400/50 focus-within:border-red-400/60 focus-within:shadow-[0_0_0_4px_rgba(248,113,113,0.10)]'
        )}
      >
        {leftIcon && <span className="pl-3.5 text-ink-400">{leftIcon}</span>}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'flex-1 bg-transparent px-3.5 text-[14px] text-white placeholder:text-ink-400',
            'outline-none border-0',
            leftIcon && 'pl-2.5',
            className
          )}
          {...rest}
        />
        {rightSlot && <span className="pr-3">{rightSlot}</span>}
      </div>
      {(hint || error) && (
        <p className={cn('mt-1.5 text-[11px]', error ? 'text-red-300' : 'text-ink-400')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
