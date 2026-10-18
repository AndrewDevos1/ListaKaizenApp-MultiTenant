'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Container, Spinner, Table } from 'react-bootstrap';
import { FaClock, FaPause, FaPlay, FaSignOutAlt } from 'react-icons/fa';
import api from '@/lib/api';

type TipoPonto = 'ENTRADA' | 'PAUSA' | 'RETORNO' | 'SAIDA';

interface RegistroPonto {
  id: number;
  tipo: TipoPonto;
  registradoEm: string;
  observacoes?: string | null;
}

interface StatusPonto {
  ultimoRegistro: RegistroPonto | null;
  tiposDisponiveis: TipoPonto[];
  jornadaEncerrada: boolean;
  registrosHoje: RegistroPonto[];
}

const labels: Record<TipoPonto, string> = {
  ENTRADA: 'Registrar entrada',
  PAUSA: 'Iniciar pausa',
  RETORNO: 'Retornar da pausa',
  SAIDA: 'Registrar saída',
};

const icons: Record<TipoPonto, React.ReactNode> = {
  ENTRADA: <FaPlay />,
  PAUSA: <FaPause />,
  RETORNO: <FaPlay />,
  SAIDA: <FaSignOutAlt />,
};

function formatarHora(valor: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit',
  }).format(new Date(valor));
}

export default function PontoPage() {
  const [status, setStatus] = useState<StatusPonto | null>(null);
  const [loading, setLoading] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const { data } = await api.get<StatusPonto>('/v1/collaborator/ponto/status');
      setStatus(data);
    } catch (error: any) {
      setErro(error?.response?.data?.message || 'Não foi possível carregar o ponto.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const registrar = async (tipo: TipoPonto) => {
    try {
      setRegistrando(true);
      setErro(null);
      await api.post('/v1/collaborator/ponto/registrar', { tipo });
      await carregar();
    } catch (error: any) {
      setErro(error?.response?.data?.message || 'Não foi possível registrar a batida.');
    } finally {
      setRegistrando(false);
    }
  };

  return (
    <Container className="py-4" style={{ maxWidth: 760 }}>
      <div className="d-flex align-items-center gap-2 mb-4">
        <FaClock size={28} />
        <div><h1 className="h3 mb-0">Meu ponto</h1><small className="text-muted">Registros de hoje</small></div>
      </div>
      {erro && <Alert variant="danger" dismissible onClose={() => setErro(null)}>{erro}</Alert>}
      {loading ? <div className="text-center py-5"><Spinner animation="border" /></div> : <>
        <Card className="mb-4"><Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span>Último registro</span>
            {status?.ultimoRegistro ? <Badge bg={status.jornadaEncerrada ? 'secondary' : 'success'}>{status.ultimoRegistro.tipo}</Badge> : <Badge bg="secondary">Sem registros</Badge>}
          </div>
          {status?.ultimoRegistro && <p className="mb-3 text-muted">{formatarHora(status.ultimoRegistro.registradoEm)}</p>}
          <div className="d-flex flex-wrap gap-2">
            {status?.tiposDisponiveis.map((tipo) => <Button key={tipo} onClick={() => void registrar(tipo)} disabled={registrando} variant={tipo === 'SAIDA' ? 'outline-danger' : 'primary'}>
              {icons[tipo]} <span className="ms-2">{labels[tipo]}</span>
            </Button>)}
            {status?.jornadaEncerrada && <span className="text-muted">Jornada encerrada.</span>}
          </div>
        </Card.Body></Card>
        <Card><Card.Header>Batidas de hoje</Card.Header><Card.Body className="p-0">
          <Table responsive className="mb-0"><thead><tr><th>Tipo</th><th>Horário</th></tr></thead><tbody>
            {status?.registrosHoje.map((registro) => <tr key={registro.id}><td>{registro.tipo}</td><td>{formatarHora(registro.registradoEm)}</td></tr>)}
            {!status?.registrosHoje.length && <tr><td colSpan={2} className="text-center text-muted py-4">Nenhuma batida registrada.</td></tr>}
          </tbody></Table>
        </Card.Body></Card>
      </>}
    </Container>
  );
}
