import { ReactNode, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Building2, Layers, Percent,
  LogOut, Menu, X, ChevronRight, Home, FileText } from 'lucide-react';

export type PageKey =
  | 'admin-dashboard'
  | 'admin-marcas'
  | 'admin-segmentos'
  | 'admin-taxas';

interface LayoutProps {
  children: ReactNode;
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  onPublicNavigate?: (page: string) => void;
}

const adminNav = [
  { key: 'admin-dashboard' as PageKey, label: 'Dashboard', icon: LayoutDashboard },
  { key: 'admin-marcas' as PageKey, label: 'Marcas', icon: Building2 },
  { key: 'admin-segmentos' as PageKey, label: 'Segmentos', icon: Layers },
  { key: 'admin-taxas' as PageKey, label: 'Tabela de Taxas', icon: Percent },
];

export default function Layout({ children, currentPage, onNavigate, onPublicNavigate }: LayoutProps) {
  const { perfil, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    if (onPublicNavigate) onPublicNavigate('home');
  }

  function handleNav(key: PageKey) {
    onNavigate(key);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-ink-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-ink-900/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-ink-900 text-white z-40
          flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="p-5 flex items-center gap-3 border-b border-ink-700">
          <div className="w-10 h-10 rounded-xl bg-gold-500 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-semibold text-sm truncate">Consórcio Pro</h2>
            <p className="text-xs text-ink-400 truncate">Área administrativa</p>
          </div>
        </div>

        {/* Acesso rápido: link para o site público */}
        {onPublicNavigate && (
          <div className="px-3 pt-3 space-y-1">
            <button
              onClick={() => onPublicNavigate('home')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-ink-300 hover:bg-ink-800 hover:text-white transition-all duration-200"
            >
              <Home className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left truncate">Ir para o site público</span>
            </button>
            <button
              onClick={() => onPublicNavigate('gerar-proposta')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-ink-300 hover:bg-ink-800 hover:text-white transition-all duration-200"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left truncate">Gerar proposta</span>
            </button>
          </div>
        )}

        <div className="h-px bg-ink-700 mx-3 my-3" />

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {adminNav.map(item => {
            const Icon = item.icon;
            const active = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNav(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-gold-500 text-white shadow-sm'
                    : 'text-ink-300 hover:bg-ink-800 hover:text-white'
                }`}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {active && <ChevronRight className="w-4 h-4" />}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-ink-700">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-white truncate">{perfil?.nome}</p>
            <p className="text-xs text-ink-400 truncate">Administrador</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-300 hover:bg-red-900/30 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-ink-900 text-white px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-ink-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-semibold text-sm">Consórcio Pro</span>
          <div className="w-8" />
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>

      {/* Mobile close button when sidebar is open */}
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed top-3 left-60 z-50 lg:hidden p-1.5 rounded-lg bg-ink-800 text-white"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
