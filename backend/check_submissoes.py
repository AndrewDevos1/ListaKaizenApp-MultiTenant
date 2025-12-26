"""Script para verificar submissões e pedidos no banco."""
from kaizen_app import create_app
from kaizen_app.models import Submissao, Pedido, ListaMaeItem
from kaizen_app.extensions import db

app = create_app()

with app.app_context():
    print("\n=== SUBMISSÕES NO BANCO ===\n")
    submissoes = Submissao.query.order_by(Submissao.data_submissao.desc()).all()
    
    if not submissoes:
        print("❌ Nenhuma submissão encontrada no banco.\n")
    else:
        for sub in submissoes:
            print(f"📋 Submissão #{sub.id}")
            print(f"   Lista: {sub.lista.nome if sub.lista else 'N/A'}")
            print(f"   Usuário: {sub.usuario.nome if sub.usuario else 'N/A'}")
            print(f"   Data: {sub.data_submissao.strftime('%d/%m/%Y %H:%M')}")
            print(f"   Status: {sub.status.value}")
            print(f"   Total Pedidos: {sub.total_pedidos}")
            print(f"\n   📦 PEDIDOS:")
            for p in sub.pedidos:
                item = p.item
                print(f"      • {item.nome if item else 'N/A'}: {float(p.quantidade_solicitada)} {item.unidade if item else ''} - {p.status.value}")
            print()
    
    print("\n=== PEDIDOS SEM SUBMISSÃO ===\n")
    pedidos_soltos = Pedido.query.filter(Pedido.submissao_id.is_(None)).all()
    if pedidos_soltos:
        print(f"⚠️  {len(pedidos_soltos)} pedidos sem submissão (criados antes da atualização)")
    else:
        print("✅ Todos os pedidos estão vinculados a submissões")
    print()
