'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Card, Spinner, Table } from 'react-bootstrap';
import api from '@/lib/api';

type Dia = { data: string; minutosPrevistos: number; minutosRealizados: number; minutosAbonados: number; minutosBancoHoras: number; classificacao: { tipo: 'FALTA' | 'FOLGA'; motivo?: string | null } | null; pendente: boolean; saldoOperacionalMinutos: number | null };
type Espelho = { competencia: string; dias: Dia[]; totais: { minutosRealizados: number; minutosAbonados: number; minutosBancoHoras: number; minutosPrevistos: number; saldoOperacionalMinutos: number; diasPendentes: number } };
const horas = (minutos: number) => `${minutos < 0 ? '-' : ''}${String(Math.floor(Math.abs(minutos) / 60)).padStart(2, '0')}:${String(Math.abs(minutos) % 60).padStart(2, '0')}`;

export default function EspelhoPontoPage() {
  const [espelho, setEspelho] = useState<Espelho | null>(null);
  const [erro, setErro] = useState('');
  const competencia = new Date().toISOString().slice(0, 7);
  const carregar = useCallback(async () => { try { setErro(''); const { data } = await api.get('/v1/collaborator/espelho-ponto', { params: { competencia } }); setEspelho(data); } catch { setErro('Não foi possível carregar o espelho.'); } }, [competencia]);
  useEffect(() => { void carregar(); }, [carregar]);
  if (erro) return <Alert variant="danger">{erro}</Alert>;
  if (!espelho) return <Spinner animation="border" />;
  return <Card><Card.Header><strong>Espelho de ponto — {espelho.competencia}</strong></Card.Header><Card.Body>
    <Table responsive hover><thead><tr><th>Data</th><th>Previsto</th><th>Realizado</th><th>Abonado</th><th>Banco</th><th>Saldo</th><th>Status</th></tr></thead><tbody>{espelho.dias.map((dia) => <tr key={dia.data}><td>{dia.data}</td><td>{horas(dia.minutosPrevistos)}</td><td>{horas(dia.minutosRealizados)}</td><td>{horas(dia.minutosAbonados)}</td><td>{horas(dia.minutosBancoHoras)}</td><td>{dia.saldoOperacionalMinutos === null ? '—' : horas(dia.saldoOperacionalMinutos)}</td><td>{dia.classificacao?.tipo ?? (dia.pendente ? 'Pendente' : 'Fechado')}</td></tr>)}</tbody></Table>
    <strong>Total realizado: {horas(espelho.totais.minutosRealizados)} · previsto: {horas(espelho.totais.minutosPrevistos)} · banco: {horas(espelho.totais.minutosBancoHoras)} · saldo: {horas(espelho.totais.saldoOperacionalMinutos)}</strong>
  </Card.Body></Card>;
}
