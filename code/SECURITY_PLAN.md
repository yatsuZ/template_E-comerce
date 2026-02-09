# Plan de Securite - API E-commerce

## Etat actuel du projet

| Element                  | Status |
|--------------------------|--------|
| Hachage password (bcrypt)| FAIT   |
| Validation Zod (schema)  | FAIT (user uniquement) |
| Gestion erreurs (Result) | FAIT   |
| JWT / Auth               | A FAIRE |
| Middleware auth           | A FAIRE |
| Routes API               | A FAIRE |
| Rate limiting            | A FAIRE |
| CORS                     | A FAIRE |
| Helmet (headers)         | A FAIRE |

---

## 1. Authentification (JWT)

**But** : Identifier l'utilisateur a chaque requete sans redemander le mot de passe.

### Comment ca marche
```
1. User POST /api/auth/login → email + password
2. Serveur verifie → retourne un access_token (JWT) + refresh_token
3. User envoie le token dans chaque requete : Authorization: Bearer <token>
4. Serveur decode le token → sait qui est l'user
```

### Tokens
| Token         | Duree   | Contenu                        | Stockage cote client |
|---------------|---------|--------------------------------|----------------------|
| Access token  | 15 min  | { userId, email, is_admin }    | Memoire (variable JS) |
| Refresh token | 7 jours | { userId }                     | Cookie httpOnly      |

### Pourquoi 2 tokens ?
- L'access token est court → si vole, il expire vite
- Le refresh token est dans un cookie httpOnly → pas accessible par JavaScript (protege du XSS)
- Quand l'access token expire, le client appelle `/api/auth/refresh` pour en avoir un nouveau

### Package necessaire
- `@fastify/jwt` ou `jsonwebtoken` pour signer/verifier les tokens
- `@fastify/cookie` pour gerer les cookies (refresh token)

### Variables d'environnement a ajouter dans .env
```
JWT_SECRET=une_cle_secrete_longue_et_aleatoire
JWT_REFRESH_SECRET=une_autre_cle_secrete
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## 2. Middleware (gardes des routes)

### authMiddleware
- Verifie que le header `Authorization: Bearer <token>` est present
- Decode le JWT → ajoute `request.user = { id, email, is_admin }` a la requete
- Si token invalide ou expire → 401 Unauthorized

### adminMiddleware
- S'execute APRES authMiddleware
- Verifie que `request.user.is_admin === 1`
- Si non-admin → 403 Forbidden

### ownerMiddleware (optionnel)
- Verifie que l'user accede a SES propres ressources (son panier, ses commandes)
- Ou qu'il est admin (bypass)
- Si pas proprietaire → 403 Forbidden

---

## 3. Routes API et leurs protections

### Auth (publiques)
| Methode | Route                  | Protection | Description |
|---------|------------------------|------------|-------------|
| POST    | `/api/auth/register`   | Aucune     | Creer un compte |
| POST    | `/api/auth/login`      | Aucune     | Se connecter → retourne tokens |
| POST    | `/api/auth/refresh`    | Cookie     | Renouveler l'access token |
| POST    | `/api/auth/logout`     | Auth       | Supprimer le refresh token |

### Users
| Methode | Route              | Protection     | Description |
|---------|--------------------|----------------|-------------|
| GET     | `/api/users/me`    | Auth           | Mon profil |
| PUT     | `/api/users/me`    | Auth           | Modifier mon profil |
| DELETE  | `/api/users/me`    | Auth           | Supprimer mon compte |
| GET     | `/api/users`       | Auth + Admin   | Lister tous les users |
| GET     | `/api/users/:id`   | Auth + Admin   | Voir un user |
| DELETE  | `/api/users/:id`   | Auth + Admin   | Supprimer un user |

### Products
| Methode | Route               | Protection     | Description |
|---------|---------------------|----------------|-------------|
| GET     | `/api/products`     | Aucune         | Lister les produits (public) |
| GET     | `/api/products/:id` | Aucune         | Detail d'un produit (public) |
| POST    | `/api/products`     | Auth + Admin   | Creer un produit |
| PUT     | `/api/products/:id` | Auth + Admin   | Modifier un produit |
| DELETE  | `/api/products/:id` | Auth + Admin   | Supprimer un produit |

### Cart
| Methode | Route              | Protection | Description |
|---------|--------------------|------------|-------------|
| GET     | `/api/cart`        | Auth       | Voir mon panier |
| POST    | `/api/cart`        | Auth       | Ajouter un produit au panier |
| PUT     | `/api/cart/:id`    | Auth + Owner | Modifier la quantite |
| DELETE  | `/api/cart/:id`    | Auth + Owner | Retirer un item du panier |
| DELETE  | `/api/cart`        | Auth       | Vider mon panier |

### Orders
| Methode | Route                       | Protection     | Description |
|---------|-----------------------------|----------------|-------------|
| POST    | `/api/orders/checkout`      | Auth           | Passer commande (panier → order) |
| GET     | `/api/orders`               | Auth           | Mes commandes |
| GET     | `/api/orders/:id`           | Auth + Owner   | Detail d'une commande |
| PATCH   | `/api/orders/:id/cancel`    | Auth + Owner   | Annuler ma commande |
| GET     | `/api/admin/orders`         | Auth + Admin   | Toutes les commandes |
| PATCH   | `/api/admin/orders/:id`     | Auth + Admin   | Changer status (paid/shipped/delivered) |

---

## 4. Validation des inputs (Zod)

**But** : Verifier que le body de chaque requete est correct AVANT d'appeler le service.

### Schemas a creer
```
auth.schema.ts    → registerSchema, loginSchema
product.schema.ts → createProductSchema, updateProductSchema
cart.schema.ts    → addToCartSchema, updateCartSchema
order.schema.ts   → updateOrderStatusSchema
```

### Exemple
```typescript
// Si le body ne correspond pas au schema → 400 Bad Request automatiquement
const addToCartSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
});
```

Un schema Zod = une couche de validation AVANT le service.
Le service a aussi sa propre validation = double securite.

---

## 5. Rate Limiting

**But** : Empecher le brute force (ex: tester 10000 mots de passe).

### Package
`@fastify/rate-limit`

### Configuration
| Route              | Limite             | Pourquoi |
|--------------------|--------------------|----------|
| `/api/auth/login`  | 5 tentatives / min | Anti brute force password |
| `/api/auth/register` | 3 / min          | Anti spam de comptes |
| `/api/auth/refresh` | 10 / min          | Anti abus de refresh |
| Toutes les autres  | 100 / min          | Protection generale |

---

## 6. CORS (Cross-Origin Resource Sharing)

**But** : Controler quels domaines ont le droit d'appeler l'API.

### Package
`@fastify/cors`

### Configuration
```
- En dev  : origin: true (tout accepter)
- En prod : origin: 'https://tondomaine.com' (uniquement ton frontend)
```

Necessaire seulement si le frontend est sur un domaine different du backend.

---

## 7. Helmet (Headers HTTP de securite)

**But** : Ajouter des headers HTTP qui protegent contre des attaques courantes.

### Package
`@fastify/helmet`

### Ce que ca ajoute automatiquement
| Header                    | Protection contre |
|---------------------------|-------------------|
| X-Content-Type-Options    | MIME sniffing |
| X-Frame-Options           | Clickjacking (iframe) |
| X-XSS-Protection          | XSS (vieux navigateurs) |
| Strict-Transport-Security | Force HTTPS |
| Content-Security-Policy   | Injection de scripts |

---

## 8. Autres bonnes pratiques

### Deja en place
- [x] Passwords haches avec bcrypt (salt rounds = 12)
- [x] Erreurs typees (pas de stack trace expose au client)
- [x] Foreign keys ON (integrite BDD)
- [x] UNIQUE constraints en BDD

### A garder en tete
- [ ] Ne JAMAIS retourner le password dans les reponses API (exclure le champ)
- [ ] Logger les tentatives de login echouees
- [ ] Utiliser HTTPS en production
- [ ] Mettre le `JWT_SECRET` dans les variables d'environnement (jamais en dur dans le code)
- [ ] Valider les params d'URL (`:id` doit etre un entier positif)
- [ ] Pagination sur les routes GET qui retournent des listes (`?page=1&limit=20`)

---

## Ordre d'implementation suggere

```
1. JWT + Auth (register/login/refresh/logout)
2. Middleware (auth + admin + owner)
3. Schemas Zod pour tous les body
4. Routes Products (les plus simples, GET public)
5. Routes Users
6. Routes Cart
7. Routes Orders
8. Rate limiting
9. CORS + Helmet
```

Chaque etape peut etre testee independamment avant de passer a la suivante.
