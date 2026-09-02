import { useEffect, useState } from 'react';
import {
  buscarMarcasAtivas,
  buscarSegmentos,
  buscarTaxaVigente,
  gerarNumeroReferencia,
  formatCurrency,
  type Marca,
  type Segmento,
  type TabelaTaxa,
  type DadosProposta,
} from '@/lib/supabase';
import { generateProposalPdfFromData, downloadBlob, buildProposalFilename } from '@/lib/pdfService';
import {
  Lock, ArrowRight, ArrowLeft, Check, Loader2, Building2, Layers,
  User, DollarSign, Calendar, FileCheck, AlertCircle, CheckCircle2, Home, RefreshCw
} from 'lucide-react';

type Step = 'marca' | 'segmento' | 'dados' | 'revisao' | 'sucesso';

interface FormData {
  marca_id: string;
  segmento_id: string;
  nome_cliente: string;
  valor_bem: string;
  valor_adesao: string;
  parcela_mensal: string;
  prazo: string;
}

interface Props {
  onNavigate: (page: string) => void;
}

export default function GerarProposta({ onNavigate }: Props) {
  const [step, setStep] = useState<Step>('marca');
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [taxa, setTaxa] = useState<TabelaTaxa | null>(null);
  const [loadingTaxa, setLoadingTaxa] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prazoError, setPrazoError] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [pdfDados, setPdfDados] = useState<DadosProposta | null>(null);
  const [form, setForm] = useState<FormData>({
    marca_id: '',
    segmento_id: '',
    nome_cliente: '',
    valor_bem: '',
    valor_adesao: '',
    parcela_mensal: '',
    prazo: '',
  });

  const [selectedMarca, setSelectedMarca] = useState<Marca | null>(null);
  const [selectedSegmento, setSelectedSegmento] = useState<Segmento | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setCarregando(true);
    try {
      const [m, s] = await Promise.all([buscarMarcasAtivas(), buscarSegmentos()]);
      setMarcas(m);
      const ativos = s.filter(seg => seg.ativo === undefined || seg.ativo === true);
      setSegmentos(ativos);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao carregar dados iniciais.');
    }
    setCarregando(false);
  }

  async function selectMarca(m: Marca) {
    setForm({ ...form, marca_id: m.id, segmento_id: '', prazo: '' });
    setSelectedMarca(m);
    setSelectedSegmento(null);
    setTaxa(null);
    setStep('segmento');
  }

  async function selectSegmento(s: Segmento) {
    setLoadingTaxa(true);
    setError(null);
    setForm({ ...form, segmento_id: s.id, prazo: String(s.prazo_min) });
    setSelectedSegmento(s);
    setPrazoError(null);

    try {
      const taxaVigente = await buscarTaxaVigente(form.marca_id, s.id);
      if (!taxaVigente) {
        setTaxa(null);
        setError(
          'Não há tabela de taxas vigente para esta combinação de marca e segmento. Entre em contato com o administrador.'
        );
      } else {
        setTaxa(taxaVigente);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao buscar tabela de taxas.');
    } finally {
      setLoadingTaxa(false);
      setStep('dados');
    }
  }

  function validatePrazo(value: string) {
    setForm({ ...form, prazo: value });
    if (!selectedSegmento) return;
    const v = Number(value);
    if (!v || v < selectedSegmento.prazo_min || v > selectedSegmento.prazo_max) {
      setPrazoError(
        `O prazo deve estar entre ${selectedSegmento.prazo_min} e ${selectedSegmento.prazo_max} meses.`
      );
    } else {
      setPrazoError(null);
    }
  }

  function canProceedDados() {
    return (
      form.nome_cliente.trim().length >= 2 &&
      Number(form.valor_bem) > 0 &&
      Number(form.parcela_mensal) > 0 &&
      Number(form.prazo) > 0 &&
      !prazoError
    );
  }

  async function gerarPDF() {
    if (!selectedMarca || !selectedSegmento) return;
    setGerandoPdf(true);
    setError(null);

    try {
      const prazov = Number(form.prazo);
      const result = await generateProposalPdfFromData({
        marca: selectedMarca,
        segmento: selectedSegmento,
        nome_cliente: form.nome_cliente.trim(),
        valor_bem: Number(form.valor_bem),
        valor_adesao: Number(form.valor_adesao || 0),
        parcela_mensal: Number(form.parcela_mensal),
        prazo: prazov,
      });

      setPdfDados(result.dados);
      downloadBlob(result.blob, buildProposalFilename(result.dados));
      setStep('sucesso');
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? 'Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGerandoPdf(false);
    }
  }

  function resetForm() {
    setForm({
      marca_id: '',
      segmento_id: '',
      nome_cliente: '',
      valor_bem: '',
      valor_adesao: '',
      parcela_mensal: '',
      prazo: '',
    });
    setSelectedMarca(null);
    setSelectedSegmento(null);
    setTaxa(null);
    setPdfDados(null);
    setError(null);
    setPrazoError(null);
    setStep('marca');
  }

  const steps: { key: Step; label: string; icon: any }[] = [
    { key: 'marca', label: 'Marca', icon: Building2 },
    { key: 'segmento', label: 'Segmento', icon: Layers },
    { key: 'dados', label: 'Dados', icon: User },
    { key: 'revisao', label: 'Revisão', icon: FileCheck },
  ];
  const currentStepIndex = steps.findIndex(s => s.key === step);

  if (carregando) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Navbar pública */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-ink-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-ink-900 flex items-center justify-center group-hover:bg-gold-500 transition-colors">
              <Home className="w-4.5 h-4.5 text-gold-500 group-hover:text-white" />
            </div>
            <div className="text-left">
              <h1 className="font-display font-semibold text-ink-900 text-sm tracking-tight">Consórcio Pro</h1>
              <p className="text-[10px] text-ink-400 -mt-0.5">Nova proposta</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('home')}
              className="btn-secondary !py-2 !px-4 text-xs"
            >
              <Home className="w-3.5 h-3.5" /> Início
            </button>
            <button
              onClick={resetForm}
              className="text-xs font-medium text-ink-500 hover:text-ink-700 px-3 py-2 rounded-lg hover:bg-ink-50 transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Limpar
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-5xl mx-auto px-4 lg:px-8 py-10">
        {/* Stepper */}
        {step !== 'sucesso' && (
          <div className="mb-8">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {steps.map((s, i) => {
                const Icon = s.icon;
                const completed = i < currentStepIndex;
                const active = i === currentStepIndex;
                return (
                  <div key={s.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          completed
                            ? 'bg-gold-500 text-white'
                            : active
                            ? 'bg-ink-900 text-white'
                            : 'bg-ink-100 text-ink-300'
                        }`}
                      >
                        {completed ? <Check className="w-4.5 h-4.5" /> : <Icon className="w-4.5 h-4.5" />}
                      </div>
                      <span className={`text-xs font-medium ${active ? 'text-ink-900' : 'text-ink-400'}`}>
                        {s.label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 rounded ${completed ? 'bg-gold-500' : 'bg-ink-100'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 border border-red-200 bg-red-50 rounded-xl px-4 py-3 text-sm text-red-700 animate-fade-in flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Step: Marca */}
        {step === 'marca' && (
          <div className="animate-slide-up">
            {marcas.length === 0 ? (
              <div className="card p-8 text-center">
                <AlertCircle className="w-10 h-10 text-ink-300 mx-auto mb-3" />
                <h3 className="font-display font-medium text-ink-700 mb-1">Nenhuma marca ativa</h3>
                <p className="text-sm text-ink-400">
                  O administrador ainda não cadastrou nenhuma marca ativa no sistema.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-ink-400 mb-4">Selecione a marca de consórcio:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {marcas.map(m => (
                    <button
                      key={m.id}
                      onClick={() => selectMarca(m)}
                      className="card p-5 hover:shadow-md hover:border-gold-300 transition-all text-left group animate-slide-up"
                    >
                      <div className="flex items-center gap-4">
                        {m.logo_url ? (
                          <img
                            src={m.logo_url}
                            alt={m.nome}
                            className="w-14 h-14 rounded-xl object-cover bg-ink-100"
                          />
                        ) : (
                          <div
                            className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-display font-semibold text-xl shrink-0"
                            style={{ backgroundColor: m.cor_destaque }}
                          >
                            {m.nome.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-ink-900 truncate">{m.nome}</h3>
                          {m.representante && (
                            <p className="text-xs text-ink-400 truncate mt-0.5">{m.representante}</p>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-gold-500 group-hover:translate-x-1 transition-all ml-auto" />
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step: Segmento */}
        {step === 'segmento' && (
          <div className="animate-slide-up">
            <p className="text-sm text-ink-400 mb-4">
              Selecione o segmento para <span className="font-medium text-ink-700">{selectedMarca?.nome}</span>:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {segmentos.map(s => (
                <button
                  key={s.id}
                  onClick={() => selectSegmento(s)}
                  className="card p-5 hover:shadow-md hover:border-gold-300 transition-all text-left group animate-slide-up"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gold-50 text-gold-600 flex items-center justify-center shrink-0">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-ink-900">{s.nome}</h3>
                      <p className="text-xs text-ink-400 mt-0.5">
                        {s.prazo_min} a {s.prazo_max} meses
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-gold-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep('marca')} className="btn-ghost mt-6">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          </div>
        )}

        {/* Step: Dados */}
        {step === 'dados' && (
          <div className="animate-slide-up max-w-2xl mx-auto">
            {loadingTaxa ? (
              <div className="flex items-center gap-3 py-8">
                <Loader2 className="w-5 h-5 text-gold-500 animate-spin" />
                <p className="text-sm text-ink-400">Carregando tabela de taxas...</p>
              </div>
            ) : !taxa ? (
              <div className="card p-6 mb-6 border-amber-200 bg-amber-50">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-700">
                    Não há tabela de taxas vigente para esta combinação de marca e segmento.
                  </p>
                </div>
              </div>
            ) : (
              <div className="card p-6 mb-6 border-gold-200 bg-gold-50/50">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-4 h-4 text-gold-600" />
                  <h3 className="font-display font-medium text-sm text-ink-700">
                    Taxas definidas pela administração
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <LockedField
                    label="Taxa de Administração"
                    value={`${Number(taxa.taxa_administracao).toFixed(2)}%`}
                  />
                  <LockedField
                    label="Fundo de Reserva"
                    value={`${Number(taxa.fundo_reserva).toFixed(2)}%`}
                  />
                  <LockedField
                    label="Seguro Prestamista"
                    value={`${Number(taxa.seguro_prestamista).toFixed(2)}%`}
                  />
                </div>
                <p className="text-xs text-ink-400 mt-3">
                  Estas taxas são buscadas no servidor e não podem ser alteradas.
                </p>
              </div>
            )}

            <div className="card p-6 space-y-4">
              <h3 className="font-display font-medium text-ink-900">Dados da proposta</h3>

              <div>
                <label className="label-field">Nome do cliente *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                  <input
                    className="input-field pl-10"
                    value={form.nome_cliente}
                    onChange={e => setForm({ ...form, nome_cliente: e.target.value })}
                    placeholder="Nome completo do cliente"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Valor do bem / crédito *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-field pl-10"
                      value={form.valor_bem}
                      onChange={e => setForm({ ...form, valor_bem: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>
                </div>
                <div>
                  <label className="label-field">Valor de adesão</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-field pl-10"
                      value={form.valor_adesao}
                      onChange={e => setForm({ ...form, valor_adesao: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>
                </div>
                <div>
                  <label className="label-field">Parcela mensal *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-field pl-10"
                      value={form.parcela_mensal}
                      onChange={e => setForm({ ...form, parcela_mensal: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>
                </div>
                <div>
                  <label className="label-field">Prazo (meses) *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                    <input
                      type="number"
                      className={`input-field pl-10 ${prazoError ? 'border-red-300 focus:ring-red-300' : ''}`}
                      value={form.prazo}
                      onChange={e => validatePrazo(e.target.value)}
                      placeholder={`${selectedSegmento?.prazo_min ?? 1} a ${selectedSegmento?.prazo_max ?? 12}`}
                    />
                  </div>
                  {prazoError && <p className="text-xs text-red-500 mt-1">{prazoError}</p>}
                </div>
              </div>

              <div className="flex gap-3 justify-between pt-2">
                <button onClick={() => setStep('segmento')} className="btn-secondary">
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <button
                  onClick={() => setStep('revisao')}
                  disabled={!canProceedDados() || !taxa}
                  className="btn-primary"
                >
                  Revisar proposta <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Revisão */}
        {step === 'revisao' && selectedMarca && selectedSegmento && taxa && (
          <div className="animate-slide-up max-w-2xl mx-auto">
            <div className="card overflow-hidden">
              <div
                className="px-6 py-5 border-b border-ink-100"
                style={{ backgroundColor: selectedMarca.cor_destaque ?? '#B8963F' }}
              >
                <div className="flex items-center gap-4">
                  {selectedMarca.logo_url ? (
                    <img
                      src={selectedMarca.logo_url}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover bg-white/20"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-display font-semibold text-xl">
                      {selectedMarca.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-display font-semibold text-white">{selectedMarca.nome}</h3>
                    <p className="text-sm text-white/80">{selectedSegmento.nome}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-xs font-medium text-ink-400 uppercase tracking-wide mb-3">
                    Dados do cliente
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <ReviewItem label="Cliente" value={form.nome_cliente} />
                    <ReviewItem label="Prazo" value={`${form.prazo} meses`} />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-ink-400 uppercase tracking-wide mb-3">
                    Valores
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <ReviewItem
                      label="Valor do bem"
                      value={formatCurrency(Number(form.valor_bem))}
                      highlight
                    />
                    <ReviewItem
                      label="Valor de adesão"
                      value={formatCurrency(Number(form.valor_adesao || 0))}
                    />
                    <ReviewItem
                      label="Parcela mensal"
                      value={formatCurrency(Number(form.parcela_mensal))}
                      highlight
                    />
                    <ReviewItem
                      label="Total a pagar (parcelas × prazo)"
                      value={formatCurrency(Number(form.parcela_mensal) * Number(form.prazo))}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-ink-400 uppercase tracking-wide mb-3">
                    Taxas aplicadas (vigentes)
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <ReviewItem
                      label="Taxa Adm."
                      value={`${Number(taxa.taxa_administracao).toFixed(2)}%`}
                    />
                    <ReviewItem
                      label="Fundo Reserva"
                      value={`${Number(taxa.fundo_reserva).toFixed(2)}%`}
                    />
                    <ReviewItem
                      label="Seguro"
                      value={`${Number(taxa.seguro_prestamista).toFixed(2)}%`}
                    />
                  </div>
                  <p className="mt-3 text-[11px] text-ink-400 flex items-center gap-1.5">
                    <Lock className="w-3 h-3" /> As taxas serão validadas novamente no servidor antes da geração do PDF.
                  </p>
                </div>

                <div className="flex gap-3 justify-between pt-4 border-t border-ink-100">
                  <button onClick={() => setStep('dados')} className="btn-secondary">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </button>
                  <button
                    onClick={gerarPDF}
                    disabled={gerandoPdf}
                    className="btn-primary"
                  >
                    {gerandoPdf ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Gerando PDF...
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-4 h-4" />
                        Gerar PDF e baixar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Sucesso */}
        {step === 'sucesso' && pdfDados && (
          <div className="animate-slide-up max-w-md mx-auto text-center pt-8">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="font-display text-xl font-semibold text-ink-900 mb-2">
              PDF gerado e baixado com sucesso!
            </h2>
            <p className="text-sm text-ink-400 mb-1">
              Proposta{' '}
              <span className="font-medium text-ink-700">Ref. {pdfDados.numero_referencia}</span>{' '}
              gerada para <span className="font-medium text-ink-700">{pdfDados.nome_cliente}</span>.
            </p>
            <p className="text-xs text-ink-400 mb-8">
              Se o download não iniciou automaticamente, verifique sua barra de downloads.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={resetForm}
                className="btn-primary"
              >
                <FileCheck className="w-4 h-4" /> Gerar outra proposta
              </button>
              <button
                onClick={() => onNavigate('home')}
                className="btn-secondary"
              >
                <Home className="w-4 h-4" /> Voltar ao início
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-ink-100 bg-white mt-16">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-ink-900 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-gold-500" />
            </div>
            <span className="text-xs text-ink-500 font-medium">
              Consórcio Pro © {new Date().getFullYear()} — Sistema de Propostas
            </span>
          </div>
          <button
            onClick={() => onNavigate('login')}
            className="text-xs text-ink-400 hover:text-ink-600 transition-colors"
          >
            Acesso administrativo
          </button>
        </div>
      </footer>
    </div>
  );
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gold-200 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Lock className="w-3 h-3 text-gold-500" />
        <span className="text-xs text-ink-400">{label}</span>
      </div>
      <p className="text-lg font-display font-semibold text-ink-900">{value}</p>
    </div>
  );
}

function ReviewItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-ink-400">{label}</span>
      <span
        className={`font-medium ${highlight ? 'text-gold-600 text-base' : 'text-ink-900'}`}
      >
        {value}
      </span>
    </div>
  );
}
