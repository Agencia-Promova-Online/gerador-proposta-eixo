import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Building2, Lock, Mail, Eye, EyeOff, Loader2, ArrowLeft, ShieldAlert
} from 'lucide-react';
import logo from "../assets/favicon.png"

interface LoginProps {
  onLoggedIn?: () => void;
  onNavigate?: (page: string) => void;
}

export default function Login({ onLoggedIn, onNavigate }: LoginProps) {
  const { signIn, signUp, isAdmin, session } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin && session && onLoggedIn) {
      onLoggedIn();
    }
  }, [isAdmin, session, onLoggedIn]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
      } else if (onLoggedIn) {
        onLoggedIn();
      }
    } else {
      if (nome.trim().length < 2) {
        setError('Informe seu nome completo.');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('A senha deve ter no mínimo 6 caracteres.');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, nome);
      if (error) {
        setError(error);
      } else {
        setSuccess(
          'Conta administrativa criada com sucesso! Use seu e-mail e senha para entrar.'
        );
        setMode('login');
        setPassword('');
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-900 px-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-gold-500 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-gold-500 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        {onNavigate && (
          <button
            onClick={() => onNavigate('home')}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para o início
          </button>
        )}

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-500 mb-4 shadow-lg shadow-gold-500/20">
              <img src={logo} height="10px"/>
          </div>
          <h1 className="font-display text-2xl font-semibold text-white tracking-tight">
           Eixo
          </h1>
          <p className="text-ink-300 text-sm mt-1.5">Acesso administrativo</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-2 mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800 leading-snug">
              Área restrita a administradores. O acesso de vendedores é feito
              diretamente pela página pública de geração de proposta, sem login.
            </p>
          </div>

          <div className="flex gap-1 mb-6 bg-ink-50 p-1 rounded-xl">
            <button
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'login' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'signup' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400'
              }`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label-field">Nome completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="input-field"
                  placeholder="Seu nome"
                  required
                />
              </div>
            )}

            <div>
              <label className="label-field">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="admin@exemplo.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label-field">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-500"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-fade-in">
                {error}
              </div>
            )}
            {success && (
              <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl px-4 py-3 animate-fade-in">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'login' ? (
                'Entrar como admin'
              ) : (
                'Criar conta admin'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-ink-400 text-xs mt-6">
          Acesso restrito — Somente administradores
        </p>
      </div>
    </div>
  );
}
