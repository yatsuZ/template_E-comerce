# Tester les API - Guide pratique

## Quel outil utiliser ?

| Outil        | Type     | Avantages                                    | Inconvenients                    |
|--------------|----------|----------------------------------------------|----------------------------------|
| **curl**     | Terminal | Zero install, scriptable, copier-coller      | Pas d'UI, syntaxe verbeuse       |
| **Bruno**    | App      | Gratuit, open-source, offline, collections   | A installer                      |
| **Insomnia** | App      | UI clean, collections, variables env         | Compte requis maintenant         |
| **Postman**  | App      | Populaire, beaucoup de features              | Lourd, force le cloud, freemium  |

**Recommandation** : `curl` pour tester vite + **Bruno** si tu veux une UI.

---

## Setup

```bash
# Variable de base (a adapter)
BASE=http://localhost:3000/api
```

---

## 1. Health & Env

```bash
# Health check
curl $BASE/health

# Variables d'environnement
curl $BASE/env
```

---

## 2. Auth

### Register (inscription)

```bash
curl -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "123456"}' \
  -c cookies.txt
```

> `-c cookies.txt` sauvegarde le cookie `refresh_token` automatiquement.
> La reponse contient `accessToken` -> copie-le pour les requetes suivantes.

### Login

```bash
curl -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "123456"}' \
  -c cookies.txt
```

### Sauvegarder le token (pratique)

```bash
# Apres register ou login, copie le token dans une variable :
TOKEN="colle_ton_access_token_ici"

# Ou en une commande (necessite jq) :
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "123456"}' \
  -c cookies.txt | jq -r '.accessToken')

echo $TOKEN
```

### Refresh (renouveler le token)

```bash
curl -X POST $BASE/auth/refresh \
  -b cookies.txt
```

### Logout

```bash
curl -X POST $BASE/auth/logout \
  -b cookies.txt -c cookies.txt
```

---

## 3. Users

### Mon profil

```bash
curl $BASE/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### Modifier mon email

```bash
curl -X PUT $BASE/users/me/email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "nouveau@test.com"}'
```

### Modifier mon mot de passe

```bash
curl -X PUT $BASE/users/me/password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword": "123456", "newPassword": "654321"}'
```

### Supprimer mon compte

```bash
curl -X DELETE $BASE/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password": "123456"}'
```

### [ADMIN] Lister tous les users

```bash
curl $BASE/users \
  -H "Authorization: Bearer $TOKEN"
```

### [ADMIN] Voir un user

```bash
curl $BASE/users/1 \
  -H "Authorization: Bearer $TOKEN"
```

### [ADMIN] Supprimer un user

```bash
curl -X DELETE $BASE/users/2 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 4. Products

### Lister tous les produits (public)

```bash
curl $BASE/products
```

### Detail d'un produit (public)

```bash
curl $BASE/products/1
```

### [ADMIN] Creer un produit

```bash
curl -X POST $BASE/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "T-shirt bleu",
    "description": "T-shirt 100% coton",
    "price": 2999,
    "image": null,
    "stock": 50
  }'
```

> `price` en **centimes** : 2999 = 29.99 EUR

### [ADMIN] Modifier un produit

```bash
curl -X PUT $BASE/products/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price": 1999, "stock": 100}'
```

### [ADMIN] Supprimer un produit

```bash
curl -X DELETE $BASE/products/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. Cart (panier)

### Voir mon panier

```bash
curl $BASE/cart \
  -H "Authorization: Bearer $TOKEN"
```

### Ajouter un produit au panier

```bash
curl -X POST $BASE/cart \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 1, "quantity": 2}'
```

### Modifier la quantite

```bash
# Remplace :id par l'id du cart_item
curl -X PUT $BASE/cart/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 5}'
```

### Retirer un item du panier

```bash
curl -X DELETE $BASE/cart/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Vider tout le panier

```bash
curl -X DELETE $BASE/cart \
  -H "Authorization: Bearer $TOKEN"
```

---

## 6. Orders (commandes)

### Checkout (passer commande depuis le panier)

```bash
curl -X POST $BASE/orders/checkout \
  -H "Authorization: Bearer $TOKEN"
```

### Mes commandes

```bash
curl $BASE/orders \
  -H "Authorization: Bearer $TOKEN"
```

### Detail d'une commande (avec items)

```bash
curl $BASE/orders/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Annuler une commande (si pending)

```bash
curl -X PATCH $BASE/orders/1/cancel \
  -H "Authorization: Bearer $TOKEN"
```

### [ADMIN] Toutes les commandes

```bash
curl $BASE/orders/admin/all \
  -H "Authorization: Bearer $TOKEN"
```

### [ADMIN] Changer le status d'une commande

```bash
curl -X PATCH $BASE/orders/admin/1/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "paid"}'
```

Status possibles : `pending`, `paid`, `failed`, `cancelled`, `refunded`, `shipped`, `delivered`

---

## Scenario de test complet

Copie-colle ce bloc pour tester le flow entier :

```bash
BASE=http://localhost:3000/api

# 1. Inscription
echo "=== REGISTER ==="
curl -s -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@test.com", "password": "123456"}' \
  -c cookies.txt | jq .

# 2. Login + sauvegarder le token
echo "=== LOGIN ==="
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@test.com", "password": "123456"}' \
  -c cookies.txt | jq -r '.accessToken')
echo "Token: $TOKEN"

# 3. Mon profil
echo "=== MON PROFIL ==="
curl -s $BASE/users/me \
  -H "Authorization: Bearer $TOKEN" | jq .

# 4. Lister les produits
echo "=== PRODUITS ==="
curl -s $BASE/products | jq .

# 5. Ajouter au panier (produit id=1, quantite=2)
echo "=== AJOUTER AU PANIER ==="
curl -s -X POST $BASE/cart \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 1, "quantity": 2}' | jq .

# 6. Voir mon panier
echo "=== MON PANIER ==="
curl -s $BASE/cart \
  -H "Authorization: Bearer $TOKEN" | jq .

# 7. Checkout
echo "=== CHECKOUT ==="
curl -s -X POST $BASE/orders/checkout \
  -H "Authorization: Bearer $TOKEN" | jq .

# 8. Mes commandes
echo "=== MES COMMANDES ==="
curl -s $BASE/orders \
  -H "Authorization: Bearer $TOKEN" | jq .

# 9. Logout
echo "=== LOGOUT ==="
curl -s -X POST $BASE/auth/logout \
  -b cookies.txt -c cookies.txt | jq .
```

> Prerequis : `jq` installe (`sudo apt install jq` / `brew install jq`).
> Sans `jq`, retire `| jq .` de chaque commande.

---

## Codes de reponse

| Code | Signification              |
|------|----------------------------|
| 200  | OK                         |
| 201  | Cree avec succes           |
| 400  | Input invalide             |
| 401  | Non authentifie / token invalide |
| 403  | Interdit (pas admin / pas proprietaire) |
| 404  | Ressource non trouvee      |
| 409  | Conflit (doublon email, nom produit) |
| 500  | Erreur serveur             |
