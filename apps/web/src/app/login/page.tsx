'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Login.module.css';
import { FaSpinner, FaEye, FaEyeSlash } from 'react-icons/fa';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvarDados, setSalvarDados] = useState(false);
  const [manterConectado, setManterConectado] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  // Pré-preencher email salvo
  useEffect(() => {
    const emailSalvo = localStorage.getItem('loginEmail');
    if (emailSalvo) {
      setEmail(emailSalvo);
      setSalvarDados(true);
    }
    const lembrar = localStorage.getItem('manterConectado');
    if (lembrar === 'true') setManterConectado(true);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, senha, manterConectado);

      if (salvarDados) {
        localStorage.setItem('loginEmail', email);
      } else {
        localStorage.removeItem('loginEmail');
      }

      if (manterConectado) {
        localStorage.setItem('manterConectado', 'true');
      } else {
        localStorage.removeItem('manterConectado');
      }

      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.glassContainer}>
        <div className={styles.cardHeader}>
          <h1 className={styles.cardTitle}>Kaizen Lists</h1>
          <p className={styles.cardSubtitle}>Sistema de Gestão de Estoque</p>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>
              Email
            </label>
            <input
              id="email"
              type="email"
              className={styles.formInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="senha" className={styles.formLabel}>
              Senha
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="senha"
                type={mostrarSenha ? 'text' : 'password'}
                className={`${styles.formInput} ${styles.formInputWithBtn}`}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                tabIndex={-1}
              >
                {mostrarSenha ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className={styles.checkboxRow}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={salvarDados}
                onChange={(e) => setSalvarDados(e.target.checked)}
              />
              Salvar email
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={manterConectado}
                onChange={(e) => setManterConectado(e.target.checked)}
              />
              Manter conectado
            </label>
          </div>

          <button
            type="submit"
            className={styles.loginButton}
            disabled={loading}
          >
            {loading ? (
              <>
                <FaSpinner className={styles.spinner} />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <div className={styles.formLink}>
          <p className={styles.formLinkText}>
            Não tem conta? <Link href="/register">Registre-se</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
