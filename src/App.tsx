import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui';
import { AlertTriangle, Loader2, Settings } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

import Login from '@/pages/Login';
import Layout, { type PageKey } from '@/components/Layout';

import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminMarcas from '@/pages/admin/AdminMarcas';
import AdminSegmentos from '@/pages/admin/AdminSegmentos';
import AdminTaxas from '@/pages/admin/AdminTaxas';

import HomePage from '@/pages/HomePage';
import GerarProposta from '@/pages/GerarProposta';

export type PublicPageKey = 'home' | 'gerar-proposta' | 'login';

function SupabaseNotConfigured() {
  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full rounded-2xl bg-white shadow-2xl border border-gold-100 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-ink-900 mb-2">Configuração pendente</h1>
        <p className="text-sm text-ink-500 leading-relaxed mb-5">
          As variáveis <code className="px-1.5 py-0.5 rounded bg-ink-50 border border-ink-100 text-gold-700 font-mono text-xs">VITE_SUPABASE_URL</code>{' '}
          e{' '}
          <code className="px-1.5 py-0.5 rounded bg-ink-50 border border-ink-100 text-gold-700 font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>{' '}
          não foram encontradas no build do deploy.
        </p>
        <div className="text-left bg-ink-50 rounded-xl p-4 mb-5 border border-ink-100">
          <div className="flex items-start gap-2 mb-2">
            <Settings className="w-4 h-4 text-gold-600 mt-0.5 shrink-0" />
            <div className="text-xs text-ink-600 leading-relaxed">
              <p className="font-semibold text-ink-800 mb-1">Como resolver (GitHub Actions):</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Acesse <span className="font-medium">Settings → Secrets and variables → Actions</span> no seu repositório GitHub.</li>
                <li>Clique em <span className="font-medium">New repository secret</span>.</li>
                <li>Cadastre os 2 secrets abaixo e re-deploy:</li>
              </ol>
              <div className="mt-3 font-mono text-[11px] bg-white p-3 rounded-lg border border-ink-200 space-y-1">
                <div><span className="text-gold-700">VITE_SUPABASE_URL</span>=<span className="text-ink-500">sua_url_do_supabase</span></div>
                <div><span className="text-gold-700">VITE_SUPABASE_ANON_KEY</span>=<span className="text-ink-500">sua_anon_key_publica</span></div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-ink-400">
          Detalhes técnicos estão disponíveis no console do navegador (F12).
        </p>
      </div>
    </div>
  );
}

function AppContent() {
  const { session, perfil, loading, isAdmin } = useAuth();
  const [publicPage, setPublicPage] = useState<PublicPageKey>('home');
  const [adminPage, setAdminPage] = useState<PageKey>('admin-dashboard');
  const configured = isSupabaseConfigured();

  // Tela amigável ao invés de "tela branca" quando Supabase não está configurado
  if (!configured) return <SupabaseNotConfigured />;

  // Se o usuário já estiver logado como admin ao acessar, fica logado
  // mas o usuário pode navegar para home quando quiser
  const authenticated = !!session && !!perfil && isAdmin;

  useEffect(() => {
    if (publicPage === 'login' && authenticated) {
      setAdminPage('admin-dashboard');
    }
  }, [authenticated, publicPage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <Loader2 className="w-6 h-6 text-gold-500 animate-spin" />
      </div>
    );
  }

  // Se for admin logado e estiver numa página admin — mostra área admin
  if (authenticated && publicPage !== 'home' && publicPage !== 'gerar-proposta') {
    function handleAdminNavigate(target: PageKey) {
      setAdminPage(target);
    }

    function renderAdminPage() {
      switch (adminPage) {
        case 'admin-dashboard':
          return <AdminDashboard onNavigate={handleAdminNavigate} />;
        case 'admin-marcas':
          return <AdminMarcas />;
        case 'admin-segmentos':
          return <AdminSegmentos />;
        case 'admin-taxas':
          return <AdminTaxas />;
        default:
          return <AdminDashboard onNavigate={handleAdminNavigate} />;
      }
    }

    function handleNavigateToPublic(p: string) {
      setPublicPage(p as PublicPageKey);
    }

    return (
      <Layout
        currentPage={adminPage}
        onNavigate={handleAdminNavigate}
        onPublicNavigate={handleNavigateToPublic}
      >
        {renderAdminPage()}
      </Layout>
    );
  }

  // Páginas públicas
  switch (publicPage) {
    case 'login':
      return (
        <Login
          onLoggedIn={() => setAdminPage('admin-dashboard')}
          onNavigate={p => setPublicPage(p as PublicPageKey)}
        />
      );
    case 'gerar-proposta':
      return <GerarProposta onNavigate={p => setPublicPage(p as PublicPageKey)} />;
    case 'home':
    default:
      return <HomePage onNavigate={p => setPublicPage(p as PublicPageKey)} />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export { LoadingSpinner };
