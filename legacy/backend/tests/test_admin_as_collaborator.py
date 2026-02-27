"""
Testes para permitir admin atuar como colaborador sem atribuicao manual.
"""
from kaizen_app import db
from kaizen_app.models import (
    Lista,
    ListaItemRef,
    ListaMaeItem,
    Pedido,
    Restaurante,
    Submissao,
    UserRoles,
)
from kaizen_app.services import (
    get_estoque_lista_colaborador,
    get_lista_colaborador,
    get_minhas_listas,
    submit_estoque_lista,
)
from .conftest import create_user


def _criar_lista_com_item(restaurante_id):
    lista = Lista(
        nome="Lista Admin",
        descricao="Lista de teste",
        restaurante_id=restaurante_id
    )
    db.session.add(lista)
    db.session.flush()

    item = ListaMaeItem(
        nome="Item Admin",
        unidade="kg",
        restaurante_id=restaurante_id
    )
    db.session.add(item)
    db.session.flush()

    ref = ListaItemRef(
        lista_id=lista.id,
        item_id=item.id,
        quantidade_atual=5.0,
        quantidade_minima=10.0
    )
    db.session.add(ref)
    db.session.commit()

    return lista, item, ref


def test_admin_submit_lista_sem_atribuicao(app):
    with app.app_context():
        restaurante = Restaurante.query.first()
        admin = create_user(
            "Admin",
            "admin-collab@test.com",
            "senha123",
            UserRoles.ADMIN,
            aprovado=True,
            restaurante_id=restaurante.id
        )
        lista, _, ref = _criar_lista_com_item(restaurante.id)

        payload = [{"estoque_id": ref.item_id, "quantidade_atual": 4.0}]
        response, status = submit_estoque_lista(lista.id, admin.id, payload)

        assert status == 201
        assert response["pedidos_criados"] == 1

        submissao = Submissao.query.get(response["submissao_id"])
        assert submissao.usuario_id == admin.id

        pedido = Pedido.query.filter_by(submissao_id=submissao.id).first()
        assert pedido.usuario_id == admin.id


def test_admin_get_minhas_listas_inclui_nao_atribuida(app):
    with app.app_context():
        restaurante = Restaurante.query.first()
        admin = create_user(
            "Admin",
            "admin-listas@test.com",
            "senha123",
            UserRoles.ADMIN,
            aprovado=True,
            restaurante_id=restaurante.id
        )
        lista, _, _ = _criar_lista_com_item(restaurante.id)

        response, status = get_minhas_listas(admin.id)

        assert status == 200
        ids = {item["id"] for item in response["listas"]}
        assert lista.id in ids


def test_admin_get_lista_colaborador_sem_atribuicao(app):
    with app.app_context():
        restaurante = Restaurante.query.first()
        admin = create_user(
            "Admin",
            "admin-access@test.com",
            "senha123",
            UserRoles.ADMIN,
            aprovado=True,
            restaurante_id=restaurante.id
        )
        lista, _, _ = _criar_lista_com_item(restaurante.id)

        response, status = get_lista_colaborador(admin.id, lista.id)

        assert status == 200
        assert response["id"] == lista.id


def test_admin_get_estoque_lista_colaborador_sem_atribuicao(app):
    with app.app_context():
        restaurante = Restaurante.query.first()
        admin = create_user(
            "Admin",
            "admin-estoque@test.com",
            "senha123",
            UserRoles.ADMIN,
            aprovado=True,
            restaurante_id=restaurante.id
        )
        lista, _, _ = _criar_lista_com_item(restaurante.id)

        response, status = get_estoque_lista_colaborador(admin.id, lista.id)

        assert status == 200
        assert response


def test_colaborador_precisa_atribuicao(app):
    with app.app_context():
        restaurante = Restaurante.query.first()
        colaborador = create_user(
            "Colab",
            "colab@test.com",
            "senha123",
            UserRoles.COLLABORATOR,
            aprovado=True,
            restaurante_id=restaurante.id
        )
        lista, _, _ = _criar_lista_com_item(restaurante.id)

        response, status = get_lista_colaborador(colaborador.id, lista.id)

        assert status == 403
        assert "acesso negado" in response["error"].lower()


def test_super_admin_ve_todas_listas(app):
    with app.app_context():
        restaurante = Restaurante.query.first()
        super_admin = create_user(
            "Super",
            "super@test.com",
            "senha123",
            UserRoles.SUPER_ADMIN,
            aprovado=True
        )
        lista, _, _ = _criar_lista_com_item(restaurante.id)

        response, status = get_minhas_listas(super_admin.id)

        assert status == 200
        ids = {item["id"] for item in response["listas"]}
        assert lista.id in ids


def test_admin_nao_acessa_outro_restaurante(app):
    with app.app_context():
        restaurante = Restaurante.query.first()
        admin = create_user(
            "Admin",
            "admin-rest@test.com",
            "senha123",
            UserRoles.ADMIN,
            aprovado=True,
            restaurante_id=restaurante.id
        )
        outro_restaurante = Restaurante(
            nome="Outro Restaurante",
            slug="outro-restaurante",
            ativo=True
        )
        db.session.add(outro_restaurante)
        db.session.commit()

        lista, _, _ = _criar_lista_com_item(outro_restaurante.id)

        response, status = get_lista_colaborador(admin.id, lista.id)

        assert status == 403
        assert "não pertence" in response["error"].lower()
