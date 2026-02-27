import React from 'react';
import { Table } from 'react-bootstrap';

interface Column {
  header: string;
  accessor: string | ((item: any) => React.ReactNode);
  mobileLabel?: string; // Label personalizada para mobile (opcional)
}

interface ResponsiveTableProps {
  data: any[];
  columns: Column[];
  keyExtractor: (item: any) => string | number;
  renderActions?: (item: any) => React.ReactNode;
  actionsHeader?: React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

/**
 * Componente de tabela responsiva que automaticamente converte para cards no mobile
 *
 * @param data - Array de dados a serem exibidos
 * @param columns - Configuração das colunas (header, accessor, mobileLabel)
 * @param keyExtractor - Função para extrair chave única de cada item
 * @param renderActions - Função para renderizar ações (botões editar/deletar)
 * @param emptyMessage - Mensagem quando não há dados
 * @param className - Classes CSS adicionais
 */
const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  data,
  columns,
  keyExtractor,
  renderActions,
  actionsHeader,
  emptyMessage = 'Nenhum item encontrado.',
  className = ''
}) => {
  // Função auxiliar para resolver accessor
  const resolveValue = (item: any, accessor: string | ((item: any) => React.ReactNode)) => {
    if (typeof accessor === 'function') {
      return accessor(item);
    }
    // Suporta nested properties (ex: "usuario.nome")
    return accessor.split('.').reduce((obj, key) => obj?.[key], item);
  };

  if (data.length === 0) {
    return (
      <div className="text-center text-muted p-4">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* DESKTOP VIEW - Table */}
      <div className={`table-responsive-mobile ${className}`}>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx}>{col.header}</th>
              ))}
              {renderActions && <th>{actionsHeader || 'Ações'}</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={keyExtractor(item)}>
                {columns.map((col, idx) => (
                  <td key={idx}>
                    {resolveValue(item, col.accessor)}
                  </td>
                ))}
                {renderActions && (
                  <td>{renderActions(item)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* MOBILE VIEW - Cards */}
      <div className="mobile-card-view">
        {data.map((item) => (
          <div key={keyExtractor(item)} className="mobile-item-card">
            {/* Header com ações */}
            <div className="mobile-item-card__header">
              <h3 className="mobile-item-card__title">
                {resolveValue(item, columns[0].accessor)}
              </h3>
              {renderActions && (
                <div className="mobile-item-card__actions">
                  {renderActions(item)}
                </div>
              )}
            </div>

            {/* Body com campos */}
            <div className="mobile-item-card__body">
              {columns.slice(1).map((col, idx) => (
                <div key={idx} className="mobile-item-card__row">
                  <span className="mobile-item-card__label">
                    {col.mobileLabel || col.header}:
                  </span>
                  <span className="mobile-item-card__value">
                    {resolveValue(item, col.accessor)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default ResponsiveTable;
