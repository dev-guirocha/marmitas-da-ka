# Firebase – Checklist de Segurança

> Revisão rápida para garantir que apenas o seu domínio consiga usar a infraestrutura do projeto.

## 1. Restringir a API Key
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/apis/credentials?project=marmitas-da-ka).
2. Abra a credencial Web (`AIzaSyBygW-…`).
3. Em **Restrições de aplicativo**, selecione **Sites da Web** e adicione:
   - `https://marmitasdaka.com.br/*`
   - `https://www.marmitasdaka.com.br/*`
   - `https://dev-guirocha.github.io/*` (apenas se precisar manter o preview do GitHub Pages)
   - `http://localhost:5500/*` e `http://127.0.0.1:5500/*` para desenvolvimento local.
4. Salve e aguarde alguns minutos para propagar.

## 2. Habilitar App Check
1. Firebase Console → App Check → selecione a aplicação Web.
2. Clique em **Registrar aplicativo** e gere uma chave do **reCAPTCHA v3**.
3. Copie a chave pública.
4. No ambiente de produção (ex.: `index.html`), antes de carregar `firebase-config.js`, defina:
   ```html
   <script>
     window.__APP_CHECK_PUBLIC_KEY__ = 'SUA_CHAVE_PUBLICA';
   </script>
   ```
5. Reforce a obrigatoriedade do App Check nas configurações do Firestore e Storage.

## 3. Atualizar regras do Firestore
Exemplo de regras de produção (ajuste conforme suas coleções):
```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() &&
             request.auth.token.email in [
               'karinekawai@hotmail.com',
               'guiccpa@gmail.com',
               'guntato@marmitasdaka.com.br'
             ];
    }

    match /users/{userId} {
      allow read, update: if isSignedIn() && request.auth.uid == userId;
      allow create: if true;
      allow delete: if false;
    }

    match /orders/{orderId} {
      allow create: if isSignedIn();
      allow read: if isSignedIn() && (
        isAdmin() || request.auth.uid == resource.data.customer.uid
      );
      allow update: if isAdmin();
      allow delete: if false;
    }

    match /menuItems/{itemId} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

## 4. Atualizar regras do Storage (exemplo)
```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /menu-items/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                    request.resource.contentType.matches('image/.*');
    }
  }
}
```

## 5. Validação em Produção
- Teste o site após aplicar cada ajuste (Chrome DevTools → aba Network → confirme respostas 200).
- Após ativar o App Check, se notar falhas em desenvolvimento, registre o domínio local ou use o modo debug.

Manter este checklist em dia reduz drasticamente os riscos de uso indevido da sua infraestrutura Firebase. Qualquer dúvida, volte neste documento antes de publicar novas mudanças.***
