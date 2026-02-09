import { Result, success, failure } from '../../utils/Error/ErrorManagement.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { OrderItemService } from './order_items.service.js';
import { CartService } from './cart.service.js';
import { ProductService } from './products.service.js';
import { UserService } from './user.service.js';
import { I_Order, OrderStatus } from '../interfaces/order.interfaces.js';

const location = 'core/services/order.service.ts';

export class OrderService {
  constructor(
    private _orderRepo: OrderRepository,
    private _orderItemService: OrderItemService,
    private _cartService: CartService,
    private _productService: ProductService,
    private _userService: UserService
  ) {}

  // ========== VALIDATION (private) ==========

  private isValidTotal(total: number): boolean {
    return total > 0 && Number.isInteger(total);
  }

  // ========== CREATE ==========

  /**
   * Crée une commande simple (sans passer par le panier)
   */
  createOrder(userId: number, total: number): Result<I_Order> {
    if (!this.isValidTotal(total))
      return failure('INVALID_ARG', `${location} createOrder: total must be a positive integer (centimes)`, total);

    const userResult = this._userService.getUserById(userId);
    if (!userResult.ok)
      return failure('NOT_FOUND', `${location} createOrder: user not found`, userId);

    return this._orderRepo.create({ user_id: userId, total });
  }

  /**
   * Checkout : transforme le panier en commande
   * 1. Récupère les items du panier
   * 2. Vérifie le stock pour chaque produit
   * 3. Calcule le total
   * 4. Crée la commande
   * 5. Crée les order_items
   * 6. Décrémente le stock
   * 7. Vide le panier
   */
  checkout(userId: number): Result<I_Order> {
    // Vérifier que l'utilisateur existe
    const userResult = this._userService.getUserById(userId);
    if (!userResult.ok)
      return failure('NOT_FOUND', `${location} checkout: user not found`, userId);

    // Récupérer les items du panier
    const cartResult = this._cartService.getCartByUserId(userId);
    if (!cartResult.ok) return cartResult;

    if (cartResult.data.length === 0)
      return failure('INVALID_ARG', `${location} checkout: cart is empty`);

    // Vérifier le stock et calculer le total
    let total = 0;
    const items: { productId: number; quantity: number; price: number }[] = [];

    for (const cartItem of cartResult.data) {
      const productResult = this._productService.getById(cartItem.product_id);
      if (!productResult.ok)
        return failure('NOT_FOUND', `${location} checkout: product not found`, cartItem.product_id);

      const product = productResult.data;

      const stockCheck = this._productService.hasEnoughStock(product.id, cartItem.quantity);
      if (!stockCheck.ok) return stockCheck;
      if (!stockCheck.data)
        return failure('INVALID_ARG', `${location} checkout: not enough stock for product "${product.name}"`, { productId: product.id, requested: cartItem.quantity, available: product.stock });

      total += product.price * cartItem.quantity;
      items.push({ productId: product.id, quantity: cartItem.quantity, price: product.price });
    }

    // Créer la commande
    const orderResult = this._orderRepo.create({ user_id: userId, total });
    if (!orderResult.ok) return orderResult;

    // Créer les order_items et décrémenter le stock
    for (const item of items) {
      const orderItemResult = this._orderItemService.createItem({
        order_id: orderResult.data.id,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price,
      });
      if (!orderItemResult.ok) return orderItemResult;

      const decrementResult = this._productService.decrementStock(item.productId, item.quantity);
      if (!decrementResult.ok) return decrementResult;
    }

    // Vider le panier
    const clearResult = this._cartService.clearCart(userId);
    if (!clearResult.ok) return clearResult;

    return orderResult;
  }

  // ========== READ ==========

  getOrderById(orderId: number): Result<I_Order> {
    return this._orderRepo.findById(orderId);
  }

  getOrdersByUserId(userId: number): Result<I_Order[]> {
    return this._orderRepo.findByUserId(userId);
  }

  // ========== UPDATE ==========

  updateStatus(orderId: number, status: OrderStatus): Result<I_Order> {
    const orderResult = this._orderRepo.findById(orderId);
    if (!orderResult.ok) return orderResult;

    return this._orderRepo.update(orderId, { status });
  }

  updateStripePaymentId(orderId: number, stripePaymentId: string): Result<I_Order> {
    const orderResult = this._orderRepo.findById(orderId);
    if (!orderResult.ok) return orderResult;

    return this._orderRepo.update(orderId, { stripe_payment_id: stripePaymentId });
  }

  /**
   * Annule une commande (seulement si pending)
   * Rembourse le stock pour chaque produit
   */
  cancelOrder(orderId: number): Result<I_Order> {
    const orderResult = this._orderRepo.findById(orderId);
    if (!orderResult.ok) return orderResult;

    if (orderResult.data.status !== 'pending')
      return failure('INVALID_ARG', `${location} cancelOrder: only pending orders can be cancelled`, orderResult.data.status);

    // Récupérer les order_items pour rembourser le stock
    const itemsResult = this._orderItemService.getByOrderId(orderId);
    if (!itemsResult.ok) return itemsResult;

    for (const item of itemsResult.data) {
      const incrementResult = this._productService.incrementStock(item.product_id, item.quantity);
      if (!incrementResult.ok) return incrementResult;
    }

    return this._orderRepo.update(orderId, { status: 'cancelled' });
  }

  // ========== DELETE ==========

  deleteOrder(orderId: number): Result<boolean> {
    const result = this._orderRepo.delete(orderId);
    if (!result.ok) return result;
    return success(true);
  }
}
