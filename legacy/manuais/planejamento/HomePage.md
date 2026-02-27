# Proposta de Design - Página Inicial (Login e Cadastro)

**Data de Geração:** 20 de outubro de 2025, 10:30

## 1. Visão Geral e Filosofia de Design

O objetivo é criar uma porta de entrada para o sistema "Kaizen Lists" que seja limpa, profissional e, acima de tudo, intuitiva. A inspiração visual será o estilo clean do CoreUI, utilizando os componentes do `react-bootstrap` que já fazem parte do projeto.

O princípio fundamental do design será comunicar claramente o fluxo de acesso: o cadastro não concede acesso imediato, mas sim **inicia uma solicitação** que depende da aprovação de um administrador. A linguagem e o design das telas refletirão essa realidade para gerenciar as expectativas do novo usuário.

---

## 2. Proposta para a Tela de Login (`/login`)

A tela de login será o ponto de acesso principal para usuários já aprovados.

### Estrutura e Layout

*   **Layout de Duas Colunas (Desktop):**
    *   **Coluna Esquerda:** Conterá o formulário de login.
    *   **Coluna Direita:** Exibirá uma imagem de alta qualidade relacionada a organização, logística ou um ambiente de restaurante/cozinha moderno, junto com o logo do "Kaizen Lists" e uma frase de impacto, como "Otimizando seu inventário, um item de cada vez."
*   **Layout de Uma Coluna (Mobile):** A imagem será movida para o topo, acima do formulário de login, garantindo uma experiência fluida em telas menores.

### Componentes e Campos

*   **Título:** "Bem-vindo de volta!"
*   **Formulário (`<Form>` do React-Bootstrap):**
    *   **Campo Email:** (`<Form.Control>`) com um ícone de envelope (`<FontAwesomeIcon icon={faEnvelope} />`).
    *   **Campo Senha:** (`<Form.Control type="password">`) com um ícone de cadeado (`<FontAwesomeIcon icon={faLock} />`).
*   **Botão de Ação:**
    *   `<Button variant="primary" type="submit" className="w-100">Entrar</Button>`
*   **Links de Navegação:**
    *   Abaixo do botão, um link discreto: `"Não tem uma conta? Solicite seu acesso"`, que levará o usuário para a página de cadastro.

---

## 3. Proposta para a Tela de Solicitação de Acesso (`/register`)

Esta tela será cuidadosamente desenhada para deixar claro que se trata de um pedido de acesso, e não um cadastro com acesso instantâneo.

### Estrutura e Layout

*   O layout será similar ao da tela de login para manter a consistência visual, mas com foco total no formulário.

### Componentes e Campos

*   **Título:** "Solicite seu Acesso ao Kaizen Lists"
*   **Subtítulo:** "Preencha seus dados. Um administrador irá analisar sua solicitação e liberar seu acesso."
*   **Formulário (`<Form>` do React-Bootstrap):**
    *   **Campo Nome Completo:** (`<Form.Control>`)
    *   **Campo Email:** (`<Form.Control type="email">`)
    *   **Campo Senha:** (`<Form.Control type="password">`)
    *   **Campo Confirmar Senha:** (`<Form.Control type="password">`)
*   **Botão de Ação:**
    *   `<Button variant="primary" type="submit" className="w-100">Enviar Solicitação</Button>`
*   **Links de Navegação:**
    *   Link para voltar ao login: `"Já tem uma conta? Faça o login"`.

### Fluxo Pós-Submissão

Após o envio bem-sucedido do formulário, o usuário **não será redirecionado**. Em vez disso, o formulário será substituído por uma mensagem de sucesso clara e amigável, dentro de um componente `<Alert variant="success">`:

> #### **Solicitação Enviada!**
>
> Obrigado, **[Nome do Usuário]**!
>
> Sua solicitação de acesso foi enviada com sucesso. Um administrador responsável irá analisar seu cadastro em breve. Você será notificado por e-mail assim que seu acesso for aprovado.
>
> [Voltar para o Login]

Este fluxo é crucial para evitar frustração e comunicar de forma transparente como o sistema funciona.
