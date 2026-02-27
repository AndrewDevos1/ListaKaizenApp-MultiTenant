import json

from kaizen_app import db, services
from kaizen_app.models import UserRoles, Restaurante, Fornecedor, Item, ListaMaeItem, Lista, ListaItemRef, FornecedorItemCodigo
from .conftest import create_user, get_auth_token


def test_criar_item_fornecedor_route(client, app):
    with app.app_context():
        create_user('Admin', 'admin_item@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
        restaurante = Restaurante.query.first()
        fornecedor = Fornecedor(nome='Fornecedor Teste', restaurante_id=restaurante.id)
        db.session.add(fornecedor)
        db.session.commit()
        fornecedor_id = fornecedor.id
        token = get_auth_token(client, 'admin_item@example.com', 'senha')

    response = client.post(
        f'/api/v1/fornecedores/{fornecedor_id}/itens',
        data=json.dumps({
            'nome': 'Arroz Tipo 1',
            'unidade_medida': 'kg'
        }),
        headers={'Authorization': f'Bearer {token}'},
        content_type='application/json'
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data['fornecedor_id'] == fornecedor_id


def test_listar_itens_fornecedor_route(client, app):
    with app.app_context():
        create_user('Colab', 'colab_item@example.com', 'senha', UserRoles.COLLABORATOR, aprovado=True)
        restaurante = Restaurante.query.first()
        fornecedor = Fornecedor(nome='Fornecedor Listagem', restaurante_id=restaurante.id)
        db.session.add(fornecedor)
        db.session.flush()
        item = Item(nome='Feijao', unidade_medida='kg', fornecedor_id=fornecedor.id)
        db.session.add(item)
        db.session.commit()
        fornecedor_id = fornecedor.id
        token = get_auth_token(client, 'colab_item@example.com', 'senha')

    response = client.get(
        f'/api/v1/fornecedores/{fornecedor_id}/itens',
        headers={'Authorization': f'Bearer {token}'}
    )

    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert any(i['nome'] == 'Feijao' for i in data)


def test_atualizar_item_fornecedor_route(client, app):
    with app.app_context():
        create_user('Admin', 'admin_update_item@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
        restaurante = Restaurante.query.first()
        fornecedor = Fornecedor(nome='Fornecedor Update', restaurante_id=restaurante.id)
        db.session.add(fornecedor)
        db.session.flush()
        item = Item(nome='Acucar', unidade_medida='kg', fornecedor_id=fornecedor.id)
        db.session.add(item)
        db.session.commit()
        item_id = item.id
        token = get_auth_token(client, 'admin_update_item@example.com', 'senha')

    response = client.put(
        f'/api/v1/fornecedores/itens/{item_id}',
        data=json.dumps({
            'nome': 'Acucar Cristal',
            'unidade_medida': 'g'
        }),
        headers={'Authorization': f'Bearer {token}'},
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data['nome'] == 'Acucar Cristal'
    assert data['unidade_medida'] == 'g'


def test_deletar_item_fornecedor_route(client, app):
    with app.app_context():
        create_user('Admin', 'admin_delete_item@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
        restaurante = Restaurante.query.first()
        fornecedor = Fornecedor(nome='Fornecedor Delete', restaurante_id=restaurante.id)
        db.session.add(fornecedor)
        db.session.flush()
        item = Item(nome='Sal', unidade_medida='kg', fornecedor_id=fornecedor.id)
        db.session.add(item)
        db.session.commit()
        token = get_auth_token(client, 'admin_delete_item@example.com', 'senha')
        item_id = item.id

    response = client.delete(
        f'/api/v1/fornecedores/itens/{item_id}',
        headers={'Authorization': f'Bearer {token}'}
    )

    assert response.status_code == 200
    with app.app_context():
        assert db.session.get(Item, item_id) is None


def test_buscar_itens_para_lista_route(client, app):
    with app.app_context():
        create_user('User', 'user_busca_itens@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
        restaurante = Restaurante.query.first()
        fornecedor = Fornecedor(nome='Fornecedor Busca', restaurante_id=restaurante.id)
        db.session.add(fornecedor)
        db.session.flush()
        item_fornecedor = Item(nome='Arroz', unidade_medida='kg', fornecedor_id=fornecedor.id)
        item_global = ListaMaeItem(nome='Arroz', unidade='kg', restaurante_id=restaurante.id)
        item_global_2 = ListaMaeItem(nome='Feijao', unidade='kg', restaurante_id=restaurante.id)
        db.session.add_all([item_fornecedor, item_global, item_global_2])
        db.session.commit()
        token = get_auth_token(client, 'user_busca_itens@example.com', 'senha')

    response = client.get(
        '/api/v1/itens/buscar',
        headers={'Authorization': f'Bearer {token}'}
    )

    assert response.status_code == 200
    data = response.get_json()
    itens = data['itens']
    assert any(item['origem'] == 'lista_global' for item in itens)
    fornecedor_item = next((item for item in itens if item['origem'] == 'fornecedor' and item['nome'] == 'Arroz'), None)
    assert fornecedor_item is not None
    assert fornecedor_item['ja_na_lista_global'] is True


def test_adicionar_item_na_lista_com_copia(app):
    with app.app_context():
        restaurante = Restaurante.query.first()
        fornecedor = Fornecedor(nome='Fornecedor Copia', restaurante_id=restaurante.id)
        db.session.add(fornecedor)
        db.session.flush()
        item_fornecedor = Item(nome='Cafe', unidade_medida='kg', fornecedor_id=fornecedor.id)
        lista = Lista(nome='Lista Copia', restaurante_id=restaurante.id)
        db.session.add_all([item_fornecedor, lista])
        db.session.commit()

        result, status = services.adicionar_item_na_lista_com_copia(
            lista.id,
            {
                'id': f'fornecedor_{item_fornecedor.id}',
                'quantidade_minima': 2
            },
            restaurante.id
        )

        assert status == 201
        item_global = ListaMaeItem.query.filter_by(restaurante_id=restaurante.id, nome='Cafe').first()
        assert item_global is not None
        ref = ListaItemRef.query.filter_by(lista_id=lista.id, item_id=item_global.id).first()
        assert ref is not None
        assert float(ref.quantidade_minima) == 2


def test_importar_itens_fornecedor_csv(app):
    with app.app_context():
        restaurante = Restaurante.query.first()
        fornecedor = Fornecedor(nome='Fornecedor CSV', restaurante_id=restaurante.id)
        db.session.add(fornecedor)
        db.session.commit()

        csv_content = """Codigo;Descricao;Unidade;;;;;;;;;;;;;;\n123;Cafe Torrado;KG;;;;;;;;;;;;;;\n124;Acucar Refinado;KG;;;;;;;;;;;;;;\n"""

        result, status = services.importar_itens_fornecedor_csv(
            fornecedor.id,
            csv_content,
            restaurante.id
        )

        assert status == 200
        assert result['itens_criados'] == 2
        item = Item.query.filter_by(nome='Cafe Torrado').first()
        assert item is not None
        codigo = FornecedorItemCodigo.query.filter_by(
            fornecedor_id=fornecedor.id,
            item_id=item.id
        ).first()
        assert codigo is not None
        assert codigo.codigo == '123'


def test_importar_itens_fornecedor_texto_route(client, app):
    with app.app_context():
        create_user('Admin', 'admin_texto_item@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
        restaurante = Restaurante.query.first()
        fornecedor = Fornecedor(nome='Fornecedor Texto', restaurante_id=restaurante.id)
        db.session.add(fornecedor)
        db.session.commit()
        fornecedor_id = fornecedor.id
        token = get_auth_token(client, 'admin_texto_item@example.com', 'senha')

    response = client.post(
        f'/api/v1/fornecedores/{fornecedor_id}/itens/import-text',
        data=json.dumps({
            'texto': 'Produto\nITEM A\nITEM B\n'
        }),
        headers={'Authorization': f'Bearer {token}'},
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data['itens_criados'] == 2
