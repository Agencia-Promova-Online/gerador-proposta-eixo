import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui';
import { Loader2 } from 'lucide-react';

import Login from '@/pages/Login';
import Layout, { type PageKey } from '@/components/Layout';

import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminMarcas from '@/pages/admin/AdminMarcas';
import AdminSegmentos from '@/pages/admin/AdminSegmentos';
import AdminTaxas from '@/pages/admin/AdminTaxas';

import HomePage from '@/pages/HomePage';
import GerarProposta from '@/pages/GerarProposta';

export type PublicPageKey = 'home' | 'gerar-proposta' | 'login';

function AppContent() {
  const { session, perfil, loading, isAdmin } = useAuth();
  const [publicPage, setPublicPage] = useState<PublicPageKey>('home');
  const [adminPage, setAdminPage] = useState<PageKey>('admin-dashboard');

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
