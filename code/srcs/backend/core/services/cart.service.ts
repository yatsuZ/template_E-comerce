import { Result, success, failure, PaginationOptions, Paginated } from '../../utils/Error/ErrorManagement.js';
import { CartRepository } from '../repositories/cart.repository.js';
import { ProductService } from './products.service.js';
import { UserService } from './user.service.js';
import { I_Cart } from '../interfaces/cart.interfaces.js';

const location = 'core/services/cart.service.ts';

export class CartService {
  constructor(
    private _cartRepo: CartRepository,
    private _productService: ProductService,
    private _userService: UserService
  ) {}

  // ========== VALIDATION (private) ==========

  private isValidQuantity(quantity: number): boolean {
    return quantity > 0 && Number.isInteger(quantity);
  }

  // ========== CREATE ==========

  /**
   * Ajoute un produit au panier.
   * Si le produit est déjà dans le panier → met à jour la quantité (additionne).
   * Vérifie : user existe, product existe, stock suffisant.
   */
  addToCart(userId: number, productId: number, quantity: number): Result<I_Cart> {
    if (!this.isValidQuantity(quantity))
      return failure('INVALID_ARG', `${location} addToCart: quantity must be a positive integer`, quantity);

    // Vérifier que l'utilisateur existe
    const userResult = this._userService.getUserById(userId);
    if (!userResult.ok)
      return failure('NOT_FOUND', `${location} addToCart: user not found`, userId);

    // Vérifier que le produit existe
    const productResult = this._productService.getById(productId);
    if (!productResult.ok)
      return failure('NOT_FOUND', `${location} addToCart: product not found`, productId);

    // Vérifier si le produit est déjà dans le panier
    const existingResult = this._cartRepo.findOneByUserAndProduct(userId, productId);
    if (!existingResult.ok) return existingResult;

    if (existingResult.data) {
      // Déjà dans le panier → additionner la quantité
      const newQuantity = existingResult.data.quantity + quantity;

      // Vérifier le stock pour la nouvelle quantité totale
      const stockCheck = this._productService.hasEnoughStock(productId, newQuantity);
      if (!stockCheck.ok) return stockCheck;
      if (!stockCheck.data)
        return failure('INVALID_ARG', `${location} addToCart: not enough stock. Requested: ${newQuantity}, available: ${productResult.data.stock}`, { requested: newQuantity, available: productResult.data.stock });

      return this._cartRepo.update(existingResult.data.id, { quantity: newQuantity });
    }

    // Vérifier le stock
    const stockCheck = this._productService.hasEnoughStock(productId, quantity);
    if (!stockCheck.ok) return stockCheck;
    if (!stockCheck.data)
      return failure('INVALID_ARG', `${location} addToCart: not enough stock. Requested: ${quantity}, available: ${productResult.data.stock}`, { requested: quantity, available: productResult.data.stock });

    return this._cartRepo.create({ user_id: userId, product_id: productId, quantity });
  }

  // ========== READ ==========

  getCartByUserId(userId: number): Result<I_Cart[]> {
    return this._cartRepo.findByUserId(userId);
  }

  getCartByUserIdPaginated(userId: number, options: PaginationOptions): Result<Paginated<I_Cart>> {
    return this._cartRepo.findByUserIdPaginated(userId, options);
  }

  getCartItem(cartId: number): Result<I_Cart> {
    return this._cartRepo.findById(cartId);
  }

  // ========== UPDATE ==========

  /**
   * Met à jour la quantité d'un item du panier (remplace, n'additionne pas)
   */
  updateQuantity(cartId: number, newQuantity: number): Result<I_Cart> {
    if (!this.isValidQuantity(newQuantity))
      return failure('INVALID_ARG', `${location} updateQuantity: quantity must be a positive integer`, newQuantity);

    // Vérifier que l'item existe
    const cartResult = this._cartRepo.findById(cartId);
    if (!cartResult.ok) return cartResult;

    // Vérifier le stock
    const stockCheck = this._productService.hasEnoughStock(cartResult.data.product_id, newQuantity);
    if (!stockCheck.ok) return stockCheck;
    if (!stockCheck.data)
      return failure('INVALID_ARG', `${location} updateQuantity: not enough stock`, { requested: newQuantity });

    return this._cartRepo.update(cartId, { quantity: newQuantity });
  }

  // ========== DELETE ==========

  removeFromCart(cartId: number): Result<void> {
    return this._cartRepo.delete(cartId);
  }

  /**
   * Vide tout le panier d'un utilisateur
   */
  clearCart(userId: number): Result<void> {
    const items = this._cartRepo.findByUserId(userId);
    if (!items.ok) return items;

    for (const item of items.data) {
      const del = this._cartRepo.delete(item.id);
      if (!del.ok) return del;
    }

    return success(undefined);
  }
}
