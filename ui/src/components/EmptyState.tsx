import type { ReactNode } from 'react';

export function EmptyState({
  icon, title, body, action,
}: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="h-full grid place-items-center p-10">
      <div className="max-w-sm text-center">
        {icon && <div className="mb-3 grid place-items-center text-cortex-cyan">{icon}</div>}
        <div className="text-h2 font-semibold">{title}</div>
        {body && <p className="mt-2 text-body-m text-glia-gray">{body}</p>}
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}