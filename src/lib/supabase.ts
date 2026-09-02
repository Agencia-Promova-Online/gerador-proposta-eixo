import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface UsuarioPerfil {
  id: string;
  nome: string;
  papel: 'admin';
  criado_em: string;
}

export interface Marca {
  id: string;
  nome: string;
  logo_url: string | null;
  cor_destaque: string;
  cnpj: string | null;
  endereco: string | null;
  representante: string | null;
  telefone: string | null;
  site: string | null;
  instagram: string | null;
  status: 'ativa' | 'inativa';
  criado_em: string;
}

export interface Segmento {
  id: string;
  nome: string;
  prazo_min: number;
  prazo_max: number;
  criado_em: string;
  ativo?: boolean;
}

export interface TabelaTaxa {
  id: string;
  marca_id: string;
  segmento_id: string;
  taxa_administracao: number;
  fundo_reserva: number;
  seguro_prestamista: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  criado_em: string;
}

export interface DadosProposta {
  marca: Marca;
  segmento: Segmento;
  taxa: TabelaTaxa;
  nome_cliente: string;
  valor_bem: number;
  valor_adesao: number;
  parcela_mensal: number;
  prazo: number;
  numero_referencia: string;
  data_geracao: Date;
}

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateStr: string | Date): string => {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateTime = (date: Date): string => {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const gerarNumeroReferencia = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
};

export const buscarMarcasAtivas = async (): Promise<Marca[]> => {
  const { data, error } = await supabase
    .from('marcas')
    .select('*')
    .eq('status', 'ativa')
    .order('nome');
  if (error) throw error;
  return data ?? [];
};

export const buscarSegmentos = async (): Promise<Segmento[]> => {
  const { data, error } = await supabase
    .from('segmentos')
    .select('*')
    .order('nome');
  if (error) throw error;
  return data ?? [];
};

export const buscarTaxaVigente = async (
  marca_id: string,
  segmento_id: string
): Promise<TabelaTaxa | null> => {
  const hoje = new Date().toISOString().slice(0, 10);

  try {
    const { data, error } = await supabase
      .rpc('get_taxa_vigente', { p_marca_id: marca_id, p_segmento_id: segmento_id });
    if (!error && data && data[0]) {
      return data[0] as TabelaTaxa;
    }
    // eslint-disable-next-line no-empty
  } catch (_) {}

  const { data: fallback, error: err } = await supabase
    .from('tabela_taxas')
    .select('*')
    .eq('marca_id', marca_id)
    .eq('segmento_id', segmento_id)
    .lte('vigencia_inicio', hoje)
    .or('vigencia_fim.is.null,vigencia_fim.gte.' + hoje)
    .order('vigencia_inicio', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (err) {
    console.error('[buscarTaxaVigente fallback error:', err);
    throw err;
  }
  return fallback ?? null;
};
