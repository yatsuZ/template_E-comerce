# Recap Serveur E-Commerce

## Vue d'ensemble

Serveur backend **Fastify** (v5) en **TypeScript** avec base de donnees **SQLite** (better-sqlite3).
Architecture en couches : `Interfaces -> Repositories -> Services -> Routes API`.
Gestion d'erreur centralisee via le pattern `Result<T>` (Success | Failure).

**Stack** : Fastify, TypeScript, SQLite (better-sqlite3), JWT, bcrypt, Zod, EJS, Docker.

---

## Arborescence

```
code/srcs/backend/
├── main.ts                          # Entry point
├── config/
│   ├── db.ts                        # DatabaseManager (SQLite)
│   ├── fastify.ts                   # Build Fastify + plugins + decorators
│   └── jwt.ts                       # Generation / verification JWT
├── core/
│   ├── db/
│   │   └── schema.sql               # Schema SQL complet
│   ├── interfaces/
│   │   ├── user.interfaces.ts        # I_User
│   │   ├── product.interfaces.ts     # I_Product
│   │   ├── cart.interfaces.ts        # I_Cart
│   │   ├── order.interfaces.ts       # I_Order, OrderStatus
│   │   └── order_items.interfaces.ts # I_OrderItems
│   ├── repositories/
│   │   ├── base.repository.ts        # BaseRepository<T> generique (CRUD)
│   │   ├── user.repository.ts
│   │   ├── product.repository.ts
│   │   ├── cart.repository.ts
│   │   ├── order.repository.ts
│   │   └── order_items.repository.ts
│   ├── services/
│   │   ├── auth.service.ts           # Register, Login, Refresh
│   │   ├── user.service.ts
│   │   ├── products.service.ts
│   │   ├── cart.service.ts
│   │   ├── order.service.ts          # Checkout complet
│   │   └── order_items.service.ts
│   └── schema/                       # Schemas Zod (validation input/output)
│       ├── auth.schema.ts
│       ├── user.schema.ts
│       ├── product.schema.ts
│       ├── cart.schema.ts
│       └── order.schema.ts
├── middlewares/
│   └── auth.middleware.ts            # authMiddleware + adminMiddleware
├── routes/
│   ├── index.ts                      # Registre toutes les routes
│   └── api/
│       ├── health.ts                 # GET /api/health
│       ├── env.ts                    # GET /api/env
│       ├── auth.ts                   # /api/auth/*
│       ├── users.ts                  # /api/users/*
│       ├── products.ts               # /api/products/*
│       ├── cart.ts                   # /api/cart/*
│       └── orders.ts                # /api/orders/*
└── utils/
    ├── Error/ErrorManagement.ts      # Result<T>, Success, Failure, ErrorType
    ├── logger.ts                     # Logger custom (chalk) + showLog
    ├── message.ts                    # Messages de demarrage serveur
    └── shutdown.ts                   # Graceful shutdown
```

---

## 1. Entry Point (`main.ts`)

- Charge `.env` via dotenv
- Instancie `DatabaseManager` (SQLite)
- Cree les **repositories** (injectes avec la connexion DB)
- Cree les **services** (injectes avec les repos + autres services)
- Appelle `buildFastify(services)` pour configurer Fastify
- Ecoute sur `0.0.0.0:PORT`
- Gere les signaux `SIGINT`, `SIGTERM`, `uncaughtException`, `unhandledRejection` via `shutdown()`

---

## 2. Config

### `config/db.ts` - DatabaseManager

- Utilise **better-sqlite3** (SQLite synchrone)
- Cree le dossier `data/` si inexistant
- Execute `schema.sql` au demarrage (`initSchema`)
- Supporte un dossier `migrations/` optionnel (fichiers `.sql` appliques dans l'ordre)
- Methodes : `getConnection()`, `close()`

### `config/fastify.ts` - buildFastify

- Plugins enregistres : `@fastify/cookie`, `@fastify/view` (EJS), `@fastify/static` (CSS + JS)
- **Decore** l'instance Fastify avec tous les services (`authService`, `userService`, `productService`, `cartService`, `orderService`, `orderItemService`)
- Appelle `setupRoutes(fastify)`

### `config/jwt.ts` - JWT

Types de tokens :

| Token         | Payload                          | Expiration | Secret env            |
|---------------|----------------------------------|------------|-----------------------|
| Access Token  | `userId`, `email`, `is_admin`    | 15 min     | `JWT_TOKEN`           |
| Refresh Token | `userId`                         | 7 jours    | `JWT_TOKEN_REFRESH`   |

Fonctions : `generateAccessToken`, `generateRefreshToken`, `verifyAccessToken`, `verifyRefreshToken`
Toutes retournent `Result<T>`.

---

## 3. Interfaces

### I_User
| Champ       | Type                    | Notes                     |
|-------------|-------------------------|---------------------------|
| id          | number                  | PK auto-increment         |
| email       | string                  | UNIQUE                    |
| password    | string                  | Hash bcrypt               |
| google_id   | string \| null          | UNIQUE                    |
| provider    | 'local' \| 'google'    |                           |
| is_admin    | number                  | 0 = user, 1 = admin      |
| refresh_token | string \| null        | NULL = deconnecte, hash SHA-256 = connecte |
| created_at  | string                  |                           |
| updated_at  | string                  |                           |

### I_Product
| Champ       | Type           | Notes                          |
|-------------|----------------|--------------------------------|
| id          | number         | PK                             |
| name        | string         | UNIQUE                         |
| description | string \| null |                                |
| price       | number         | En **centimes** (entier)       |
| image       | string \| null | URL vers image                 |
| stock       | number         | >= 0                           |
| created_at  | string         |                                |
| updated_at  | string         |                                |

### I_Cart
| Champ       | Type   | Notes                                |
|-------------|--------|--------------------------------------|
| id          | number | PK                                   |
| user_id     | number | FK -> users(id) ON DELETE CASCADE    |
| product_id  | number | FK -> products(id)                   |
| quantity    | number | > 0                                  |
| created_at  | string |                                      |
| updated_at  | string |                                      |

Contrainte : `UNIQUE(user_id, product_id)`

### I_Order
| Champ             | Type           | Notes                              |
|-------------------|----------------|-------------------------------------|
| id                | number         | PK                                  |
| user_id           | number         | FK -> users(id)                     |
| total             | number         | Prix total en centimes              |
| status            | OrderStatus    | pending/paid/failed/cancelled/refunded/shipped/delivered |
| stripe_payment_id | string \| null | Pour paiement Stripe (futur)        |
| created_at        | string         |                                     |
| updated_at        | string         |                                     |

### I_OrderItems
| Champ       | Type   | Notes                              |
|-------------|--------|------------------------------------|
| id          | number | PK                                 |
| order_id    | number | FK -> orders(id) ON DELETE CASCADE |
| product_id  | number | FK -> products(id)                 |
| quantity    | number | > 0                                |
| price       | number | Prix unitaire au moment de l'achat |
| created_at  | string |                                    |
| updated_at  | string |                                    |

---

## 4. Schema SQL (`schema.sql`)

5 tables avec `PRAGMA foreign_keys = ON` :

```
users         (id, email, password, google_id, provider, is_admin, refresh_token, created_at, updated_at)
products      (id, name, description, price, image, stock, created_at, updated_at)
cart_items    (id, user_id, product_id, quantity, created_at, updated_at)
orders        (id, user_id, total, status, stripe_payment_id, created_at, updated_at)
order_items   (id, order_id, product_id, quantity, price, created_at, updated_at)
```

Relations :
- `cart_items.user_id` -> `users.id` (CASCADE)
- `cart_items.product_id` -> `products.id`
- `orders.user_id` -> `users.id`
- `order_items.order_id` -> `orders.id` (CASCADE)
- `order_items.product_id` -> `products.id`

---

## 5. Repositories

### BaseRepository<T, TCreate, TUpdate> (generique)

Fournit le CRUD de base pour toutes les entites :

| Methode                  | Description                                |
|--------------------------|--------------------------------------------|
| `create(data)`           | INSERT + retourne l'objet cree             |
| `findById(id)`           | SELECT par id                              |
| `findBy(column, value)`  | SELECT par colonne arbitraire              |
| `findAll()`              | SELECT tous                                |
| `update(id, data)`       | UPDATE partiel + updated_at auto           |
| `delete(id)`             | DELETE par id                              |

Toutes retournent `Result<T>`. Gere les erreurs `UNIQUE constraint` -> `CONFLICT`.

### Repositories specifiques

| Repository              | Table        | Methodes supplementaires                          |
|-------------------------|--------------|---------------------------------------------------|
| `UserRepository`        | users        | `findOneByEmail(email)`, `saveRefreshToken(userId, token)`, `clearRefreshToken(userId)` |
| `ProductRepository`     | products     | `findOneByName(name)`                             |
| `CartRepository`        | cart_items   | `findByUserId`, `findByProductId`, `findOneByUserAndProduct` |
| `OrderRepository`       | orders       | `findByUserId`                                    |
| `OrderItemsRepository`  | order_items  | `findByProductId`, `update()` -> throw (immutable)|

---

## 6. Services

### AuthService
Depend de : `UserService`

| Methode                          | Description                                                    |
|----------------------------------|----------------------------------------------------------------|
| `register(email, password)`      | Verifie doublon email, cree user, genere tokens, **sauvegarde SHA-256(refresh_token) en BDD** |
| `login(email, password)`         | Verifie email/password (bcrypt), genere tokens, **sauvegarde SHA-256(refresh_token) en BDD**  |
| `refresh(refreshToken)`          | Verifie refresh token + **compare SHA-256 avec la BDD**, genere nouveau access token |
| `logout(userId)`                 | **Supprime le refresh_token de la BDD** (met a NULL)           |

### UserService
Depend de : `UserRepository`

| Methode                                     | Description                                    |
|---------------------------------------------|------------------------------------------------|
| `createUser(email, password, googleId?)`    | Valide email/password, hash bcrypt (12 rounds) |
| `createAdmin(email, password, googleId?)`   | Idem mais `is_admin = 1`                       |
| `getUserById(id)`                           | Lecture par id                                 |
| `getUserByEmail(email)`                     | Lecture par email (retourne null si absent)     |
| `getAll()`                                  | Liste tous les users                           |
| `emailExists(email)`                        | Retourne boolean                               |
| `updatePassword(userId, newPassword)`       | Valide + hash + update                         |
| `updateEmail(userId, newEmail)`             | Valide + update                                |
| `verifyPassword(userId, plainPassword)`     | Compare bcrypt                                 |
| `canDeleteUser(currentUser, targetId)`      | Admin = tout, user = soi-meme                  |
| `deleteUserById(userId)`                    | Suppression directe                            |
| `deleteUserWithAuth(current, targetId, pw?)`| Suppression avec verifications completes       |
| `saveRefreshToken(userId, token)` | Sauvegarde le refresh token en BDD (user connecte)             |
| `clearRefreshToken(userId)`       | Supprime le refresh token de la BDD (user deconnecte)          |

Validations : email regex, password min 6 caracteres.

### ProductService
Depend de : `ProductRepository`

| Methode                        | Description                                    |
|--------------------------------|------------------------------------------------|
| `createProduct(data)`          | Valide prix/stock/image URL, cree              |
| `getById(id)` / `getByName(name)` / `getAll()` | Lectures                        |
| `updateProduct(id, data)`      | Update partiel avec validations                |
| `updateStock(id, stock)`       | Raccourci update stock                         |
| `updatePrice(id, price)`       | Raccourci update price                         |
| `deleteProduct(id)`            | Suppression                                    |
| `hasEnoughStock(productId, qty)` | Verifie stock >= qty                         |
| `decrementStock(productId, qty)` | Decremente stock (apres achat)               |
| `incrementStock(productId, qty)` | Incremente stock (apres annulation)           |

### CartService
Depend de : `CartRepository`, `ProductService`, `UserService`

| Methode                              | Description                                         |
|--------------------------------------|-----------------------------------------------------|
| `addToCart(userId, productId, qty)`   | Ajoute ou incremente quantite si deja present       |
| `getCartByUserId(userId)`            | Liste items du panier                               |
| `getCartItem(cartId)`                | Detail d'un item                                    |
| `updateQuantity(cartId, newQty)`     | Remplace la quantite (avec verif stock)             |
| `removeFromCart(cartId)`             | Supprime un item                                    |
| `clearCart(userId)`                  | Vide tout le panier                                 |

### OrderService
Depend de : `OrderRepository`, `OrderItemService`, `CartService`, `ProductService`, `UserService`

| Methode                                   | Description                                          |
|-------------------------------------------|------------------------------------------------------|
| `createOrder(userId, total)`              | Cree une commande simple                             |
| `checkout(userId)`                        | **Flow complet** : panier -> commande (voir detail)  |
| `getOrderById(id)` / `getOrdersByUserId(uid)` / `getAllOrders()` | Lectures                     |
| `updateStatus(orderId, status)`           | Change le status                                     |
| `updateStripePaymentId(orderId, stripeId)`| Lie un paiement Stripe                               |
| `cancelOrder(orderId)`                    | Annule (si pending) + restitue le stock              |
| `deleteOrder(orderId)`                    | Suppression                                          |

**Flow checkout** :
1. Recupere les items du panier
2. Verifie le stock pour chaque produit
3. Calcule le total (prix * quantite)
4. Cree la commande (`orders`)
5. Cree les `order_items`
6. Decremente le stock de chaque produit
7. Vide le panier

### OrderItemService
Depend de : `OrderItemsRepository`

| Methode                    | Description               |
|----------------------------|---------------------------|
| `createItem(data)`         | Cree avec validation      |
| `getById(id)`              | Lecture par id            |
| `getByOrderId(orderId)`    | Items d'une commande      |
| `getByProductId(productId)`| Items par produit          |
| `deleteItem(id)`           | Suppression               |

Les order_items sont **immutables** (pas d'update possible).

---

## 7. Schemas Zod (validation)

### auth.schema.ts
| Schema              | Champs                                |
|---------------------|---------------------------------------|
| `registerSchema`    | email (email), password (min 6)       |
| `loginSchema`       | email (email), password (min 6)       |

### user.schema.ts
| Schema                | Champs                                          |
|-----------------------|-------------------------------------------------|
| `createUserSchema`    | email, password (min 6), googleId? (optional)   |
| `updateEmailSchema`   | email                                           |
| `updatePasswordSchema`| currentPassword (min 1), newPassword (min 6)    |
| `deleteAccountSchema` | password (min 1)                                |

### product.schema.ts
| Schema                | Champs                                              |
|-----------------------|-----------------------------------------------------|
| `createProductSchema` | name (min 1), description?, price (int >= 0), image?, stock (int >= 0) |
| `updateProductSchema` | description?, price?, image?, stock? (tous optionnels) |

### cart.schema.ts
| Schema            | Champs                                   |
|-------------------|------------------------------------------|
| `addToCartSchema` | product_id (int > 0), quantity (int > 0) |
| `updateCartSchema`| quantity (int > 0)                       |

### order.schema.ts
| Schema                    | Champs                                                  |
|---------------------------|---------------------------------------------------------|
| `updateOrderStatusSchema` | status (enum: pending/paid/failed/cancelled/refunded/shipped/delivered) |

---

## 8. Middlewares

### `auth.middleware.ts`

**authMiddleware** :
- Lit le header `Authorization: Bearer <token>`
- Verifie le token via `verifyAccessToken`
- Injecte `request.user = { userId, email, is_admin }` si valide
- Retourne `401` si absent/invalide/expire

**adminMiddleware** :
- Doit etre utilise **apres** authMiddleware
- Verifie `request.user.is_admin === 1`
- Retourne `403` si non-admin

---

## 9. Routes API

### `GET /` - Page principale (EJS)

### `/api/health` (public)
| Methode | Route         | Description       |
|---------|---------------|-------------------|
| GET     | `/api/health` | Status + uptime   |

### `/api/env` (public)
| Methode | Route      | Description                     |
|---------|------------|---------------------------------|
| GET     | `/api/env` | Affiche NODE_ENV, PORT, TEST    |

### `/api/auth` (public)
| Methode | Route               | Body                    | Description                                    |
|---------|---------------------|-------------------------|------------------------------------------------|
| POST    | `/api/auth/register` | `{email, password}`     | Inscription, retourne accessToken + cookie refresh |
| POST    | `/api/auth/login`    | `{email, password}`     | Connexion, retourne accessToken + cookie refresh   |
| POST    | `/api/auth/refresh`  | -                       | Lit cookie refresh_token, retourne nouveau accessToken |
| POST    | `/api/auth/logout`   | -                       | **Auth requis**. Supprime le cookie + efface refresh_token en BDD |

Cookie refresh : `httpOnly`, `secure` (prod), `sameSite: strict`, `path: /api/auth`, `maxAge: 7j`

### `/api/users` (auth requis)
| Methode | Route                  | Auth           | Body                              | Description              |
|---------|------------------------|----------------|-----------------------------------|--------------------------|
| GET     | `/api/users/me`        | auth           | -                                 | Mon profil (sans password)|
| PUT     | `/api/users/me/email`  | auth           | `{email}`                         | Modifier mon email       |
| PUT     | `/api/users/me/password`| auth          | `{currentPassword, newPassword}`  | Modifier mon password    |
| DELETE  | `/api/users/me`        | auth           | `{password}`                      | Supprimer mon compte     |
| GET     | `/api/users`           | auth + admin   | -                                 | Lister tous les users    |
| GET     | `/api/users/:id`       | auth + admin   | -                                 | Voir un user             |
| DELETE  | `/api/users/:id`       | auth + admin   | -                                 | Supprimer un user        |

### `/api/products` (lecture publique, ecriture admin)
| Methode | Route                | Auth           | Body                                        | Description        |
|---------|----------------------|----------------|---------------------------------------------|--------------------|
| GET     | `/api/products`      | -              | -                                           | Lister produits    |
| GET     | `/api/products/:id`  | -              | -                                           | Detail produit     |
| POST    | `/api/products`      | auth + admin   | `{name, description?, price, image?, stock}`| Creer produit      |
| PUT     | `/api/products/:id`  | auth + admin   | `{description?, price?, image?, stock?}`    | Modifier produit   |
| DELETE  | `/api/products/:id`  | auth + admin   | -                                           | Supprimer produit  |

### `/api/cart` (auth requis, toutes les routes)
| Methode | Route           | Body                       | Description                   |
|---------|-----------------|----------------------------|-------------------------------|
| GET     | `/api/cart`      | -                          | Mon panier                    |
| POST    | `/api/cart`      | `{product_id, quantity}`   | Ajouter au panier             |
| PUT     | `/api/cart/:id`  | `{quantity}`               | Modifier quantite (ownership verifie) |
| DELETE  | `/api/cart/:id`  | -                          | Retirer un item (ownership verifie)   |
| DELETE  | `/api/cart`      | -                          | Vider le panier               |

### `/api/orders` (auth requis, toutes les routes)
| Methode | Route                         | Auth          | Body         | Description                    |
|---------|-------------------------------|---------------|--------------|--------------------------------|
| POST    | `/api/orders/checkout`        | auth          | -            | Checkout : panier -> commande  |
| GET     | `/api/orders`                 | auth          | -            | Mes commandes                  |
| GET     | `/api/orders/:id`             | auth          | -            | Detail commande + items        |
| PATCH   | `/api/orders/:id/cancel`      | auth          | -            | Annuler (si pending)           |
| GET     | `/api/orders/admin/all`       | auth + admin  | -            | Toutes les commandes           |
| PATCH   | `/api/orders/admin/:id/status`| auth + admin  | `{status}`   | Changer le status              |

### 404 Handler
- Routes `/api/*` -> JSON `{ success: false, error: "API endpoint not found" }`
- Autres routes -> renvoie la page `index.ejs`

---

## 10. Gestion d'erreur (`Result<T>`)

Pattern fonctionnel :

```typescript
type Result<T> = Success<T> | Failure

type Success<T> = { ok: true, data: T }
type Failure    = { ok: false, error: AppError }

interface AppError {
  type: ErrorType;    // NOT_FOUND | VALIDATION | INVALID_ARG | CONFLICT | DATABASE | UNAUTHORIZED | FORBIDDEN | INTERNAL | UNKNOWN
  message: string;
  cause?: unknown;
}
```

Helpers : `success(data)`, `failure(type, message, cause?)`

Utilise dans **tous** les repos, services, et config JWT. Pas d'exceptions, tout passe par `Result`.

---

## 11. Utils

| Fichier          | Description                                                     |
|------------------|-----------------------------------------------------------------|
| `logger.ts`      | Logger custom avec chalk (debug/info/success/warn/error), filtre par NODE_ENV |
| `message.ts`     | Messages ASCII de demarrage (`SERVER STARTING...`, `SERVER READY`) |
| `shutdown.ts`    | Graceful shutdown : ferme Fastify + ferme DB, exit 0 ou 1       |

---

## 12. Environnement (.env)

| Variable           | Description                        |
|--------------------|------------------------------------|
| `PORT`             | Port du serveur (defaut: 3000)     |
| `NODE_ENV`         | development / production / test    |
| `TEST`             | Variable libre pour debug          |
| `FILE_NAME_DB`     | Nom du fichier SQLite (sans .db)   |
| `JWT_TOKEN`        | Secret pour access token           |
| `JWT_TOKEN_REFRESH`| Secret pour refresh token          |
| `ADMIN_EMAIL`      | Email de l'admin (seed au demarrage) |
| `ADMIN_PASSWORD`   | Mot de passe admin (seed au demarrage) |
| `CORS_ORIGIN`      | Origine autorisee CORS (defaut: http://localhost:3010) |

---

## 13. Securite

### Corrige
- Helmet (headers securite HTTP)
- CORS (origine stricte)
- Rate limiting (100 req/min global)
- JWT algorithm HS256 explicite (sign + verify)
- Refresh token hashe SHA-256 en BDD
- `sanitizeUser` exclut password + refresh_token des reponses
- Checkout en transaction SQLite (atomique)
- `*.db` dans `.gitignore`
- Admin seed via `.env` (pas de route publique)

### A corriger (TODO)
- Rate limit specifique sur `/api/auth/login` (plus strict, ex: 5/min)
- Refresh token rotation (nouveau token a chaque refresh)
- `.max()` sur les string Zod (limiter taille input)
- Erreurs internes : ne pas exposer les chemins fichiers au client
- Enumeration email via register (409 vs 201)
- Pagination sur les endpoints liste
- Audit log (login, actions admin)

---

## 14. Docker

- **docker-compose.yml** : 1 service `app` (Node.js)
- Build via `Docker/node/Dockerfile`
- Volume : `./code` monte sur `/app`
- Commande : `npm install && npm run redev`
- Healthcheck sur `/api/health`
- Network bridge isole

---

## 14. Dependances principales

| Package            | Role                        |
|--------------------|-----------------------------|
| fastify (v5)       | Framework HTTP              |
| better-sqlite3     | Base de donnees SQLite      |
| bcrypt             | Hash des mots de passe      |
| jsonwebtoken       | Tokens JWT                  |
| zod (v4)           | Validation des schemas      |
| @fastify/cookie    | Gestion des cookies         |
| @fastify/cors      | Securite CORS               |
| @fastify/rate-limit| Rate limiting (anti brute-force) |
| @fastify/helmet    | Headers de securite HTTP    |
| @fastify/static    | Fichiers statiques (CSS/JS) |
| @fastify/view + ejs| Templates HTML              |
| chalk              | Logs colores                |
| dotenv             | Variables d'environnement   |
| vitest             | Tests (runner)              |

---

## 15. Diagramme de dependances des services

```
AuthService
  └── UserService
        └── UserRepository

ProductService
  └── ProductRepository

CartService
  ├── CartRepository
  ├── ProductService
  └── UserService

OrderItemService
  └── OrderItemsRepository

OrderService
  ├── OrderRepository
  ├── OrderItemService
  ├── CartService
  ├── ProductService
  └── UserService
```
