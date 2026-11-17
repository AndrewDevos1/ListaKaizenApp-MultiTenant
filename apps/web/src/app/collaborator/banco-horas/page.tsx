'use client';

import SeletorMes from '@/components/SeletorMes';
import { useEffect, useState } from 'react';
import { Alert, Card, Form, Spinner, Table } from 'react-bootstrap';
import api from '@/lib/api';
import { dataBR } from '@/lib/formatar';

type Lancamento = { id: number; tipo: string; minutosDelta: number; dataReferencia: string; motivo: string };
type Resposta = { competencia: string; lancamentos: Lancamento[]; minutosMes: number; minutosTotalLancado: number };

const horas = (v: number) => `${v < 0 ? '-' : '+'}${String(Math.floor(Math.abs(v) / 60)).padStart(2, '0')}:${String(Math.abs(v) % 60).padStart(2, '0')}`;
const mesAtual = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);

export default function BancoHorasColaboradorPage() {
  const [competencia, setCompetencia] = useState(mesAtual);
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro('');
    api.get<Resposta>('/v1/collaborator/banco-horas', { params: { competencia } })
      .then(({ data }) => { if (ativo) setDados(data); })
      .catch(() => { if (ativo) { setDados(null); setErro('Não foi possível carregar o banco de horas.'); } })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [competencia]);

  return (
    <Card>
      <Card.Header className="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <strong>Meu Banco de Horas</strong>
        <Form.Group controlId="competencia-banco">
          <Form.Label className="mb-1">Mês de referência</Form.Label>
          <SeletorMes value={competencia} onChange={setCompetencia} />
        </Form.Group>
      </Card.Header>
      <Card.Body>
        {erro && <Alert variant="danger" role="alert">{erro}</Alert>}
        {carregando && <div role="status"><Spinner animation="border" /> Carregando...</div>}
        {!carregando && dados && (
          <>
            <div className="d-flex flex-wrap gap-3 mb-3" aria-label="Totais">
              <span>Ajustes no mês: <strong>{horas(dados.minutosMes)}</strong></span>
              <span>Total lançado (todos os meses): <strong>{horas(dados.minutosTotalLancado)}</strong></span>
            </div>
            <Table responsive hover size="sm">
              <thead><tr><th>Data</th><th className="d-none d-sm-table-cell">Tipo</th><th>Saldo</th><th>Motivo</th></tr></thead>
              <tbody>
                {dados.lancamentos.map((l) => <tr key={l.id}><td>{dataBR(l.dataReferencia)}</td><td className="d-none d-sm-table-cell">{l.tipo}</td><td>{horas(l.minutosDelta)}</td><td>{l.motivo}</td></tr>)}
                {!dados.lancamentos.length && <tr><td colSpan={4}>Nenhum lançamento neste mês.</td></tr>}
              </tbody>
            </Table>
            <p className="text-muted mb-0">Somente lançamentos registrados pelo administrador. Não inclui saldo operacional calculado; veja o Espelho de Ponto.</p>
          </>
        )}
      </Card.Body>
    </Card>
  );
}
