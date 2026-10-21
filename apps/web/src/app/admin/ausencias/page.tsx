'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import api from '@/lib/api';

type Tipo = 'FALTA' | 'FOLGA';
type Usuario = { id: number; nome: string; email: string };
type Ausencia = {
  id: number;
  data: string;
  tipo: Tipo;
  motivo: string | null;
  usuario: Usuario;
  classificadoPor: Pick<Usuario, 'id' | 'nome'>;
};

export default function AusenciasPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [usuarioId, setUsuarioId] = useState('');
  const [data, setData] = useState('');
  const [tipo, setTipo] = useState<Tipo>('FALTA');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [usuariosResponse, ausenciasResponse] = await Promise.all([
        api.get<Usuario[]>('/v1/admin/usuarios'),
        api.get<Ausencia[]>('/v1/admin/ausencias'),
      ]);
      setUsuarios(usuariosResponse.data);
      setAusencias(ausenciasResponse.data);
    } catch {
      setError('Erro ao carregar ausências.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (!usuarioId || !data) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/v1/admin/ausencias/classificar', {
        usuarioId: Number(usuarioId), data, tipo, motivo: motivo.trim() || undefined,
      });
      setSuccess('Ausência classificada. Reclassificações substituem o registro do mesmo dia.');
      setMotivo('');
      await carregar();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || 'Erro ao classificar ausência.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container py-4">
      <h1 className="h3 mb-4">Faltas e folgas</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      <Card className="mb-4"><Card.Body>
        <Form onSubmit={salvar} className="row g-3">
          <Form.Group className="col-md-4"><Form.Label>Colaborador</Form.Label>
            <Form.Select value={usuarioId} onChange={(event) => setUsuarioId(event.target.value)} required>
              <option value="">Selecione</option>
              {usuarios.map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.nome}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group className="col-md-3"><Form.Label>Data</Form.Label><Form.Control type="date" value={data} onChange={(event) => setData(event.target.value)} required /></Form.Group>
          <Form.Group className="col-md-2"><Form.Label>Classificação</Form.Label>
            <Form.Select value={tipo} onChange={(event) => setTipo(event.target.value as Tipo)}><option value="FALTA">Falta</option><option value="FOLGA">Folga</option></Form.Select>
          </Form.Group>
          <Form.Group className="col-md-3"><Form.Label>Motivo</Form.Label><Form.Control value={motivo} maxLength={500} onChange={(event) => setMotivo(event.target.value)} /></Form.Group>
          <div className="col-12"><Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Classificar'}</Button></div>
        </Form>
      </Card.Body></Card>
      <Card><Card.Body>
        <Card.Title>Classificações</Card.Title>
        {loading ? <Spinner animation="border" /> : <Table responsive hover><thead><tr><th>Data</th><th>Colaborador</th><th>Tipo</th><th>Motivo</th><th>Admin</th></tr></thead><tbody>
          {ausencias.map((ausencia) => <tr key={ausencia.id}><td>{new Date(`${ausencia.data.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')}</td><td>{ausencia.usuario.nome}</td><td>{ausencia.tipo}</td><td>{ausencia.motivo || '—'}</td><td>{ausencia.classificadoPor.nome}</td></tr>)}
          {!ausencias.length && <tr><td colSpan={5}>Nenhuma classificação.</td></tr>}
        </tbody></Table>}
      </Card.Body></Card>
    </main>
  );
}
