/**
 * Criar Lista - Página com 4 opções de criação de lista
 *
 * Esta página exibe 4 cards principais para diferentes tipos de criação de lista
 */

import React from 'react';
import { Container, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faListAlt,
    faArrowLeft,
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import styles from './CriarLista.module.css';

const CriarLista: React.FC = () => {
    // Array com os 4 cards - você vai me dizer as funções depois
    const opcoes = [
        {
            id: 1,
            titulo: 'Opção 1',
            descricao: 'Descrição da primeira opção',
            icone: faListAlt,
            cor: styles.cardBlue,
            link: '/admin/criar-lista/opcao1',
        },
        {
            id: 2,
            titulo: 'Opção 2',
            descricao: 'Descrição da segunda opção',
            icone: faListAlt,
            cor: styles.cardGreen,
            link: '/admin/criar-lista/opcao2',
        },
        {
            id: 3,
            titulo: 'Opção 3',
            descricao: 'Descrição da terceira opção',
            icone: faListAlt,
            cor: styles.cardOrange,
            link: '/admin/criar-lista/opcao3',
        },
        {
            id: 4,
            titulo: 'Opção 4',
            descricao: 'Descrição da quarta opção',
            icone: faListAlt,
            cor: styles.cardPurple,
            link: '/admin/criar-lista/opcao4',
        },
    ];

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
                            <FontAwesomeIcon icon={faListAlt} style={{ marginRight: '1rem', color: '#2eb85c' }} />
                            Criar Nova Lista
                        </h1>
                        <p className={styles.pageSubtitle}>
                            Escolha uma das opções abaixo para criar uma nova lista
                        </p>
                    </div>
                </div>

                {/* Grid com os 4 cards */}
                <div className={styles.opcoesGrid}>
                    {opcoes.map((opcao) => (
                        <Link
                            key={opcao.id}
                            to={opcao.link}
                            className={styles.cardLink}
                        >
                            <Card className={`${styles.opcaoCard} ${opcao.cor}`}>
                                <div className={styles.cardIcon}>
                                    <FontAwesomeIcon icon={opcao.icone} />
                                </div>
                                <div className={styles.cardContent}>
                                    <h3 className={styles.cardTitulo}>{opcao.titulo}</h3>
                                    <p className={styles.cardDescricao}>{opcao.descricao}</p>
                                </div>
                                <div className={styles.cardFooter}>
                                    <span className={styles.cardAction}>
                                        Acessar →
                                    </span>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            </Container>
        </div>
    );
};

export default CriarLista;
