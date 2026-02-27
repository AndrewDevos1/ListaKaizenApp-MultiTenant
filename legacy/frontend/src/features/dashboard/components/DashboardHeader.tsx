import React from 'react';
import { Form, Button, ButtonGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';
import { Restaurante } from '../types';
import { formatarHoraBrasilia } from '../../../utils/dateFormatter';
import styles from '../GlobalDashboard.module.css';

interface DashboardHeaderProps {
  restaurantes: Restaurante[];
  selectedRestaurante: number | null;
  period: number;
  onRestauranteChange: (id: number | null) => void;
  onPeriodChange: (days: number) => void;
  onRefresh: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  lastUpdated: Date | null;
  loading: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  restaurantes,
  selectedRestaurante,
  period,
  onRestauranteChange,
  onPeriodChange,
  onRefresh,
  onExportPDF,
  onExportExcel,
  lastUpdated,
  loading
}) => {
  const listaRestaurantes = Array.isArray(restaurantes) ? restaurantes : [];

  const formatLastUpdate = (date: Date) => {
    return formatarHoraBrasilia(date.toISOString());
  };

  return (
    <div className={styles.header}>
      <div className={styles.titleSection}>
        <h1 className={styles.title}>Dashboard Global</h1>
        {lastUpdated && (
          <span className={styles.lastUpdate}>
            Última atualização: {formatLastUpdate(lastUpdated)}
          </span>
        )}
      </div>

      <div className={styles.controls}>
        <Form.Select
          className={styles.filterSelect}
          value={selectedRestaurante ?? ''}
          onChange={(e) => onRestauranteChange(e.target.value ? Number(e.target.value) : null)}
          disabled={listaRestaurantes.length === 0}
        >
          <option value="">Todos os Restaurantes</option>
          {listaRestaurantes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome}
            </option>
          ))}
        </Form.Select>

        <Form.Select
          className={styles.filterSelect}
          value={period}
          onChange={(e) => onPeriodChange(Number(e.target.value))}
        >
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={60}>Últimos 60 dias</option>
          <option value={90}>Últimos 90 dias</option>
        </Form.Select>

        <Button
          variant="outline-primary"
          className={styles.refreshBtn}
          onClick={onRefresh}
          disabled={loading}
        >
          <FontAwesomeIcon icon={faSync} className={loading ? styles.spinning : ''} />
          Atualizar
        </Button>

        <ButtonGroup className={styles.exportBtnGroup}>
          <Button variant="outline-danger" onClick={onExportPDF} disabled={loading}>
            <FontAwesomeIcon icon={faFilePdf} /> PDF
          </Button>
          <Button variant="outline-success" onClick={onExportExcel} disabled={loading}>
            <FontAwesomeIcon icon={faFileExcel} /> Excel
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
};

export default DashboardHeader;
