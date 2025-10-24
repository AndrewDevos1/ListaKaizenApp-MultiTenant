/**
 * Listas de Compras - Gerenciamento de listas
 *
 * Esta página permite criar, visualizar, editar e deletar listas de compras
 */

import React, { useState } from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faShoppingCart,
    faArrowLeft,
    faPlus,
    faEdit,
    faTrash,
    faListAlt,
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import styles from './ListasCompras.module.css';

const ListasCompras: React.FC = () => {
    // Estado para gerenciar listas
    const [listas] = useState([
        {
            id: 1,
            nome: 'Lista de Compras - Exemplo',
            descricao: 'Lista exemplo com itens básicos',
            itens: 5,
            data: '23/10/2025',
        }
    ]);

    const handleAdicionar = () => {
        console.log('Adicionar nova lista');
        // TODO: Implementar modal/página de criação
    };

    const handleEditar = (id: number) => {
        console.log('Editar lista:', id);
        // TODO: Implementar edição
    };

    const handleDeletar = (id: number) => {
        console.log('Deletar lista:', id);
        // TODO: Implementar deleção
    };

    return (
        <div className={styles.pageWrapper}>
            <Container fluid>
                {/* Header com botão voltar */}
                <div className={styles.pageHeader}>
                    <div>
                        <Link to="/admin" className={styles.backButton}>
                            <FontAwesomeIcon icon={faArrowLeft} />
                            Voltar ao Dashboard
                        </Link>
                        <h1 className={styles.pageTitle}>
                            <FontAwesomeIcon icon={faShoppingCart} style={{ marginRight: '1rem', color: '#f9b115' }} />
                            Listas de Compras
                        </h1>
                        <p className={styles.pageSubtitle}>
                            Gerencie suas listas de compras
                        </p>
                    </div>
                    <Button
                        variant="success"
                        size="lg"
                        onClick={handleAdicionar}
                        className={styles.addButton}
                    >
                        <FontAwesomeIcon icon={faPlus} style={{ marginRight: '0.5rem' }} />
                        Adicionar Lista
                    </Button>
                </div>

                {/* Grid com os cards */}
                <div className={styles.listasGrid}>
                    {/* Cards de listas existentes */}
                    {listas.map((lista) => (
                        <Card key={lista.id} className={`${styles.listaCard} ${styles.cardLista}`}>
                            <div className={styles.cardHeader}>
                                <div className={styles.cardIcon}>
                                    <FontAwesomeIcon icon={faListAlt} />
                                </div>
                                <div className={styles.cardActions}>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => handleEditar(lista.id)}
                                        className={styles.actionButton}
                                        title="Editar"
                                    >
                                        <FontAwesomeIcon icon={faEdit} />
                                    </Button>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => handleDeletar(lista.id)}
                                        className={`${styles.actionButton} ${styles.deleteButton}`}
                                        title="Deletar"
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </Button>
                                </div>
                            </div>
                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitulo}>{lista.nome}</h3>
                                <p className={styles.cardDescricao}>{lista.descricao}</p>
                                <div className={styles.cardInfo}>
                                    <span className={styles.infoItem}>
                                        <strong>{lista.itens}</strong> itens
                                    </span>
                                    <span className={styles.infoItem}>
                                        {lista.data}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.cardFooter}>
                                <Button
                                    variant="outline-primary"
                                    className={styles.cardButton}
                                    onClick={() => handleEditar(lista.id)}
                                >
                                    Ver Detalhes
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </Container>
        </div>
    );
};

export default ListasCompras;
