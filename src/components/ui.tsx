import { ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-400 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, color = 'gold' }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color?: 'gold' | 'ink' | 'green' | 'blue';
}) {
  const colorMap = {
    gold: 'bg-gold-50 text-gold-600 border-gold-100',
    ink: 'bg-ink-100 text-ink-600 border-ink-200',
    green: 'bg-green-50 text-green-600 border-green-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
  };
  return (
    <div className="card p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-display font-semibold text-ink-900">{value}</p>
      <p className="text-sm text-ink-400 mt-0.5">{label}</p>
    </div>
  );
}

export function Badge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ativa: 'bg-green-50 text-green-600 border-green-200',
    inativa: 'bg-ink-100 text-ink-400 border-ink-200',
    gerada: 'bg-gold-50 text-gold-600 border-gold-200',
    enviada: 'bg-blue-50 text-blue-600 border-blue-200',
    visualizada: 'bg-green-50 text-green-600 border-green-200',
    rascunho: 'bg-ink-100 text-ink-400 border-ink-200',
    admin: 'bg-gold-50 text-gold-600 border-gold-200',
    vendedor: 'bg-blue-50 text-blue-600 border-blue-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] ?? styles.rascunho}`}>
      {status}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, message }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-ink-100 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-ink-300" />
      </div>
      <h3 className="font-display font-medium text-ink-700">{title}</h3>
      <p className="text-sm text-ink-400 mt-1 max-w-sm">{message}</p>
    </div>
  );
}

export function LoadingSpinner({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="w-6 h-6 text-gold-500 animate-spin" />
      <p className="text-sm text-ink-400 mt-3">{label}</p>
    </div>
  );
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto animate-slide-up`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-display font-semibold text-lg text-ink-900">{title}</h2>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-600 p-1 rounded-lg hover:bg-ink-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up p-6">
        <h2 className="font-display font-semibold text-lg text-ink-900 mb-2">{title}</h2>
        <p className="text-sm text-ink-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={onConfirm} className="btn-primary bg-red-500 hover:bg-red-600">Confirmar</button>
        </div>
      </div>
    </div>
  );
}
