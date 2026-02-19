#!/bin/bash

# ===========================================
#  Script de test API E-Commerce (complet)
# ===========================================

BASE="http://localhost:3010/api"
PASS=0
FAIL=0
ISSUES=""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- Helpers ---

check() {
  local name="$1"
  local expected="$2"
  local response="$3"

  if echo "$response" | grep -qF "$expected"; then
    echo -e "  ${GREEN}✓${NC} $name"
    ((PASS++))
  else
    echo -e "  ${RED}✗${NC} $name"
    echo -e "    ${RED}Attendu: $expected${NC}"
    echo -e "    ${RED}Recu: $response${NC}"
    ISSUES="$ISSUES\n  - $name"
    ((FAIL++))
  fi
}

check_not() {
  local name="$1"
  local not_expected="$2"
  local response="$3"

  if echo "$response" | grep -qF "$not_expected"; then
    echo -e "  ${RED}✗${NC} $name"
    echo -e "    ${RED}Ne doit PAS contenir: $not_expected${NC}"
    ISSUES="$ISSUES\n  - $name"
    ((FAIL++))
  else
    echo -e "  ${GREEN}✓${NC} $name"
    ((PASS++))
  fi
}

section() {
  echo ""
  echo -e "${CYAN}━━━ $1 ━━━${NC}"
}

get_token() {
  echo "$1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null
}

get_field() {
  echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('$2', d.get('$2','')))" 2>/dev/null
}

get_id() {
  echo "$1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null
}

# ===========================================
#  1. HEALTH
# ===========================================

section "1. HEALTH"

R=$(curl -s "$BASE/health")
check "GET /health" '"status":"ok"' "$R"

# ===========================================
#  2. AUTH - REGISTER
# ===========================================

section "2. AUTH - REGISTER"

# Register user normal
R=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@test.com", "password": "123456"}' \
  -c /tmp/test_cookies_user.txt)
check "POST /auth/register (user)" '"success":true' "$R"
USER_TOKEN=$(get_token "$R")

# Register doublon
R=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@test.com", "password": "123456"}')
check "POST /auth/register (doublon = 409)" '"success":false' "$R"

# Register input invalide
R=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "bad", "password": "12"}')
check "POST /auth/register (input invalide = 400)" '"success":false' "$R"

# Register champs manquants
R=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{}')
check "POST /auth/register (champs manquants = 400)" '"success":false' "$R"

# ===========================================
#  3. AUTH - LOGIN
# ===========================================

section "3. AUTH - LOGIN"

R=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@test.com", "password": "123456"}' \
  -c /tmp/test_cookies_user.txt)
check "POST /auth/login" '"success":true' "$R"
USER_TOKEN=$(get_token "$R")

# Mauvais mdp
R=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@test.com", "password": "wrong"}')
check "POST /auth/login (mauvais mdp = 401)" '"success":false' "$R"

# Email inexistant
R=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "ghost@test.com", "password": "123456"}')
check "POST /auth/login (email inexistant = 401)" '"success":false' "$R"

# ===========================================
#  4. AUTH - REFRESH / LOGOUT
# ===========================================

section "4. AUTH - REFRESH / LOGOUT"

R=$(curl -s -X POST "$BASE/auth/refresh" -b /tmp/test_cookies_user.txt)
check "POST /auth/refresh" '"success":true' "$R"

# Refresh sans cookie
R=$(curl -s -X POST "$BASE/auth/refresh")
check "POST /auth/refresh (sans cookie = 401)" '"success":false' "$R"

# Logout
R=$(curl -s -X POST "$BASE/auth/logout" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -b /tmp/test_cookies_user.txt)
check "POST /auth/logout" '"success":true' "$R"

# Refresh apres logout
R=$(curl -s -X POST "$BASE/auth/refresh" -b /tmp/test_cookies_user.txt)
check "POST /auth/refresh (apres logout = 401)" '"success":false' "$R"

# Re-login pour la suite
R=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@test.com", "password": "123456"}' \
  -c /tmp/test_cookies_user.txt)
USER_TOKEN=$(get_token "$R")

# Login admin (seed depuis .env)
R=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@ecommerce.com", "password": "admin123456"}' \
  -c /tmp/test_cookies_admin.txt)
check "POST /auth/login (admin)" '"success":true' "$R"
ADMIN_TOKEN=$(get_token "$R")

# ===========================================
#  5. USERS
# ===========================================

section "5. USERS"

# GET /me
R=$(curl -s "$BASE/users/me" -H "Authorization: Bearer $USER_TOKEN")
check "GET /users/me" '"email":"user@test.com"' "$R"

# Securite: /me ne doit PAS exposer password ni refresh_token
check_not "GET /users/me (pas de password)" '"password"' "$R"
check_not "GET /users/me (pas de refresh_token)" '"refresh_token"' "$R"

# GET /me sans auth
R=$(curl -s "$BASE/users/me")
check "GET /users/me (sans auth = 401)" '"success":false' "$R"

# PUT /me/email
R=$(curl -s -X PUT "$BASE/users/me/email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"email": "newuser@test.com"}')
check "PUT /users/me/email" '"success":true' "$R"

# Remettre l'email
curl -s -X PUT "$BASE/users/me/email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"email": "user@test.com"}' > /dev/null

# PUT /me/password
R=$(curl -s -X PUT "$BASE/users/me/password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"currentPassword": "123456", "newPassword": "654321"}')
check "PUT /users/me/password" '"success":true' "$R"

# Remettre le mdp
curl -s -X PUT "$BASE/users/me/password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"currentPassword": "654321", "newPassword": "123456"}' > /dev/null

# PUT /me/password mauvais current
R=$(curl -s -X PUT "$BASE/users/me/password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"currentPassword": "wrong", "newPassword": "654321"}')
check "PUT /users/me/password (mauvais current = 401)" '"success":false' "$R"

# Admin: GET /users
R=$(curl -s "$BASE/users" -H "Authorization: Bearer $ADMIN_TOKEN")
check "GET /users (admin)" '"success":true' "$R"
check_not "GET /users (admin, pas de password)" '"password"' "$R"

# User normal: GET /users
R=$(curl -s "$BASE/users" -H "Authorization: Bearer $USER_TOKEN")
check "GET /users (user normal = 403)" '"Admin access required"' "$R"

# Admin: GET /users/:id
R=$(curl -s "$BASE/users/1" -H "Authorization: Bearer $ADMIN_TOKEN")
check "GET /users/1 (admin)" '"success":true' "$R"
check_not "GET /users/1 (admin, pas de password)" '"password"' "$R"

# Admin: GET /users/:id inexistant
R=$(curl -s "$BASE/users/999" -H "Authorization: Bearer $ADMIN_TOKEN")
check "GET /users/999 (admin, inexistant = 404)" '"success":false' "$R"

# ===========================================
#  6. PRODUCTS - CRUD (admin)
# ===========================================

section "6. PRODUCTS"

# GET /products (public, vide)
R=$(curl -s "$BASE/products")
check "GET /products (public)" '"success":true' "$R"

# POST sans auth
R=$(curl -s -X POST "$BASE/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"T-shirt","price":1999,"stock":10}')
check "POST /products (sans auth = 401)" '"success":false' "$R"

# POST user normal
R=$(curl -s -X POST "$BASE/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"name":"T-shirt","price":1999,"stock":10}')
check "POST /products (user normal = 403)" '"Admin access required"' "$R"

# POST admin - Produit 1
R=$(curl -s -X POST "$BASE/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"T-shirt Noir","description":"T-shirt en coton bio","price":1999,"stock":50}')
check "POST /products (admin, T-shirt)" '"success":true' "$R"
PRODUCT1_ID=$(get_id "$R")

# POST admin - Produit 2
R=$(curl -s -X POST "$BASE/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"Jean Slim","description":"Jean slim fit bleu","price":4999,"stock":30}')
check "POST /products (admin, Jean)" '"success":true' "$R"
PRODUCT2_ID=$(get_id "$R")

# POST admin - Produit 3
R=$(curl -s -X POST "$BASE/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"Sneakers","price":7999,"stock":5}')
check "POST /products (admin, Sneakers)" '"success":true' "$R"
PRODUCT3_ID=$(get_id "$R")

# POST doublon
R=$(curl -s -X POST "$BASE/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"T-shirt Noir","price":999,"stock":1}')
check "POST /products (doublon = erreur)" '"success":false' "$R"

# POST input invalide (prix negatif)
R=$(curl -s -X POST "$BASE/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"Bad","price":-10,"stock":1}')
check "POST /products (prix negatif = erreur)" '"success":false' "$R"

# GET /products (3 produits)
R=$(curl -s "$BASE/products")
check "GET /products (3 produits)" '"T-shirt Noir"' "$R"

# GET /products/:id
R=$(curl -s "$BASE/products/$PRODUCT1_ID")
check "GET /products/:id (T-shirt)" '"T-shirt Noir"' "$R"

# GET /products/:id inexistant
R=$(curl -s "$BASE/products/999")
check "GET /products/999 (inexistant = erreur)" '"success":false' "$R"

# PUT /products/:id (admin)
R=$(curl -s -X PUT "$BASE/products/$PRODUCT1_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"price":2499,"stock":45}')
check "PUT /products/:id (admin, update prix+stock)" '"success":true' "$R"

# PUT user normal
R=$(curl -s -X PUT "$BASE/products/$PRODUCT1_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"price":100}')
check "PUT /products/:id (user normal = 403)" '"Admin access required"' "$R"

# DELETE /products/:id (admin) - on supprime le produit 3
R=$(curl -s -X DELETE "$BASE/products/$PRODUCT3_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "DELETE /products/:id (admin)" '"success":true' "$R"

# Verifier suppression
R=$(curl -s "$BASE/products/$PRODUCT3_ID")
check "GET /products/:id (apres delete = erreur)" '"success":false' "$R"

# ===========================================
#  7. CART
# ===========================================

section "7. CART"

# GET /cart vide
R=$(curl -s "$BASE/cart" -H "Authorization: Bearer $USER_TOKEN")
check "GET /cart (vide)" '"success":true' "$R"

# GET /cart sans auth
R=$(curl -s "$BASE/cart")
check "GET /cart (sans auth = 401)" '"success":false' "$R"

# POST /cart - ajouter produit 1
R=$(curl -s -X POST "$BASE/cart" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d "{\"product_id\": $PRODUCT1_ID, \"quantity\": 2}")
check "POST /cart (ajouter T-shirt x2)" '"success":true' "$R"
CART_ITEM1_ID=$(get_id "$R")

# POST /cart - ajouter produit 2
R=$(curl -s -X POST "$BASE/cart" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d "{\"product_id\": $PRODUCT2_ID, \"quantity\": 1}")
check "POST /cart (ajouter Jean x1)" '"success":true' "$R"
CART_ITEM2_ID=$(get_id "$R")

# POST /cart - produit inexistant
R=$(curl -s -X POST "$BASE/cart" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"product_id": 999, "quantity": 1}')
check "POST /cart (produit inexistant = erreur)" '"success":false' "$R"

# POST /cart - quantite invalide
R=$(curl -s -X POST "$BASE/cart" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d "{\"product_id\": $PRODUCT1_ID, \"quantity\": 0}")
check "POST /cart (quantite 0 = erreur)" '"success":false' "$R"

# GET /cart (2 items)
R=$(curl -s "$BASE/cart" -H "Authorization: Bearer $USER_TOKEN")
check "GET /cart (2 items)" '"success":true' "$R"

# PUT /cart/:id (update quantite)
R=$(curl -s -X PUT "$BASE/cart/$CART_ITEM1_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"quantity": 3}')
check "PUT /cart/:id (T-shirt x2 -> x3)" '"success":true' "$R"

# DELETE /cart/:id (retirer Jean)
R=$(curl -s -X DELETE "$BASE/cart/$CART_ITEM2_ID" \
  -H "Authorization: Bearer $USER_TOKEN")
check "DELETE /cart/:id (retirer Jean)" '"success":true' "$R"

# Re-ajouter Jean pour le checkout
curl -s -X POST "$BASE/cart" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d "{\"product_id\": $PRODUCT2_ID, \"quantity\": 1}" > /dev/null

# ===========================================
#  8. ORDERS - CHECKOUT
# ===========================================

section "8. ORDERS"

# GET /orders (vide)
R=$(curl -s "$BASE/orders" -H "Authorization: Bearer $USER_TOKEN")
check "GET /orders (vide)" '"success":true' "$R"

# GET /orders sans auth
R=$(curl -s "$BASE/orders")
check "GET /orders (sans auth = 401)" '"success":false' "$R"

# POST /orders/checkout
R=$(curl -s -X POST "$BASE/orders/checkout" \
  -H "Authorization: Bearer $USER_TOKEN")
check "POST /orders/checkout" '"success":true' "$R"
ORDER1_ID=$(get_id "$R")

# Verifier que le panier est vide apres checkout
R=$(curl -s "$BASE/cart" -H "Authorization: Bearer $USER_TOKEN")
check "GET /cart (vide apres checkout)" '"data":[]' "$R"

# POST /orders/checkout panier vide
R=$(curl -s -X POST "$BASE/orders/checkout" \
  -H "Authorization: Bearer $USER_TOKEN")
check "POST /orders/checkout (panier vide = erreur)" '"success":false' "$R"

# GET /orders (1 commande)
R=$(curl -s "$BASE/orders" -H "Authorization: Bearer $USER_TOKEN")
check "GET /orders (1 commande)" '"success":true' "$R"

# GET /orders/:id
R=$(curl -s "$BASE/orders/$ORDER1_ID" -H "Authorization: Bearer $USER_TOKEN")
check "GET /orders/:id (detail)" '"success":true' "$R"

# GET /orders/:id inexistant
R=$(curl -s "$BASE/orders/999" -H "Authorization: Bearer $USER_TOKEN")
check "GET /orders/999 (inexistant = erreur)" '"success":false' "$R"

# ===========================================
#  9. ORDERS - CANCEL
# ===========================================

section "9. ORDERS - CANCEL"

# Creer une 2e commande pour tester cancel
curl -s -X POST "$BASE/cart" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d "{\"product_id\": $PRODUCT1_ID, \"quantity\": 1}" > /dev/null
R=$(curl -s -X POST "$BASE/orders/checkout" -H "Authorization: Bearer $USER_TOKEN")
ORDER2_ID=$(get_id "$R")

# PATCH /orders/:id/cancel
R=$(curl -s -X PATCH "$BASE/orders/$ORDER2_ID/cancel" \
  -H "Authorization: Bearer $USER_TOKEN")
check "PATCH /orders/:id/cancel" '"success":true' "$R"

# Cancel une commande deja annulee
R=$(curl -s -X PATCH "$BASE/orders/$ORDER2_ID/cancel" \
  -H "Authorization: Bearer $USER_TOKEN")
check "PATCH /orders/:id/cancel (deja annulee = erreur)" '"success":false' "$R"

# ===========================================
#  10. ORDERS - ADMIN
# ===========================================

section "10. ORDERS - ADMIN"

# GET /orders/admin/all (admin)
R=$(curl -s "$BASE/orders/admin/all" -H "Authorization: Bearer $ADMIN_TOKEN")
check "GET /orders/admin/all (admin)" '"success":true' "$R"

# GET /orders/admin/all (user normal = 403)
R=$(curl -s "$BASE/orders/admin/all" -H "Authorization: Bearer $USER_TOKEN")
check "GET /orders/admin/all (user normal = 403)" '"success":false' "$R"

# PATCH /orders/admin/:id/status (admin)
R=$(curl -s -X PATCH "$BASE/orders/admin/$ORDER1_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status": "paid"}')
check "PATCH /orders/admin/:id/status (-> paid)" '"success":true' "$R"

# PATCH status invalide
R=$(curl -s -X PATCH "$BASE/orders/admin/$ORDER1_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status": "invalid_status"}')
check "PATCH /orders/admin/:id/status (invalide = erreur)" '"success":false' "$R"

# PATCH user normal
R=$(curl -s -X PATCH "$BASE/orders/admin/$ORDER1_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"status": "paid"}')
check "PATCH /orders/admin/:id/status (user = 403)" '"success":false' "$R"

# ===========================================
#  11. DELETE USER (dernier test)
# ===========================================

section "11. DELETE USER"

# Register un user temporaire pour tester delete
R=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "temp@test.com", "password": "123456"}')
TEMP_TOKEN=$(get_token "$R")

# DELETE /users/me sans password
R=$(curl -s -X DELETE "$BASE/users/me" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEMP_TOKEN" \
  -d '{}')
check "DELETE /users/me (sans password = erreur)" '"success":false' "$R"

# DELETE /users/me avec password
R=$(curl -s -X DELETE "$BASE/users/me" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEMP_TOKEN" \
  -d '{"password": "123456"}')
check "DELETE /users/me (avec password)" '"success":true' "$R"

# Admin delete user
R=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "todelete@test.com", "password": "123456"}')
TODELETE_TOKEN=$(get_token "$R")
# Recuperer l'ID via /me
R=$(curl -s "$BASE/users/me" -H "Authorization: Bearer $TODELETE_TOKEN")
TODELETE_ID=$(get_id "$R")
R=$(curl -s -X DELETE "$BASE/users/$TODELETE_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "DELETE /users/:id (admin)" '"success":true' "$R"

# ===========================================
#  RESULTATS
# ===========================================

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  RESULTATS: ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC} / $(($PASS + $FAIL)) total"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}  Echecs:${NC}$ISSUES"
fi

echo ""

# Cleanup
rm -f /tmp/test_cookies_user.txt /tmp/test_cookies_admin.txt

