/**
 * Gerenciar Usuários - Página com 2 cards
 *
 * Usuários Cadastrados e Usuários Pendentes
 */

import React from 'react';
import { Container, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUsers,
    faUserClock,
    faUserPlus,
    faArrowLeft,
    faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import styles from './GerenciarUsuarios.module.css';

const GerenciarUsuarios: React.FC = () => {
    const navigate = useNavigate();

    const opcoes = [
        {
            id: 1,
            titulo: 'Usuários Cadastrados',
            descricao: 'Visualize e gerencie todos os usuários cadastrados no sistema',
            quantidade: 125,
            icone: faUsers,
            cor: styles.cardBlue,
            link: '/admin/users',
        },
        {
            id: 2,
            titulo: 'Usuários Pendentes',
            descricao: 'Aprove ou rejeite usuários aguardando aprovação',
            quantidade: 8,
            icone: faUserClock,
            cor: styles.cardYellow,
            link: '/admin/users?status=pending',
        },
        {
            id: 3,
            titulo: 'Criar Usuário',
            descricao: 'Adicione um novo usuário ao sistema manualmente',
            quantidade: 0,
            icone: faUserPlus,
            cor: styles.cardGreen,
            link: '/admin/users/new',
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
                            <FontAwesomeIcon icon={faUsers} style={{ marginRight: '1rem', color: '#667eea' }} />
                            Gerenciar Usuários
                        </h1>
                        <p className={styles.pageSubtitle}>
                            Escolha uma opção para gerenciar os usuários do sistema
                        </p>
                    </div>
                </div>

                {/* Grid com os 2 cards */}
                <div className={styles.opcoesGrid}>
                    {opcoes.map((opcao) => (
                        <Card
                            key={opcao.id}
                            className={`${styles.opcaoCard} ${opcao.cor}`}
                            onClick={() => navigate(opcao.link)}
                        >
                            <div className={styles.cardIconWrapper}>
                                <div className={styles.cardIcon}>
                                    <FontAwesomeIcon icon={opcao.icone} />
                                </div>
                                <div className={styles.cardQuantidade}>
                                    <div className={styles.quantidadeNumero}>
                                        {opcao.id === 3 ? '+' : opcao.quantidade}
                                    </div>
                                    <div className={styles.quantidadeLabel}>
                                        {opcao.id === 3 ? 'novo' : 'usuários'}
                                    </div>
                                </div>
                            </div>
                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitulo}>{opcao.titulo}</h3>
                                <p className={styles.cardDescricao}>{opcao.descricao}</p>
                            </div>
                            <div className={styles.cardFooter}>
                                <span className={styles.cardAction}>
                                    Acessar
                                    <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: '0.5rem' }} />
                                </span>
                            </div>
                        </Card>
                    ))}
                </div>
            </Container>
        </div>
    );
};

export default GerenciarUsuarios;
