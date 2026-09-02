import { useEffect, useRef, useState } from 'react';
import { supabase, formatCurrency, formatDate, type Marca } from '@/lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Badge, Modal, ConfirmDialog } from '@/components/ui';
import { Building2, Plus, Pencil, Trash2, Search, Upload, X, ImageIcon } from 'lucide-react';

const STORAGE_BUCKET_LOGOS = 'marcas-logos';
const MAX_LOGO_BYTES = 1 * 1024 * 1024; // 1 MB
const ACCEPTED_LOGO_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

function buildLogoStoragePath(marcaId: string, ext: string): string {
  const timestamp = Date.now();
  return `${marcaId}/logo_${timestamp}.${ext}`;
}

function extFromMime(mime: string): string {
  switch (mime) {
    case 'image/png': return 'png';
    case 'image/jpeg': return 'jpg';
    case 'image/webp': return 'webp';
    case 'image/svg+xml': return 'svg';
    default: return 'png';
  }
}

function extFromFilename(name: string): string | null {
  const idx = name.lastIndexOf('.');
  if (idx === -1) return null;
  return name.slice(idx + 1).toLowerCase();
}

function isValidLogoFile(f: File): string | null {
  if (!ACCEPTED_LOGO_MIMES.includes(f.type)) {
    return 'Formato inválido. Use PNG, JPG, WEBP ou SVG.';
  }
  if (f.size > MAX_LOGO_BYTES) {
    return 'Arquivo muito grande. Tamanho máximo: 1 MB.';
  }
  return null;
}

export default function AdminMarcas() {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Marca | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Marca | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Marca>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingLogoPreview, setPendingLogoPreview] = useState<string | null>(null);
  const [removePendingLogo, setRemovePendingLogo] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadMarcas(); }, []);

  async function loadMarcas() {
    setLoading(true);
    const { data } = await supabase.from('marcas').select('*').order('nome');
    setMarcas(data ?? []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ status: 'ativa', cor_destaque: '#B8963F' });
    setError(null);
    setPendingLogoFile(null);
    setPendingLogoPreview(null);
    setRemovePendingLogo(false);
    setModalOpen(true);
  }

  function openEdit(marca: Marca) {
    setEditing(marca);
    setForm(marca);
    setError(null);
    setPendingLogoFile(null);
    setPendingLogoPreview(null);
    setRemovePendingLogo(false);
    setModalOpen(true);
  }

  function onPickLogo(file: File | null) {
    if (!file) return;
    const err = isValidLogoFile(file);
    if (err) { setError(err); return; }
    setError(null);
    setPendingLogoFile(file);
    setRemovePendingLogo(false);
    const reader = new FileReader();
    reader.onload = () => setPendingLogoPreview(String(reader.result));
    reader.onerror = () => setPendingLogoPreview(null);
    reader.readAsDataURL(file);
  }

  function clearPendingLogo() {
    setPendingLogoFile(null);
    setPendingLogoPreview(null);
    if (editing?.logo_url) setRemovePendingLogo(true);
    if (logoInputRef.current) logoInputRef.current.value = '';
  }

  async function uploadLogoToStorage(marcaId: string, file: File): Promise<string> {
    const ext = extFromFilename(file.name) ?? extFromMime(file.type);
    const path = buildLogoStoragePath(marcaId, ext);
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET_LOGOS)
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: true,
      });
    if (error) throw error;
    const { data } = supabase.storage.from(STORAGE_BUCKET_LOGOS).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('Falha ao obter URL pública da logo.');
    return data.publicUrl;
  }

  async function deleteOldLogoFromStorage(publicUrl: string | null | undefined) {
    if (!publicUrl) return;
    try {
      const base = `${supabase.supabaseUrl ?? ''}/storage/v1/object/public/${STORAGE_BUCKET_LOGOS}/`;
      const path = publicUrl.startsWith(base) ? publicUrl.slice(base.length) : null;
      if (path) {
        await supabase.storage.from(STORAGE_BUCKET_LOGOS).remove([path]);
      }
    } catch (e) {
      console.warn('[marcas] Falha ao remover logo antiga do storage:', e);
    }
  }

  async function save() {
    if (!form.nome?.trim()) { setError('Nome é obrigatório.'); return; }
    setSaving(true);
    setError(null);

    try {
      let savedMarca: Marca;
      const payload: Partial<Marca> = { ...form };

      // Etapa 1: Criar/atualizar a marca (sem logo ainda, se for nova e tiver upload pendente)
      // Para marcas novas, primeiro gravamos para obter um id
      if (editing) {
        let updatePayload = { ...payload };
        // Se tiver removePendingLogo e não tiver arquivo novo, limpa o campo
        if (removePendingLogo && !pendingLogoFile) {
          updatePayload.logo_url = null;
        }
        const { data, error: err } = await supabase
          .from('marcas')
          .update(updatePayload)
          .eq('id', editing.id)
          .select()
          .limit(1)
          .maybeSingle();
        if (err) throw err;
        if (!data) throw new Error('Marca não encontrada após edição.');
        savedMarca = data as Marca;

        // Se usuário marcou para remover logo (e não enviou nova), apaga a antiga do storage
        if (removePendingLogo && !pendingLogoFile && editing.logo_url) {
          await deleteOldLogoFromStorage(editing.logo_url);
        }
      } else {
        const { data, error: err } = await supabase
          .from('marcas')
          .insert({ ...payload, logo_url: null })
          .select()
          .limit(1)
          .maybeSingle();
        if (err) throw err;
        if (!data) throw new Error('Falha ao criar marca.');
        savedMarca = data as Marca;
      }

      // Etapa 2: Fazer upload da nova logo (se houver arquivo novo)
      if (pendingLogoFile) {
        setUploadingLogo(true);
        const previousUrl = editing?.logo_url ?? null;
        try {
          const publicUrl = await uploadLogoToStorage(savedMarca.id, pendingLogoFile);
          const { error: updErr } = await supabase
            .from('marcas')
            .update({ logo_url: publicUrl })
            .eq('id', savedMarca.id);
          if (updErr) throw updErr;
          if (previousUrl) await deleteOldLogoFromStorage(previousUrl);
        } finally {
          setUploadingLogo(false);
        }
      }

      setSaving(false);
      setModalOpen(false);
      loadMarcas();
    } catch (err: any) {
      setSaving(false);
      setUploadingLogo(false);
      setError(err?.message ?? 'Erro ao salvar marca.');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.logo_url) await deleteOldLogoFromStorage(deleteTarget.logo_url);
    } catch (e) {
      console.warn('[marcas] Falha ao limpar logo da marca excluída:', e);
    }
    await supabase.from('marcas').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    loadMarcas();
  }

  const filtered = marcas.filter(m =>
    m.nome.toLowerCase().includes(search.toLowerCase()) ||
    (m.cnpj ?? '').includes(search)
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Marcas"
        subtitle="Gerencie as administradoras de consórcio parceiras"
        action={<button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> Nova marca</button>}
      />

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
          placeholder="Buscar por nome ou CNPJ..."
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={Building2} title="Nenhuma marca cadastrada" message="Clique em 'Nova marca' para adicionar a primeira administradora de consórcio." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((marca) => (
            <div key={marca.id} className="card p-5 hover:shadow-md transition-shadow animate-slide-up">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  {marca.logo_url ? (
                    <img src={marca.logo_url} alt={marca.nome} className="w-12 h-12 rounded-xl object-cover bg-ink-100" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-display font-semibold shrink-0" style={{ backgroundColor: marca.cor_destaque }}>
                      {marca.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-medium text-ink-900 truncate">{marca.nome}</h3>
                    <p className="text-xs text-ink-400 truncate">{marca.cnpj ?? 'Sem CNPJ'}</p>
                  </div>
                </div>
                <Badge status={marca.status} />
              </div>
              <div className="space-y-1 text-sm text-ink-500">
                {marca.representante && <p><span className="text-ink-400">Representante:</span> {marca.representante}</p>}
                {marca.telefone && <p><span className="text-ink-400">Telefone:</span> {marca.telefone}</p>}
                {marca.site && <p><span className="text-ink-400">Site:</span> {marca.site}</p>}
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-ink-100">
                <button onClick={() => openEdit(marca)} className="btn-secondary flex-1 text-sm py-2"><Pencil className="w-3.5 h-3.5" /> Editar</button>
                <button onClick={() => setDeleteTarget(marca)} className="btn-danger py-2 px-3"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar marca' : 'Nova marca'} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label-field">Nome *</label>
              <input className="input-field" value={form.nome ?? ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome da administradora" />
            </div>
            <div>
              <label className="label-field">CNPJ</label>
              <input className="input-field" value={form.cnpj ?? ''} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <label className="label-field">Cor de destaque</label>
              <div className="flex items-center gap-2">
                <input type="color" className="w-10 h-10 rounded-lg border border-ink-200 cursor-pointer" value={form.cor_destaque ?? '#B8963F'} onChange={(e) => setForm({ ...form, cor_destaque: e.target.value })} />
                <input className="input-field" value={form.cor_destaque ?? ''} onChange={(e) => setForm({ ...form, cor_destaque: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label-field">Representante</label>
              <input className="input-field" value={form.representante ?? ''} onChange={(e) => setForm({ ...form, representante: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Telefone</label>
              <input className="input-field" value={form.telefone ?? ''} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Site</label>
              <input className="input-field" value={form.site ?? ''} onChange={(e) => setForm({ ...form, site: e.target.value })} placeholder="www.exemplo.com.br" />
            </div>
            <div>
              <label className="label-field">Instagram</label>
              <input className="input-field" value={form.instagram ?? ''} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@exemplo" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-field">Endereço</label>
              <input className="input-field" value={form.endereco ?? ''} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label-field">Logo da marca</label>
              <div className="border border-dashed border-ink-200 rounded-2xl p-4 bg-ink-50/40">
                {(() => {
                  const showLogoUrl = !pendingLogoFile && !removePendingLogo && (editing?.logo_url ?? form.logo_url);
                  const showPreview = pendingLogoPreview;
                  if (showPreview) {
                    return (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-20 h-20 rounded-xl bg-white shadow-sm border border-ink-100 overflow-hidden flex items-center justify-center shrink-0">
                            <img src={pendingLogoPreview as string} alt="preview" className="max-w-full max-h-full object-contain" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-ink-900 truncate">{pendingLogoFile?.name}</p>
                            <p className="text-xs text-ink-400">
                              {pendingLogoFile ? `${(pendingLogoFile.size / 1024).toFixed(1)} KB` : ''}
                            </p>
                          </div>
                        </div>
                        <button onClick={clearPendingLogo} className="btn-danger py-1.5 px-2.5 text-xs"><X className="w-4 h-4" /></button>
                      </div>
                    );
                  }
                  if (showLogoUrl) {
                    return (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-20 h-20 rounded-xl bg-white shadow-sm border border-ink-100 overflow-hidden flex items-center justify-center shrink-0">
                            <img src={showLogoUrl as string} alt="logo atual" className="max-w-full max-h-full object-contain" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-ink-900 truncate">Logo atual</p>
                            <p className="text-xs text-ink-400 truncate break-all">{showLogoUrl}</p>
                          </div>
                        </div>
                        <button onClick={clearPendingLogo} className="btn-danger py-1.5 px-2.5 text-xs" title="Remover logo"><X className="w-4 h-4" /></button>
                      </div>
                    );
                  }
                  if (removePendingLogo) {
                    return (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-20 rounded-xl bg-ink-100 border border-dashed border-ink-200 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-8 h-8 text-ink-300" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-ink-500">Logo será removida</p>
                            <p className="text-xs text-ink-400">A marca usará a sigla como fallback.</p>
                          </div>
                        </div>
                        <button onClick={() => setRemovePendingLogo(false)} className="btn-secondary py-1.5 px-2.5 text-xs">Desfazer</button>
                      </div>
                    );
                  }
                  // Empty state
                  return (
                    <label className="flex flex-col items-center justify-center text-center cursor-pointer py-3 hover:bg-white rounded-xl transition-colors">
                      <Upload className="w-9 h-9 text-ink-300 mb-2" />
                      <p className="text-sm font-medium text-ink-700">Clique para fazer upload</p>
                      <p className="text-xs text-ink-400 mt-0.5">PNG, JPG, WEBP ou SVG · até 1 MB</p>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept={ACCEPTED_LOGO_MIMES.join(',')}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          if (f) onPickLogo(f);
                        }}
                      />
                    </label>
                  );
                })()}
                {!pendingLogoPreview && !removePendingLogo && !(editing?.logo_url ?? form.logo_url) && (
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="btn-secondary py-2 text-sm"
                    >
                      <Upload className="w-4 h-4" /> Selecionar arquivo
                    </button>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept={ACCEPTED_LOGO_MIMES.join(',')}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        if (f) onPickLogo(f);
                      }}
                    />
                  </div>
                )}
              </div>
              {(pendingLogoPreview || removePendingLogo) && (
                <div className="mt-3 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="btn-secondary py-2 text-sm"
                  >
                    <Upload className="w-4 h-4" /> Substituir logo
                  </button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept={ACCEPTED_LOGO_MIMES.join(',')}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f) onPickLogo(f);
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="label-field">Status</label>
              <select className="input-field" value={form.status ?? 'ativa'} onChange={(e) => setForm({ ...form, status: e.target.value as 'ativa' | 'inativa' })}>
                <option value="ativa">Ativa</option>
                <option value="inativa">Inativa</option>
              </select>
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
        title="Excluir marca"
        message={`Tem certeza que deseja excluir "${deleteTarget?.nome}"? Esta ação removerá permanentemente todas as taxas vinculadas a esta marca.`}
      />
    </div>
  );
}
