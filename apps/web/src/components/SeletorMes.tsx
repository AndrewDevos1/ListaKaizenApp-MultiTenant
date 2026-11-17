'use client';
import { Form } from 'react-bootstrap';

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

// Valor "AAAA-MM". Não usa <input type="month"> porque ele segue o locale do navegador, não o lang da página.
export default function SeletorMes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [a, m] = value.split('-').map(Number);
  const anos = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i);
  const set = (ano: number, mes: number) => onChange(`${ano}-${String(mes).padStart(2, '0')}`);
  return (
    <div className="d-flex gap-2">
      <Form.Select style={{ minWidth: "9.5rem" }} aria-label="Mês" value={m} onChange={(e) => set(a, Number(e.target.value))}>
        {MESES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
      </Form.Select>
      <Form.Select aria-label="Ano" value={a} onChange={(e) => set(Number(e.target.value), m)}>
        {anos.map((y) => <option key={y} value={y}>{y}</option>)}
      </Form.Select>
    </div>
  );
}
