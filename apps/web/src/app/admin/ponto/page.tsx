'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import api from '@/lib/api';

type Usuario = { id: number; nome: string; role: string };
type Escala = {
  id: number;
  nome: string;
  usuario: { nome: string };
  vigenciaInicio: string;
  vigenciaFim: string | null;
};
type Lancamento = {
  id: number;
  tipo: string;
  minutosDelta: number;
  dataReferencia: string;
  motivo: string;
  usuario: { nome: string };
};

const diasSemana = [
  { diaSemana: 1, nome: 'Seg' },
  { diaSemana: 2, nome: 'Ter' },
  { diaSemana: 3, nome: 'Qua' },
  { diaSemana: 4, nome: 'Qui' },
  { diaSemana: 5, nome: 'Sex' },
  { diaSemana: 6, nome: 'Sáb' },
  { diaSemana: 0, nome: 'Dom' },
];

function dataHojeLocal() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value;
  return `${parte('year')}-${parte('month')}-${parte('day')}`;
}

function minutosEntre(entrada: string, saida: string) {
  const [he, me] = entrada.split(':').map(Number);
  const [hs, ms] = saida.split(':').map(Number);
  if ([he, me, hs, ms].some((n) => !Number.isInteger(n)) || he > 23 || hs > 23 || me > 59 || ms > 59) return 0;
  return ((hs * 60 + ms - he * 60 - me) + 1_440) % 1_440;
}

const horas = (valor: number) =>
  `${valor < 0 ? '-' : ''}${String(Math.floor(Math.abs(valor) / 60)).padStart(2, '0')}:${String(Math.abs(valor) % 60).padStart(2, '0')}`;

export default function AdminPontoPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [usuarioId, setUsuarioId] = useState('');
  const [nome, setNome] = useState('Jornada noturna');
  const [inicio, setInicio] = useState(dataHojeLocal);
  const [entrada, setEntrada] = useState('18:00');
  const [saida, setSaida] = useState('02:00');
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [delta, setDelta] = useState('');
  const [motivo, setMotivo] = useState('');
  const duracao = minutosEntre(entrada, saida);
  const diaSeguinte = saida < entrada;

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      const [u, a, b] = await Promise.all([
        api.get<Usuario[]>('/v1/admin/usuarios'),
        api.get<Escala[]>('/v1/admin/escalas-trabalho'),
        api.get<Lancamento[]>('/v1/admin/banco-horas/lancamentos'),
      ]);
      setUsuarios(u.data.filter((usuario) => usuario.role === 'COLLABORATOR'));
      setEscalas(a.data);
      setLancamentos(b.data);
    } catch {
      setErro('Não foi possível carregar funcionários, escalas e banco de horas.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const alternarDia = (diaSemana: number, marcado: boolean) => {
    setDias((anteriores) => marcado
      ? [...anteriores.filter((dia) => dia !== diaSemana), diaSemana]
      : anteriores.filter((dia) => dia !== diaSemana));
  };

  const enviar = async (evento: FormEvent, tipo: 'escala' | 'banco') => {
    evento.preventDefault();
    if (salvando) return;
    setErro('');
    setOk('');
    const id = Number(usuarioId);
    if (!usuarios.some((usuario) => usuario.id === id)) {
      setErro('Selecione um colaborador do restaurante.');
      return;
    }
    if (tipo === 'escala' && (dias.length === 0 || duracao === 0)) {
      setErro('Escolha pelo menos um dia e horários de entrada e saída diferentes.');
      return;
    }
    setSalvando(true);
    try {
      if (tipo === 'escala') {
        await api.post('/v1/admin/escalas-trabalho', {
          usuarioId: id,
          nome,
          vigenciaInicio: inicio,
          dias: diasSemana.filter((dia) => dias.includes(dia.diaSemana)).map((dia) => ({
            diaSemana: dia.diaSemana,
            trabalha: true,
            entradaPrevista: entrada,
            saidaPrevista: saida,
            toleranciaMinutos: 0,
          })),
        });
      } else {
        await api.post('/v1/admin/banco-horas/lancamentos', {
          usuarioId: id, tipo: 'AJUSTE_MANUAL',
          minutosDelta: Number(delta), dataReferencia: inicio, motivo,
        });
      }
      setOk(tipo === 'escala' ? 'Escala criada para o colaborador.' : 'Ajuste auditado criado.');
      await carregar();
    } catch (erroEnvio: unknown) {
      const resposta = erroEnvio as { response?: { data?: { message?: string } } };
      setErro(resposta.response?.data?.message || 'Operação recusada.');
    } finally {
      setSalvando(false);
    }
  };

  const seletorColaborador = (id: string) => (
    <Form.Group className="mb-3" controlId={id}>
      <Form.Label>Colaborador</Form.Label>
      <Form.Select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} required>
        <option value="">Selecione pelo nome</option>
        {usuarios.map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.nome}</option>)}
      </Form.Select>
    </Form.Group>
  );

  if (carregando) return <Spinner animation="border" />;

  return (
    <>
      <h2>Ponto e banco de horas</h2>
      {erro && <Alert variant="danger">{erro}</Alert>}
      {ok && <Alert variant="success">{ok}</Alert>}
      <Row className="g-3">
        <Col lg={6}>
          <Card>
            <Card.Body>
              <Card.Title>Nova escala de trabalho</Card.Title>
              <Form onSubmit={(evento) => void enviar(evento, 'escala')}>
                {seletorColaborador('escala-colaborador')}
                <Form.Group className="mb-3" controlId="escala-nome">
                  <Form.Label>Nome da escala</Form.Label>
                  <Form.Control value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} required />
                </Form.Group>
                <Form.Group className="mb-3" controlId="escala-vigencia">
                  <Form.Label>Início de vigência</Form.Label>
                  <Form.Control type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label as="div">Dias de trabalho</Form.Label>
                  {diasSemana.map(({ diaSemana, nome: diaNome }) => (
                    <Form.Check
                      inline
                      key={diaSemana}
                      type="checkbox"
                      id={`escala-dia-${diaSemana}`}
                      label={diaNome}
                      checked={dias.includes(diaSemana)}
                      onChange={(e) => alternarDia(diaSemana, e.target.checked)}
                    />
                  ))}
                </Form.Group>
                <Row>
                  <Col sm={6}>
                    <Form.Group className="mb-3" controlId="escala-entrada">
                      <Form.Label>Entrada</Form.Label>
                      <Form.Control type="time" value={entrada} onChange={(e) => setEntrada(e.target.value)} required />
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group className="mb-3" controlId="escala-saida">
                      <Form.Label>Saída</Form.Label>
                      <Form.Control type="time" value={saida} onChange={(e) => setSaida(e.target.value)} required />
                    </Form.Group>
                  </Col>
                </Row>
                <Alert variant="info">
                  Jornada prevista: <strong>{duracao ? horas(duracao) : 'horários inválidos'}</strong>
                  {diaSeguinte && <span> — saída no dia seguinte (+1 dia)</span>}.
                  A pausa é opcional e só é descontada quando registrada no ponto.
                  O dia de referência é o da entrada.
                </Alert>
                <Button type="submit" disabled={salvando || dias.length === 0 || duracao === 0}>
                  {salvando ? 'Salvando...' : 'Criar escala'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card>
            <Card.Body>
              <Card.Title>Ajuste administrativo</Card.Title>
              <Form onSubmit={(evento) => void enviar(evento, 'banco')}>
                {seletorColaborador('ajuste-colaborador')}
                <Form.Group className="mb-3" controlId="ajuste-minutos">
                  <Form.Label>Minutos (+ crédito, - débito)</Form.Label>
                  <Form.Control type="number" value={delta} onChange={(e) => setDelta(e.target.value)} required />
                </Form.Group>
                <Form.Group className="mb-3" controlId="ajuste-data">
                  <Form.Label>Data de referência</Form.Label>
                  <Form.Control type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
                </Form.Group>
                <Form.Group className="mb-3" controlId="ajuste-motivo">
                  <Form.Label>Motivo auditável</Form.Label>
                  <Form.Control value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
                </Form.Group>
                <Button type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Registrar ajuste'}</Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Card className="mt-3">
        <Card.Header>Escalas vigentes e históricas</Card.Header>
        <Table responsive>
          <thead><tr><th>Colaborador</th><th>Escala</th><th>Início</th><th>Fim</th></tr></thead>
          <tbody>
            {escalas.map((escala) => (
              <tr key={escala.id}>
                <td>{escala.usuario.nome}</td><td>{escala.nome}</td>
                <td>{escala.vigenciaInicio.slice(0, 10)}</td>
                <td>{escala.vigenciaFim?.slice(0, 10) || 'Aberta'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Card className="mt-3">
        <Card.Header>Lançamentos auditados</Card.Header>
        <Table responsive>
          <thead><tr><th>Colaborador</th><th>Tipo</th><th>Data</th><th>Delta</th><th>Motivo</th></tr></thead>
          <tbody>
            {lancamentos.map((lancamento) => (
              <tr key={lancamento.id}>
                <td>{lancamento.usuario.nome}</td><td>{lancamento.tipo}</td>
                <td>{lancamento.dataReferencia.slice(0, 10)}</td>
                <td>{horas(lancamento.minutosDelta)}</td><td>{lancamento.motivo}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
