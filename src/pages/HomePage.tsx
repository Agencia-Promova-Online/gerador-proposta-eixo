import { Building2, FileText, Shield, ArrowRight, Sparkles, BadgeCheck } from 'lucide-react';
import logo from "../assets/favicon.png"

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="min-h-screen bg-ink-50">
      {/* Navbar pública */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-ink-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 flex items-center justify-center">
            <img src={logo} height="10px" />
            </div>
            <div>
              <h1 className="font-display font-semibold text-ink-900 text-sm tracking-tight">Eixo</h1>
              <p className="text-[10px] text-ink-400 -mt-0.5">Gerador de Propostas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('login')}
              className="text-xs font-medium text-ink-500 hover:text-ink-700 px-3 py-2 rounded-lg hover:bg-ink-50 transition-colors"
            >
              Acesso administrativo
            </button>
            <button
              onClick={() => onNavigate('gerar-proposta')}
              className="btn-primary !py-2 !px-4 text-xs"
            >
              Gerar proposta <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-ink-50 to-white opacity-80" />
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gold-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-ink-900/5 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold-50 border border-gold-200 px-3 py-1 mb-6 animate-fade-in">
              <Sparkles className="w-3.5 h-3.5 text-gold-600" />
              <span className="text-[11px] font-medium text-gold-700">Sistema oficial de propostas</span>
            </div>

            <h2 className="font-display text-4xl lg:text-6xl font-semibold text-ink-900 tracking-tight leading-[1.05] animate-slide-up">
              Propostas de consórcio
              <span className="block text-gold-600">com visual premium.</span>
            </h2>

            <p className="mt-6 text-lg text-ink-500 max-w-2xl leading-relaxed animate-slide-up" style={{ animationDelay: '60ms' }}>
              Preencha os dados do cliente, selecione marca e segmento, e receba um
              PDF profissional preto/branco/dourado na hora. Sem cadastro, sem login,
              sem complicação.
            </p>

            <div className="mt-10 flex flex-wrap gap-3 animate-slide-up" style={{ animationDelay: '120ms' }}>
              <button
                onClick={() => onNavigate('gerar-proposta')}
                className="btn-primary !px-6 !py-3 text-base shadow-xl shadow-gold-500/10 hover:shadow-2xl hover:shadow-gold-500/20"
              >
                Criar nova proposta <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="btn-secondary !px-6 !py-3 text-base"
              >
                Sou administrador
              </button>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 animate-fade-in" style={{ animationDelay: '240ms' }}>
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-green-600" />
                <span className="text-sm text-ink-500">Taxas atualizadas em tempo real</span>
              </div>
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-green-600" />
                <span className="text-sm text-ink-500">PDF com identidade da marca</span>
              </div>
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-green-600" />
                <span className="text-sm text-ink-500">Número de referência único</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: FileText,
              title: 'Geração instantânea',
              desc: 'Preencha e clique em gerar. O PDF baixa no navegador em menos de 2 segundos.',
              color: 'bg-gold-50 text-gold-600',
            },
            {
              icon: Shield,
              title: 'Taxas oficiais validadas',
              desc: 'A taxa oficial vigente é buscada no servidor na hora da geração do PDF, garantindo autenticidade.',
              color: 'bg-blue-50 text-blue-600',
            },
            {
              icon: Building2,
              title: 'Marcas parceiras',
              desc: 'Todas as administradoras ativas listadas com seus dados e cores oficiais.',
              color: 'bg-green-50 text-green-600',
            },
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="card p-7 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${f.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-display font-semibold text-lg text-ink-900 mb-2">{f.title}</h3>
                <p className="text-sm text-ink-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 p-10 lg:p-16">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-gold-500 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-gold-500/50 blur-3xl" />
          </div>
          <div className="relative max-w-2xl">
            <h3 className="font-display text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-tight">
              Pronto para gerar sua próxima proposta?
            </h3>
            <p className="mt-4 text-ink-300 leading-relaxed">
              Comece agora. Leva menos de 1 minuto e o PDF sai pronto para enviar ao cliente.
            </p>
            <button
              onClick={() => onNavigate('gerar-proposta')}
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold-500 text-white font-medium text-sm hover:bg-gold-600 transition-colors shadow-xl shadow-gold-500/20"
            >
              Gerar proposta agora <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 flex items-center justify-center">
              <img src={logo} height="10px"/>
            </div>
            <span className="text-xs text-ink-500 font-medium">
              Eixo© {new Date().getFullYear()} — Todos os direitos reservados
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
