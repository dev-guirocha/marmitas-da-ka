-----

# Marmitas da Ka - E-commerce com Firebase

[](https://marmitasdaka.com.br)

Este é um projeto *full-stack* completo de e-commerce para um negócio de marmitas saudáveis, construído do zero utilizando **Vanilla JavaScript** e **Firebase** como backend.

O sistema é dividido em três áreas principais:

1.  **Página Pública (Landing Page):** Apresenta o negócio, os pacotes e captura leads.
2.  **Área do Cliente (Dashboard):** Portal onde clientes gerenciam seus pacotes, montam seus cardápios e finalizam pedidos.
3.  **Painel Administrativo (Admin):** Uma área protegida para a gestão de pedidos e do cardápio.

## ✨ Funcionalidades Principais

O projeto vai muito além de um site estático, incluindo um sistema de gestão completo:

### 1\. Área Pública (Landing Page)

  * Apresentação dos pacotes de marmitas (Semanal, Quinzenal, Mensal).
  * Seção "Sobre" com a história da fundadora.
  * Formulário de contato que gera um link direto para o WhatsApp, facilitando a comunicação.

### 2\. Área do Cliente (Login & Dashboard)

  * **Autenticação Completa:** Sistema de Login, Cadastro e Recuperação de Senha usando **Firebase Authentication**.
  * **Gestão de Perfil:** Novos usuários têm seus dados (nome, email, telefone) salvos em uma coleção `/users` no **Firestore**.
  * **Seleção de Pacotes:** O cliente escolhe um pacote (ex: 10 marmitas) que lhe concede "créditos".
  * **Montagem de Cardápio:** O cliente gasta seus créditos selecionando pratos de um cardápio dinâmico carregado do Firestore.
  * **Carrinho Persistente:** O carrinho e os créditos são salvos no `localStorage` para que o cliente possa montar seu pedido em várias sessões.
  * **Histórico de Pedidos:** Uma página (`meus-pedidos.html`) que exibe os pedidos anteriores do cliente.

### 3\. Checkout

  * **Formulário Multi-etapa:** Uma interface que separa a revisão do carrinho e o preenchimento dos dados de entrega.
  * **Consulta de CEP:** Integração com a API **ViaCEP** para preencher automaticamente os campos de endereço.
  * **Seleção de Pagamento:** Opções de PIX ou Dinheiro.
  * **Finalização:** O pedido é salvo na coleção `/orders` do Firestore e uma mensagem de confirmação é gerada para o WhatsApp do cliente.

### 4\. Painel Administrativo (`/admin`)

  * **Rota Protegida:** Acesso restrito apenas a e-mails de administradores cadastrados.
  * **Dashboard de Pedidos:** Visualização de todos os pedidos recebidos, ordenados por data.
  * **Gestão de Status:** O admin pode atualizar o status de um pedido (ex: `Pendente` -\> `Em Preparo` -\> `Entregue`) e o status do pagamento (ex: `Pendente` -\> `Pago`).
  * **Gestão de Cardápio (CRUD):**
      * **Criar:** Adicionar novos pratos ao menu, incluindo nome, descrição e **upload de imagem** para o **Firebase Storage**.
      * **Ler:** Visualizar todos os itens do cardápio.
      * **Atualizar:** Ativar ou desativar itens do menu.
      * **Deletar:** Remover itens do cardápio.

## 🛠️ Tecnologias Utilizadas

  * **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+).
  * **Backend (BaaS):** **Firebase**
      * **Firebase Authentication:** Para login, cadastro e gestão de usuários.
      * **Firestore (Database):** Para armazenar usuários, pedidos e itens do cardápio.
      * **Firebase Storage:** Para hospedagem das fotos dos pratos.
  * **APIs:** ViaCEP (para consulta de endereço).
  * **Hospedagem:** Firebase Hosting (inferido pelo `firebase.json` e `CNAME`).

## 🖼️ Imagens do Projeto

| Página de Login | Dashboard do Cliente | Painel do Admin |
| :---: | :---: | :---: |
|  |  |  |

## 🚀 Como Executar Localmente

1.  Clone o repositório:
    ```bash
    git clone https://github.com/dev-guirocha/marmitas-da-ka.git
    ```
2.  Crie um arquivo `firebase-config.js` na raiz do projeto (use `firebase-config.example.js` como modelo) e adicione suas chaves do Firebase.
3.  Inicie um servidor local na raiz do projeto. Se você usa VS Code, pode usar a extensão **Live Server**.
4.  Abra o `index.html` no seu navegador.
