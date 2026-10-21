'use client';

import { useEffect, useState } from 'react';
import { Alert, Card, Form, Spinner, Table } from 'react-bootstrap';
import api from '@/lib/api';

type Batida = { id: number; tipo: 'ENTRADA' | 'PAUSA' | 'RETORNO' | 'SAIDA'; registradoEm: string };
type Lancamento = { tipo: string; minutosDelta: number; motivo: string };
type Dia = {
  data: string;
  batidas: Batida[];
  minutosPrevistos: number;
  minutosRealizados: number;
  minutosAbonados: number;
  minutosBancoHoras: number;
  classificacao: { tipo: 'FALTA' | 'FOLGA'; motivo?: string | null } | null;
  lancamentos: Lancamento[];
  pendente: boolean;
  saldoOperacionalMinutos: number | null;
};
type Espelho = {
  competencia: string;
  dias: Dia[];
  totais: {
    minutosRealizados: number;
    minutosAbonados: number;
    minutosBancoHoras: number;
    minutosPrevistos: number;
    saldoOperacionalMinutos: number;
    diasPendentes: number;
  };
};
const fuso = 'America/Sao_Paulo';
const horas = (valor: number) =>
  `${valor < 0 ? '-' : ''}${String(Math.floor(Math.abs(valor) / 60)).padStart(2, '0')}:${String(Math.abs(valor) % 60).padStart(2, '0')}`;

function dataBrasilia(data: Date) {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(data);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value;
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

function horaBatida(iso: string, dataOperacional: string) {
  const data = new Date(iso);
  const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, hour: '2-digit', minute: '2-digit', hour12: false }).format(data);
  return `${hora}${dataBrasilia(data) !== dataOperacional ? ' (+1 dia)' : ''}`;
}

function situacao(dia: Dia) {
  if (dia.classificacao) return dia.classificacao.tipo;
  if (dia.minutosAbonados > 0) return 'ATESTADO APROVADO';
  if (dia.pendente) return 'PENDENTE';
  if (dia.batidas.length > 0) return 'FECHADO';
  if (dia.lancamentos.length > 0) return 'AJUSTE';
  return '—';
}

export default function EspelhoPontoPage() {
  const [competencia, setCompetencia] = useState(() => dataBrasilia(new Date()).slice(0, 7));
  const [espelho, setEspelho] = useState<Espelho | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro('');
    api.get<Espelho>('/v1/collaborator/espelho-ponto', { params: { competencia } })
      .then(({ data }) => { if (ativo) setEspelho(data); })
      .catch(() => { if (ativo) { setEspelho(null); setErro('Não foi possível carregar o espelho do mês selecionado.'); } })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [competencia]);

  return (
    <Card>
      <Card.Header className="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <strong>Meu Espelho Mensal / Banco de Horas</strong>
        <Form.Group controlId="competencia-espelho">
          <Form.Label className="mb-1">Mês de referência</Form.Label>
          <Form.Control type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} required />
        </Form.Group>
      </Card.Header>
      <Card.Body>
        {erro && <Alert variant="danger" role="alert">{erro}</Alert>}
        {carregando && <div role="status"><Spinner animation="border" /> Carregando espelho...</div>}
        {!carregando && espelho && (
          <>
            <Table responsive hover>
              <thead><tr>
                <th>Data operacional</th><th>Batidas reais</th><th>Previsto</th><th>Realizado</th>
                <th>Abonado</th><th>Banco</th><th>Saldo</th><th>Status</th>
              </tr></thead>
              <tbody>
                {espelho.dias.map((dia) => <tr key={dia.data}>
                  <td>{dia.data}</td>
                  <td>
                    {dia.batidas.length ? (
                      <div className="d-flex flex-column gap-1">
                        {dia.batidas.map((batida) => (
                          <span key={batida.id}>{batida.tipo}: {horaBatida(batida.registradoEm, dia.data)}</span>
                        ))}
                      </div>
                    ) : '—'}
                  </td>
                  <td>{horas(dia.minutosPrevistos)}</td>
                  <td>{horas(dia.minutosRealizados)}</td>
                  <td>{horas(dia.minutosAbonados)}</td>
                  <td>{horas(dia.minutosBancoHoras)}</td>
                  <td>{dia.saldoOperacionalMinutos === null ? '—' : horas(dia.saldoOperacionalMinutos)}</td>
                  <td>{situacao(dia)}</td>
                </tr>)}
              </tbody>
            </Table>
            <div className="d-flex flex-wrap gap-3" aria-label="Totais do mês">
              <span>Realizado: <strong>{horas(espelho.totais.minutosRealizados)}</strong></span>
              <span>Previsto: <strong>{horas(espelho.totais.minutosPrevistos)}</strong></span>
              <span>Abonado: <strong>{horas(espelho.totais.minutosAbonados)}</strong></span>
              <span>Ajustes do banco: <strong>{horas(espelho.totais.minutosBancoHoras)}</strong></span>
              <span>Saldo operacional: <strong>{horas(espelho.totais.saldoOperacionalMinutos)}</strong></span>
            </div>
            <p className="text-muted mt-3 mb-0">
              As batidas após a meia-noite permanecem vinculadas à data da entrada. Horários em Brasília.
              Os ajustes de banco de horas são exibidos somente quando registrados.
            </p>
          </>
        )}
      </Card.Body>
    </Card>
  );
}
