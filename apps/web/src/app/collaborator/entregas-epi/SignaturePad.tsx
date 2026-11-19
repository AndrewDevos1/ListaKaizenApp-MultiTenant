'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from 'react-bootstrap';

type Props = { onChange: (value: string) => void };

export default function SignaturePad({ onChange }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [signed, setSigned] = useState(false);
  const paint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = ref.current!;
    const point = canvas.getBoundingClientRect();
    const x = (event.clientX - point.left) * (canvas.width / point.width);
    const y = (event.clientY - point.top) * (canvas.height / point.height);
    const ctx = canvas.getContext('2d')!;
    if (!drawing.current) { ctx.beginPath(); ctx.moveTo(x, y); drawing.current = true; canvas.setPointerCapture(event.pointerId); return; }
    ctx.lineTo(x, y); ctx.stroke(); setSigned(true); onChange(canvas.toDataURL('image/png'));
  };
  const clear = () => { const canvas = ref.current; if (!canvas) return; canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height); drawing.current = false; setSigned(false); onChange(''); };
  useEffect(() => { const canvas = ref.current!; const ctx = canvas.getContext('2d')!; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#111'; ctx.clearRect(0, 0, canvas.width, canvas.height); }, []);
  return <section><canvas ref={ref} width={640} height={180} aria-label="Assinatura desenhada" className="border rounded w-100 bg-white touch-none" style={{ height: 180, touchAction: 'none' }} onPointerDown={paint} onPointerMove={(e) => { if (drawing.current) paint(e); }} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} />
    <div className="mt-2"><Button type="button" variant="outline-secondary" onClick={clear}>Limpar/refazer assinatura</Button>{signed && <span className="ms-2 text-success">Assinatura pronta</span>}</div></section>;
}
