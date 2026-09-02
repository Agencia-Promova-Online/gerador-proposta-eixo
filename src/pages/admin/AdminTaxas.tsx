import { useEffect, useState } from 'react';
import { supabase, type Marca, type Segmento, type TabelaTaxa } from '@/lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Modal, ConfirmDialog } from '@/components/ui';
import { Percent, Plus, Pencil, Trash2, Search } from 'lucide-react';

export default function AdminTaxas() {
  const [taxas, setTaxas] = useState<(TabelaTaxa & { marcas?: Marca; segmentos?: Segmento })[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TabelaTaxa | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TabelaTaxa | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<TabelaTaxa>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [taxasRes, marcasRes, segRes] = await Promise.all([
      supabase.from('tabela_taxas').select('*, marcas(*), segmentos(*)').order('criado_em', { ascending: false }),
      supabase.from('marcas').select('*').order('nome'),
      supabase.from('segmentos').select('*').order('nome'),
    ]);
    setTaxas(taxasRes.data ?? []);
    setMarcas(marcasRes.data ?? []);
    setSegmentos(segRes.data ?? []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ taxa_administracao: 0, fundo_reserva: 0, seguro_prestamista: 0, vigencia_inicio: new Date().toISOString().slice(0, 10) });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(taxa: TabelaTaxa) {
    setEditing(taxa);
    setForm({
      ...taxa,
      vigencia_inicio: taxa.vigencia_inicio.slice(0, 10),
      vigencia_fim: taxa.vigencia_fim?.slice(0, 10) ?? '',
    });
    setError(null);
    setModalOpen(true);
  }

  async function save() {
    if (!form.marca_id || !form.segmento_id) { setError('Selecione marca e segmento.'); return; }
    if (form.taxa_administracao == null) { setError('Taxa de administração é obrigatória.'); return; }
    setSaving(true);
    const payload = {
      marca_id: form.marca_id,
      segmento_id: form.segmento_id,
      taxa_administracao: Number(form.taxa_administracao),
      fundo_reserva: Number(form.fundo_reserva ?? 0),
      seguro_prestamista: Number(form.seguro_prestamista ?? 0),
      vigencia_inicio: form.vigencia_inicio,
      vigencia_fim: form.vigencia_fim || null,
    };
    if (editing) {
      const { error } = await supabase.from('tabela_taxas').update(payload).eq('id', editing.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('tabela_taxas').insert(payload);
      if (error) setError(error.message);
    }
    setSaving(false);
    if (!error) { setModalOpen(false); loadData(); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await supabase.from('tabela_taxas').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    loadData();
  }

  const filtered = taxas.filter(t =>
    (t.marcas?.nome ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (t.segmentos?.nome ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Tabela de Taxas"
        subtitle="Defina as taxas para cada combinação de marca e segmento"
        action={<button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> Nova taxa</button>}
      />

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" placeholder="Buscar por marca ou segmento..." />
      </div>

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon={Percent} title="Nenhuma taxa cadastrada" message="Cadastre taxas para as combinações de marca e segmento para que os vendedores possam gerar propostas." /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/50">
                  <th className="text-left font-medium text-ink-500 px-4 py-3">Marca</th>
                  <th className="text-left font-medium text-ink-500 px-4 py-3">Segmento</th>
                  <th className="text-right font-medium text-ink-500 px-4 py-3">Taxa Adm.</th>
                  <th className="text-right font-medium text-ink-500 px-4 py-3">Fundo Reserva</th>
                  <th className="text-right font-medium text-ink-500 px-4 py-3">Seguro</th>
                  <th className="text-center font-medium text-ink-500 px-4 py-3">Vigência</th>
                  <th className="text-right font-medium text-ink-500 px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-ink-50 hover:bg-ink-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-ink-900">{t.marcas?.nome ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-600">{t.segmentos?.nome ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gold-600">{Number(t.taxa_administracao).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right text-ink-600">{Number(t.fundo_reserva).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right text-ink-600">{Number(t.seguro_prestamista).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-center text-xs text-ink-400">
                      {t.vigencia_inicio.slice(0, 10)}
                      {t.vigencia_fim ? ` → ${t.vigencia_fim.slice(0, 10)}` : ' → vigente'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(t)} className="p-2 rounded-lg hover:bg-ink-100 text-ink-400 hover:text-ink-600"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteTarget(t)} className="p-2 rounded-lg hover:bg-red-50 text-ink-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar taxa' : 'Nova taxa'}>
        <div className="space-y-4">
          <div>
            <label className="label-field">Marca *</label>
            <select className="input-field" value={form.marca_id ?? ''} onChange={(e) => setForm({ ...form, marca_id: e.target.value })}>
              <option value="">Selecione...</option>
              {marcas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Segmento *</label>
            <select className="input-field" value={form.segmento_id ?? ''} onChange={(e) => setForm({ ...form, segmento_id: e.target.value })}>
              <option value="">Selecione...</option>
              {segmentos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-field">Taxa Adm. (%) *</label>
              <input type="number" step="0.01" className="input-field" value={form.taxa_administracao ?? ''} onChange={(e) => setForm({ ...form, taxa_administracao: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-field">Fundo Reserva (%)</label>
              <input type="number" step="0.01" className="input-field" value={form.fundo_reserva ?? ''} onChange={(e) => setForm({ ...form, fundo_reserva: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-field">Seguro (%)</label>
              <input type="number" step="0.01" className="input-field" value={form.seguro_prestamista ?? ''} onChange={(e) => setForm({ ...form, seguro_prestamista: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Início vigência *</label>
              <input type="date" className="input-field" value={form.vigencia_inicio ?? ''} onChange={(e) => setForm({ ...form, vigencia_inicio: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Fim vigência (vazio = vigente)</label>
              <input type="date" className="input-field" value={form.vigencia_fim ?? ''} onChange={(e) => setForm({ ...form, vigencia_fim: e.target.value })} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Excluir taxa"
        message="Tem certeza que deseja excluir esta taxa? Propostas já geradas manterão o snapshot."
      />
    </div>
  );
}
