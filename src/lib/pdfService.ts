import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  buscarTaxaVigente,
  formatCurrency,
  gerarNumeroReferencia,
  type Marca,
  type Segmento,
  type DadosProposta,
  type TabelaTaxa,
} from './supabase';

const MM_PER_PT = 25.4 / 72;
const A4_W_MM = 210;
const A4_H_MM = 297;
const RENDER_SCALE = 3;
// 96 DPI: 1 mm = 96 / 25.4 px ≈ 3.7795 px
const PX_PER_MM = 96 / 25.4;
const A4_W_PX = Math.round(A4_W_MM * PX_PER_MM);  // ≈ 794 px
const A4_H_PX = Math.round(A4_H_MM * PX_PER_MM);  // ≈ 1123 px

const DEFAULT_ACCENT = '#B8963F';

function accentColor(marca: Marca): string {
  const c = (marca.cor_destaque || DEFAULT_ACCENT).trim();
  return c.startsWith('#') ? c : c;
}

function siglaMarca(nome: string): string {
  const palavras = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (palavras.length === 0) return 'CO';
  if (palavras.length === 1) return palavras[0].slice(0, 2).toUpperCase();
  return (palavras[0][0] + palavras[palavras.length - 1][0]).toUpperCase();
}

function formatPercent4(v: number): string {
  const formatted = Number(v).toLocaleString('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  return `${formatted} %`;
}

function formatData(data: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(data.getDate())}/${pad(data.getMonth() + 1)}/${data.getFullYear()}`;
}

function buildTemplateHtml(d: DadosProposta, _logoDataUrl: string | null = null): string {
  const accent = accentColor(d.marca);
  const nomeMaiusculo = d.marca.nome.toUpperCase();
  // .logo-mark VAZIO (nenhuma sigla, nenhuma img): a logo é desenhada EXCLUSIVAMENTE
  // via overlay do jsPDF sobre esta área, evitando duplicação e problemas de renderização.
  const logoHtml = '';

  const clienteNome = d.nome_cliente;
  const valorBem = formatCurrency(d.valor_bem);
  const valorAdesao = formatCurrency(d.valor_adesao || 0);
  const parcelaMensal = formatCurrency(d.parcela_mensal);
  const prazoTexto = `${d.prazo} meses`;
  const dataGeracao = formatData(d.data_geracao);

  const taxaAdm = formatPercent4(d.taxa.taxa_administracao);
  const fundoReserva = formatPercent4(d.taxa.fundo_reserva);
  const seguroPrestamista = formatPercent4(d.taxa.seguro_prestamista);

  const esquerda = [];
  // esquerda.push(`<b>${escapeHtml(d.marca.nome)}</b>`);
  if (d.marca.endereco) esquerda.push(`${escapeHtml(d.marca.endereco)}<br>`);
  const doc = [];
  if (d.marca.cnpj) doc.push(`CNPJ: ${escapeHtml(d.marca.cnpj)}`);
  if (d.marca.representante) doc.push(`Representante: ${escapeHtml(d.marca.representante)}`);
  if (doc.length) esquerda.push(doc.join(' &nbsp;·&nbsp; '));

  const direita = [];
  const fones = [];
  if (d.marca.telefone) fones.push(`<span style="color:${accent}">Tel:</span> ${escapeHtml(d.marca.telefone)}`);
  if (fones.length) direita.push(fones.join('<br>'));
  const contato = [];
  if (d.marca.site) contato.push(`<span style="color:${accent}">Site:</span> ${escapeHtml(d.marca.site)}`);
  if (d.marca.instagram) contato.push(escapeHtml(d.marca.instagram));
  if (contato.length) direita.push(contato.join(' &nbsp;·&nbsp; '));

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
        font-family: 'Poppins', 'DejaVu Sans', sans-serif;
        color: #1a1a1a;
        font-size: 10.5pt;
        background: #ffffff;
        -webkit-font-smoothing: antialiased;
    }
    .page {
        width: 210mm;
        height: 297mm;
        max-width: 210mm;
        max-height: 297mm;
        position: relative;
        background: #ffffff;
        overflow: hidden;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8mm 16mm 3mm 16mm;
    }
    .logo-wrap {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .logo-mark {
        width: 31.75mm !important;
        height: 31.75mm !important;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        background: transparent;
        border: none !important;
        padding: 0;
        margin: 0;
        flex-shrink: 0;
    }
    .logo-mark img {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain;
        display: block;
    }
    .logo-text .nome {
        font-weight: 700;
        font-size: 15px;
        letter-spacing: 1.5px;
        color: #fff;
        line-height: 1.1;
    }
    .logo-text .sub {
        font-size: 7.5px;
        letter-spacing: 2px;
        color: #8a8a8a;
        text-transform: uppercase;
        margin-top: 2px;
    }
    .selo {
        border: 1px solid ${accent};
        color: ${accent};
        font-size: 7.5px;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        padding: 5px 12px;
        border-radius: 20px;
        font-weight: 600;
        background: #ffffff;
    }
    .header-rule {
        height: 2px;
        margin: 0 16mm;
        background: linear-gradient(90deg, #111 0%, #111 65%, ${accent} 65%, ${accent} 100%);
    }

    .title-block {
        padding: 5mm 16mm 4mm 16mm;
    }
    .kicker {
        font-size: 8px;
        letter-spacing: 3px;
        color: ${accent};
        font-weight: 600;
        text-transform: uppercase;
        margin-bottom: 6px;
    }
    h1 {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: 0.3px;
        color: #111;
    }
    h1 span {
        font-weight: 300;
        color: #555;
    }
    .meta-row {
        display: flex;
        gap: 26px;
        margin-top: 10px;
        font-size: 9px;
        color: #6b6b6b;
        flex-wrap: wrap;
    }
    .meta-row b { color: #111; font-weight: 600; }

    .cliente-box {
        margin: 7mm 16mm 0 16mm;
        background: #fafaf8;
        border-left: 3px solid ${accent};
        padding: 10px 16px;
        border-radius: 4px;
    }
    .cliente-box .label {
        font-size: 7.5px;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        color: #9a9a9a;
        margin-bottom: 3px;
    }
    .cliente-box .nome-cliente {
        font-size: 14px;
        font-weight: 600;
        color: #111;
    }

    .section-label {
        margin: 10mm 16mm 4mm 16mm;
        font-size: 8px;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: #9a9a9a;
        font-weight: 600;
    }
    .cards {
        margin: 0 16mm;
        display: flex;
        gap: 6px;
    }
    .card {
        flex: 1 1 0;
        background: #111111;
        border-radius: 8px;
        padding: 10px 12px;
        position: relative;
        overflow: hidden;
        min-width: 0;
        max-width: 25%;
        box-sizing: border-box;
    }
    .card::after {
        content: "";
        position: absolute;
        top: 0; right: 0;
        width: 2.5px; height: 100%;
        background: ${accent};
    }
    .card .label {
        font-size: 6.8px;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: ${accent};
        margin-bottom: 5px;
        font-weight: 600;
        line-height: 1.2;
    }
    .card .valor {
        font-size: 13px;
        font-weight: 700;
        color: #ffffff;
        line-height: 1.15;
        word-break: break-word;
        hyphens: auto;
    }

    .taxas-wrap {
        margin: 10mm 16mm 0 16mm;
        border: 1px solid #e3e0d8;
        border-radius: 8px;
        overflow: hidden;
        background: #ffffff;
    }
    .taxas-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #f7f5f0;
        padding: 9px 16px;
        border-bottom: 1px solid #e3e0d8;
    }
    .taxas-header .titulo {
        font-size: 9.5px;
        font-weight: 600;
        color: #111;
        letter-spacing: 0.3px;
    }
    .lock-badge {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 7px;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        color: #9a8358;
        background: #f2ead8;
        padding: 3px 9px;
        border-radius: 12px;
        font-weight: 600;
    }
    table.taxas {
        width: 100%;
        border-collapse: collapse;
    }
    table.taxas td {
        padding: 9px 16px;
        font-size: 9.5px;
        border-bottom: 0.5px solid #eeece5;
    }
    table.taxas tr:last-child td { border-bottom: none; }
    table.taxas td.item { color: #4a4a4a; }
    table.taxas td.valor {
        text-align: right;
        font-weight: 700;
        color: #111;
    }

    .nota {
        margin: 6mm 16mm 0 16mm;
        font-size: 8px;
        color: #9a9a9a;
        line-height: 1.6;
    }

    .obs-title {
        margin: 8mm 16mm 2mm 16mm;
        font-size: 8px;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: #9a9a9a;
        font-weight: 600;
    }
    ul.obs {
        margin: 0 16mm;
        padding-left: 14px;
        font-size: 8.5px;
        color: #6b6b6b;
        line-height: 1.9;
    }

   .footer {
    width: 100%;
    background: #111111;
    color: #d8d3c4;
    padding: 8mm 16mm;
    display: flex;
    justify-content: space-between;
    align-items: flex-start; /* Alinha o topo das duas colunas */
    font-size: 8px;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    box-sizing: border-box;
}

.footer .col { 
    flex: 1; /* Força distribuição igual de espaço */
    max-width: 48%; /* Evita que o texto encoste na outra coluna */
    line-height: 1.6; 
    color: #b3ada0; 
}

.footer .col b {
    color: #ffffff;
    font-size: 9px;
    display: block;
    margin-bottom: 3px;
    height: 0;   /* colapsa o espaço do título da direita para alinhar com a esquerda */
    line-height: 0;
    visibility: hidden;
}

.footer .right { 
    padding-top: 0 !important;  /* remove espaço superior extra */
    margin-top: 0 !important;
    text-align: right; 
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
    word-break: break-all; /* Evita que URLs longas estourem a largura */
    line-height: 1.6;
    min-height: 0;
}

.footer .gold { 
    color: ${accent}; 
}
</style>
</head>
<body>
<div class="page">

    <div class="header">
        <div class="logo-wrap">
            <div class="logo-mark">
                ${logoHtml}
            </div>
           
        </div>
        <div class="selo">Parceiro autorizado</div>
    </div>
    <div class="header-rule"></div>

    <div class="title-block">
        <div class="kicker">Simulação de crédito</div>
        <h1>Proposta <span>de consórcio</span></h1>
        <div class="meta-row">
            <div>Proposta n<sup>o</sup> <b>${d.numero_referencia}</b></div>
            <div>Segmento <b>${escapeHtml(d.segmento.nome)}</b></div>
            <div>Data <b>${dataGeracao}</b></div>
        </div>
    </div>

    <div class="cliente-box">
        <div class="label">Proposta elaborada para</div>
        <div class="nome-cliente">${escapeHtml(clienteNome)}</div>
    </div>

    <div class="section-label">Resumo do plano</div>
    <div class="cards">
        <div class="card">
            <div class="label">Valor do bem / crédito</div>
            <div class="valor">${valorBem}</div>
        </div>
        <div class="card">
            <div class="label">Valor de adesão</div>
            <div class="valor">${valorAdesao}</div>
        </div>
        <div class="card">
            <div class="label">Parcela mensal</div>
            <div class="valor">${parcelaMensal}</div>
        </div>
        <div class="card">
            <div class="label">Prazo</div>
            <div class="valor">${prazoTexto}</div>
        </div>
    </div>

    <div class="taxas-wrap">
        <div class="taxas-header">
            <div class="titulo">Composição da taxa administrativa</div>
            <div class="lock-badge">&#128274; Definido pela administração</div>
        </div>
        <table class="taxas">
            <tr>
                <td class="item">Taxa de Administração Total</td>
                <td class="valor">${taxaAdm}</td>
            </tr>
            <tr>
                <td class="item">Fundo de Reserva</td>
                <td class="valor">${fundoReserva}</td>
            </tr>
            <tr>
                <td class="item">Seguro Prestamista</td>
                <td class="valor">${seguroPrestamista}</td>
            </tr>
        </table>
    </div>
    <div class="nota">
        As taxas acima já estão consideradas na composição da parcela mensal informada neste plano.
        A Taxa de Administração Total é diluída ao longo do prazo contratado, e o Fundo de Reserva e o
        Seguro Prestamista incidem conforme regulamento do grupo.
    </div>

    <div class="obs-title">Observações</div>
    <ul class="obs">
        <li>Simulação sujeita a análise de crédito e disponibilidade de cota no grupo indicado.</li>
        <li>Valores podem sofrer reajuste conforme índice contratual e regras da administradora.</li>
        <li>Proposta válida conforme prazo informado pelo representante comercial.</li>
    </ul>

   <div class="footer">
    
    <div class="col">
    <b class="logo-text">
                <h5 class="nome">${nomeMaiusculo}</h5>
            </b>
        ${esquerda.join('<br>')}
    </div>
    <div class="col right">
        <b>&nbsp;</b>
        ${direita.join('')}
    </div>
</div>

</div>
</body>
</html>
`;
}

function escapeHtml(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return '';
  const str = String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderTemplateToContainer(html: string): HTMLElement {
  const container = document.createElement('div');
  container.setAttribute('id', '_pdf_render_root_' + Date.now());
  Object.assign(container.style, {
    position: 'fixed',
    left: '-99999px',
    top: '0',
    width: `${A4_W_MM}mm`,
    height: `${A4_H_MM}mm`,
    overflow: 'hidden',
    zIndex: '-999999',
    pointerEvents: 'none',
    background: '#ffffff',
    opacity: '0',
    boxSizing: 'border-box',
  });
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

// Converte uma URL de imagem remota para data-URL (base64), evitando problemas
// de CORS/taint no html2canvas. Suporta URLs de storage Supabase, CDNs, etc.
async function urlToDataUrl(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.onloadend = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
  } finally {
    clearTimeout(t);
  }
}

// Converte a URL da marca para data-URL; em caso de erro retorna null
// e o template cai para a sigla.
async function preloadLogoDataUrl(marca: Marca): Promise<string | null> {
  if (!marca.logo_url) return null;
  const url = marca.logo_url.trim();
  if (!url) return null;
  console.info('[pdf] Carregando logo da marca:', marca.nome, 'URL:', url);

  // Tentativa 1: fetch + FileReader
  try {
    const dataUrl = await urlToDataUrl(url);
    console.info('[pdf] Logo carregada via fetch OK');
    return dataUrl;
  } catch (e: any) {
    console.warn('[pdf] Tentativa 1 (fetch) falhou:', e?.message ?? e);
  }

  // Tentativa 2: Image crossOrigin + canvas drawImage
  try {
    const viaImg = await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const cnv = document.createElement('canvas');
          const maxSide = 400;
          let w = Math.max(1, img.naturalWidth || 42);
          let h = Math.max(1, img.naturalHeight || 42);
          if (w > maxSide || h > maxSide) {
            const r = Math.min(maxSide / w, maxSide / h);
            w = Math.round(w * r);
            h = Math.round(h * r);
          }
          cnv.width = w;
          cnv.height = h;
          const ctx = cnv.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = cnv.toDataURL('image/png');
          resolve(dataUrl);
        } catch (err) {
          console.warn('[pdf] drawImage falhou:', err);
          resolve(null);
        }
      };
      img.onerror = (e) => {
        console.warn('[pdf] img.onerror:', e);
        resolve(null);
      };
      img.src = url;
      setTimeout(() => resolve(null), 15000);
    });
    if (viaImg) {
      console.info('[pdf] Logo carregada via Image() OK');
      return viaImg;
    }
  } catch (e: any) {
    console.warn('[pdf] Tentativa 2 (Image crossOrigin) falhou:', e?.message ?? e);
  }

  // Tentativa 3: Image SEM crossOrigin + canvas (pode falhar com taint, mas vale tentar)
  try {
    const viaImgNoCors = await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const cnv = document.createElement('canvas');
          cnv.width = Math.max(1, img.naturalWidth || 42);
          cnv.height = Math.max(1, img.naturalHeight || 42);
          const ctx = cnv.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(img, 0, 0, cnv.width, cnv.height);
          const dataUrl = cnv.toDataURL('image/png');
          resolve(dataUrl);
        } catch (err) {
          console.warn('[pdf] drawImage (no CORS) falhou (provavelmente tainted canvas):', err);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
      setTimeout(() => resolve(null), 10000);
    });
    if (viaImgNoCors) {
      console.info('[pdf] Logo carregada via Image() (sem CORS) OK');
      return viaImgNoCors;
    }
  } catch (e: any) {
    console.warn('[pdf] Tentativa 3 falhou:', e?.message ?? e);
  }

  console.warn('[pdf] Todas as tentativas de carregar a logo falharam — usando sigla de fallback. URL:', url);
  return null;
}

async function loadGoogleFonts() {
  try {
    if (typeof (document as any).fonts !== 'undefined' && (document as any).fonts.ready) {
      await (document as any).fonts.ready;
    }
    // Garante tempo extra para fontes carregarem
    await new Promise(res => setTimeout(res, 500));
  } catch {
    await new Promise(res => setTimeout(res, 500));
  }
}

async function waitImagesLoaded(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll('img'));
  if (imgs.length === 0) return;
  await Promise.all(
    imgs.map(
      img =>
        new Promise<void>(resolve => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener('load', done);
          img.addEventListener('error', done);
          setTimeout(done, 5000);
        })
    )
  );
}

export async function generateProposalPdfFromData(params: {
  marca: Marca;
  segmento: Segmento;
  nome_cliente: string;
  valor_bem: number;
  valor_adesao: number;
  parcela_mensal: number;
  prazo: number;
}): Promise<{ blob: Blob; dados: DadosProposta }> {
  // ====== VALIDAÇÃO SERVER-SIDE (re-busca os dados, não confia no front) ======
  const taxaOficial: TabelaTaxa | null = await buscarTaxaVigente(params.marca.id, params.segmento.id);
  if (!taxaOficial) {
    throw new Error(
      'Taxa vigente não encontrada para esta marca e segmento. Verifique a tabela de taxas no painel administrativo.'
    );
  }

  // Validação prazo server-side
  if (
    params.prazo < params.segmento.prazo_min ||
    params.prazo > params.segmento.prazo_max
  ) {
    throw new Error(
      `Prazo inválido. Deve ser entre ${params.segmento.prazo_min} e ${params.segmento.prazo_max} meses.`
    );
  }

  const dados: DadosProposta = {
    marca: params.marca,
    segmento: params.segmento,
    taxa: taxaOficial,
    nome_cliente: params.nome_cliente,
    valor_bem: Number(params.valor_bem),
    valor_adesao: Number(params.valor_adesao || 0),
    parcela_mensal: Number(params.parcela_mensal),
    prazo: Number(params.prazo),
    numero_referencia: gerarNumeroReferencia(),
    data_geracao: new Date(),
  };

  // ====== PRELOAD LOGO (evita problemas CORS no html2canvas) ======
  const logoDataUrl = await preloadLogoDataUrl(dados.marca);

  // ====== MONTA TEMPLATE EXATO ======
  const html = buildTemplateHtml(dados, logoDataUrl);
  const root = renderTemplateToContainer(html);

  try {
    await loadGoogleFonts();
    await waitImagesLoaded(root);

    const pageEl = root.querySelector('.page') as HTMLElement;
    pageEl.style.width = `${A4_W_MM}mm`;
    pageEl.style.maxWidth = `${A4_W_MM}mm`;
    pageEl.style.height = `${A4_H_MM}mm`;
    pageEl.style.overflow = 'hidden';
    pageEl.style.position = 'relative';

    const canvas = await html2canvas(pageEl, {
      scale: RENDER_SCALE,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: A4_W_PX,
      height: A4_H_PX,
      windowWidth: A4_W_PX,
      windowHeight: A4_H_PX,
      imageTimeout: 15000,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      removeContainer: false,
      onclone: (doc) => {
        const cloned = doc.querySelector('.page') as HTMLElement | null;
        if (cloned) {
          cloned.style.width = `${A4_W_MM}mm`;
          cloned.style.maxWidth = `${A4_W_MM}mm`;
          cloned.style.height = `${A4_H_MM}mm`;
          cloned.style.overflow = 'hidden';
        }
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, A4_W_MM, A4_H_MM, undefined, 'FAST');

    // ====== OVERLAY LOGO DIRETO NO jsPDF (camada extra, 100% confiável) ======
    // Posição exata do .logo-mark no template:
    //   header padding: 8mm (top), 16mm (left)
    //   .logo-mark size: 31.75mm × 31.75mm
    try {
      if (logoDataUrl) {
        const LOGO_X_MM = 16;
        const LOGO_Y_MM = 8;
        const LOGO_W_MM = 31.75;
        const LOGO_H_MM = 31.75;
        const LOGO_ALIAS = `logo_overlay_${dados.marca.id}`;

        let formato: 'PNG' | 'JPEG' | 'WEBP' = 'JPEG';
        if (logoDataUrl.includes('image/png')) formato = 'PNG';
        else if (logoDataUrl.includes('image/webp')) formato = 'WEBP';

        try {
          pdf.addImage(
            logoDataUrl,
            formato,
            LOGO_X_MM,
            LOGO_Y_MM,
            LOGO_W_MM,
            LOGO_H_MM,
            LOGO_ALIAS,
            'FAST'
          );
        } catch (eJpg) {
          try {
            pdf.addImage(
              logoDataUrl,
              'JPEG',
              LOGO_X_MM,
              LOGO_Y_MM,
              LOGO_W_MM,
              LOGO_H_MM,
              LOGO_ALIAS + '_fallback',
              'FAST'
            );
          } catch (eFinal) {
            console.warn('[pdf] Overlay de logo falhou:', eFinal);
          }
        }
      }
    } catch (e) {
      console.warn('[pdf] Falha no overlay da logo:', e);
    }

    pdf.setDocumentProperties({
      title: `Proposta ${dados.numero_referencia} — ${dados.nome_cliente}`,
      subject: 'Proposta de Consórcio',
      author: dados.marca.nome || 'Eixo',
      keywords: ['consórcio', 'proposta', dados.marca.nome, dados.segmento.nome].join(', '),
    });

    const blob = pdf.output('blob');
    return { blob, dados };
  } finally {
    if (root.parentNode) root.parentNode.removeChild(root);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function buildProposalFilename(dados: DadosProposta): string {
  const clean = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_');
  return `Proposta_${dados.numero_referencia}_${clean(dados.nome_cliente)}.pdf`;
}
