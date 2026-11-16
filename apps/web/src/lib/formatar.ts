// Datas @db.Date chegam como ISO UTC; exibir só o dia civil (sem converter fuso) em pt-BR.
export function dataBR(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}
