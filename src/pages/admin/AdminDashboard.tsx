import { useEffect, useState } from 'react';
import { supabase, formatCurrency } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, StatCard, LoadingSpinner, EmptyState } from '@/components/ui';
import { Building2, Building, Layers, Percent, ChevronRight, FileText } from 'lucide-react';
import type { PageKey } from '@/components/Layout';

export default function AdminDashboard({
  onNavigate,
}: {
  onNavigate: (page: PageKey) => void;
}) {
  const { perfil } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    marcasAtivas: 0,
    marcasTotal: 0,
    segmentosTotal: 0,
    taxasVigentes: 0,
  });
  const [taxasInfo, setTaxasInfo] = useState<
    { marca: string; segmento: string; vigencia: string }[]
  >([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    const [marcasAtivas, marcasTotal, segmentosTotal, taxasData] = await Promise.all([
      supabase
        .from('marcas')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ativa'),
      supabase.from('marcas').select('id', { count: 'exact', head: true }),
      supabase.from('segmentos').select('id', { count: 'exact', head: true }),
      supabase
        .from('tabela_taxas')
        .select('marcas(nome), segmentos(nome), vigencia_inicio, vigencia_fim')
        .or('vigencia_fim.is.null,vigencia_fim.gte.today')
        .order('vigencia_inicio', { ascending: false })
        .limit(5),
    ]);

    const { count: taxasCount } = await supabase
      .from('tabela_taxas')
      .select('id', { count: 'exact', head: true })
      .or('vigencia_fim.is.null,vigencia_fim.gte.today');

    setStats({
      marcasAtivas: marcasAtivas.count ?? 0,
      marcasTotal: marcasTotal.count ?? 0,
      segmentosTotal: segmentosTotal.count ?? 0,
      taxasVigentes: taxasCount ?? 0,
    });

    setTaxasInfo(
      (taxasData.data ?? [])
        .filter(t => t.marcas && t.segmentos)
        .map(t => {
          const m = (t as any).marcas as { nome: string };
          const s = (t as any).segmentos as { nome: string };
          const vi = (t as any).vigencia_inicio;
          const vf = (t as any).vigencia_fim;
          return {
            marca: m.nome,
            segmento: s.nome,
            vigencia: vf ? `até ${formatDate(vf)}` : 'vigente',
          };
        })
    );

    setLoading(false);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title={`Olá, ${perfil?.nome?.split(' ')[0] ?? 'Admin'}`}
        subtitle="Visão geral do sistema de consórcios"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Building2} label="Marcas ativas" value={stats.marcasAtivas} color="gold" />
        <StatCard icon={Building} label="Marcas cadastradas" value={stats.marcasTotal} color="ink" />
        <StatCard icon={Layers} label="Segmentos" value={stats.segmentosTotal} color="blue" />
        <StatCard icon={Percent} label="Taxas vigentes" value={stats.taxasVigentes} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-ink-900">Taxas vigentes recentes</h2>
            <button
              onClick={() => onNavigate('admin-taxas')}
              className="text-sm text-gold-600 hover:text-gold-700 font-medium"
            >
              Ver todas
            </button>
          </div>
          {taxasInfo.length === 0 ? (
            <EmptyState
              icon={Percent}
              title="Nenhuma taxa cadastrada"
              message="Comece cadastrando uma marca, segmento e depois uma tabela de taxas."
            />
          ) : (
            <div className="space-y-2">
              {taxasInfo.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-ink-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900 truncate">
                      {t.marca} · {t.segmento}
                    </p>
                    <p className="text-xs text-ink-400 mt-0.5">Situação: {t.vigencia}</p>
                  </div>
                  <div className="ml-3 inline-flex items-center gap-1 text-xs font-medium text-ink-400">
                    <FileText className="w-3.5 h-3.5" /> Configurada
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-display font-semibold text-ink-900 mb-4">Acesso rápido</h2>
          <div className="space-y-2">
            <QuickLink
              icon={Building}
              label="Gerenciar marcas"
              onClick={() => onNavigate('admin-marcas')}
            />
            <QuickLink
              icon={Layers}
              label="Gerenciar segmentos"
              onClick={() => onNavigate('admin-segmentos')}
            />
            <QuickLink
              icon={Percent}
              label="Tabela de taxas"
              onClick={() => onNavigate('admin-taxas')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-ink-50 transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-gold-50 text-gold-600 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium text-ink-700 flex-1">{label}</span>
      <ChevronRight className="w-4 h-4 text-ink-300" />
    </button>
  );
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
