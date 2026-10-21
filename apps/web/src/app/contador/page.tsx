'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';

type Restaurante = { restaurante: { id: number; nome: string } };
type Funcionario = { id: number; nome: string; email: string; ativo: boolean };
type Consulta = { tipo: string; dados: unknown };

export default function ContadorPage() {
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [restauranteId, setRestauranteId] = useState('');
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [funcionarioId, setFuncionarioId] = useState('');
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [consultando, setConsultando] = useState(false);

  useEffect(() => {
    api.get<Restaurante[]>('/v1/contador/restaurantes')
      .then(({ data }) => {
        setRestaurantes(data);
        setRestauranteId(String(data[0]?.restaurante.id ?? ''));
      })
      .catch(() => setErro('Não foi possível consultar os restaurantes autorizados.'))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    if (!restauranteId) return;
    setErro(null);
    setFuncionarioId('');
    setConsulta(null);
    api.get<Funcionario[]>('/v1/contador/funcionarios', { params: { restauranteId } })
      .then(({ data }) => setFuncionarios(data))
      .catch(() => setErro('Não foi possível consultar os funcionários autorizados.'));
  }, [restauranteId]);

  async function consultar(tipo: 'ponto' | 'espelho' | 'documentos') {
    if (!funcionarioId) return;
    setErro(null);
    setConsultando(true);
    const path = `/v1/contador/funcionarios/${funcionarioId}/${tipo}`;
    try {
      const { data } = await api.get(path, {
        params: tipo === 'espelho' ? { restauranteId, competencia: new Date().toISOString().slice(0, 7) } : { restauranteId },
      });
      setConsulta({ tipo, dados: data });
    } catch {
      setErro(`Não foi possível consultar ${tipo}.`);
    } finally {
      setConsultando(false);
    }
  }

  return (
    <ProtectedRoute>
      <Card>
        <Card.Body>
          <Card.Title>Consultas do contador</Card.Title>
          <Form.Select value={restauranteId} onChange={(event) => setRestauranteId(event.target.value)} className="mb-3">
            {restaurantes.map(({ restaurante }) => <option key={restaurante.id} value={restaurante.id}>{restaurante.nome}</option>)}
          </Form.Select>
          {carregando && <Spinner animation="border" size="sm" />}
          {erro && <Alert variant="danger">{erro}</Alert>}
          {!carregando && !erro && (
            <>
              <Form.Select value={funcionarioId} onChange={(event) => setFuncionarioId(event.target.value)} className="mb-3">
                <option value="">Selecione um funcionário</option>
                {funcionarios.map((funcionario) => <option key={funcionario.id} value={funcionario.id}>{funcionario.nome}</option>)}
              </Form.Select>
              <Table responsive striped>
                <thead><tr><th>Nome</th><th>E-mail</th><th>Status</th></tr></thead>
                <tbody>{funcionarios.map((f) => <tr key={f.id}><td>{f.nome}</td><td>{f.email}</td><td>{f.ativo ? 'Ativo' : 'Inativo'}</td></tr>)}</tbody>
              </Table>
              <div className="d-flex gap-2 flex-wrap">
                <Button disabled={!funcionarioId || consultando} onClick={() => consultar('ponto')}>Ponto</Button>
                <Button disabled={!funcionarioId || consultando} onClick={() => consultar('espelho')}>Espelho mensal</Button>
                <Button disabled={!funcionarioId || consultando} onClick={() => consultar('documentos')}>Documentos</Button>
              </div>
              {consulta && <pre className="mt-3 mb-0">{JSON.stringify(consulta.dados, null, 2)}</pre>}
            </>
          )}
        </Card.Body>
      </Card>
    </ProtectedRoute>
  );
}
