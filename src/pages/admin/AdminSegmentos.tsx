import { useEffect, useState } from 'react';
import { supabase, type Segmento } from '@/lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Modal, ConfirmDialog } from '@/components/ui';
import { Layers, Plus, Pencil, Trash2, Clock } from 'lucide-react';

export default function AdminSegmentos() {
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Segmento | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Segmento | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Segmento>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadSegmentos(); }, []);

  async function loadSegmentos() {
    setLoading(true);
    const { data } = await supabase.from('segmentos').select('*').order('nome');
    setSegmentos(data ?? []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ prazo_min: 1, prazo_max: 12 });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(seg: Segmento) {
    setEditing(seg);
    setForm(seg);
    setError(null);
    setModalOpen(true);
  }

  async function save() {
    if (!form.nome?.trim()) { setError('Nome é obrigatório.'); return; }
    const min = Number(form.prazo_min);
    const max = Number(form.prazo_max);
    if (!min || !max || min < 1 || max < min) {
      setError('Prazo mínimo deve ser ≥ 1 e prazo máximo deve ser ≥ prazo mínimo.');
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('segmentos').update({ nome: form.nome, prazo_min: min, prazo_max: max }).eq('id', editing.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('segmentos').insert({ nome: form.nome, prazo_min: min, prazo_max: max });
      if (error) setError(error.message);
    }
    setSaving(false);
    if (!error) { setModalOpen(false); loadSegmentos(); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await supabase.from('segmentos').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    loadSegmentos();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Segmentos"
        subtitle="Categorias de consórcio (imóveis, veículos, bens pesados, serviços)"
        action={<button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> Novo segmento</button>}
      />

      {segmentos.length === 0 ? (
        <div className="card"><EmptyState icon={Layers} title="Nenhum segmento cadastrado" message="Adicione segmentos para definir as categorias de consórcio disponíveis." /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segmentos.map((seg) => (
            <div key={seg.id} className="card p-5 hover:shadow-md transition-shadow animate-slide-up">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-gold-50 text-gold-600 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(seg)} className="p-2 rounded-lg hover:bg-ink-100 text-ink-400 hover:text-ink-600"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteTarget(seg)} className="p-2 rounded-lg hover:bg-red-50 text-ink-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <h3 className="font-display font-medium text-lg text-ink-900">{seg.nome}</h3>
              <div className="flex items-center gap-2 mt-2 text-sm text-ink-400">
                <Clock className="w-4 h-4" />
                <span>{seg.prazo_min} a {seg.prazo_max} meses</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar segmento' : 'Novo segmento'}>
        <div className="space-y-4">
          <div>
            <label className="label-field">Nome *</label>
            <input className="input-field" value={form.nome ?? ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Imóveis, Veículos, Bens Pesados" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Prazo mínimo (meses) *</label>
              <input type="number" min={1} className="input-field" value={form.prazo_min ?? ''} onChange={(e) => setForm({ ...form, prazo_min: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-field">Prazo máximo (meses) *</label>
              <input type="number" min={1} className="input-field" value={form.prazo_max ?? ''} onChange={(e) => setForm({ ...form, prazo_max: Number(e.target.value) })} />
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
        title="Excluir segmento"
        message={`Tem certeza que deseja excluir "${deleteTarget?.nome}"?`}
      />
    </div>
  );
}
