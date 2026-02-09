import { Result, success, failure } from '../../utils/Error/ErrorManagement.js';
import { OrderItemsRepository } from '../repositories/order_items.repository.js';
import { I_OrderItems } from '../interfaces/order_items.interfaces.js';

const location = 'core/services/order_items.service.ts';

export type OrderItemCreate = {
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
};

export class OrderItemService {
  constructor(private _orderItemsRepo: OrderItemsRepository) {}

  // ========== VALIDATION (private) ==========

  private isValidQuantity(quantity: number): boolean {
    return quantity > 0 && Number.isInteger(quantity);
  }

  private isValidPrice(price: number): boolean {
    return price >= 0 && Number.isInteger(price);
  }

  // ========== CREATE ==========

  createItem(data: OrderItemCreate): Result<I_OrderItems> {
    if (!this.isValidQuantity(data.quantity))
      return failure('INVALID_ARG', `${location} createItem: quantity must be a positive integer`, data.quantity);

    if (!this.isValidPrice(data.price))
      return failure('INVALID_ARG', `${location} createItem: price must be a non-negative integer (centimes)`, data.price);

    return this._orderItemsRepo.create({
      order_id: data.order_id,
      product_id: data.product_id,
      quantity: data.quantity,
      price: data.price,
    });
  }

  // ========== READ ==========

  getById(id: number): Result<I_OrderItems> {
    return this._orderItemsRepo.findById(id);
  }

  getByOrderId(orderId: number): Result<I_OrderItems[]> {
    return this._orderItemsRepo.findBy('order_id', orderId);
  }

  getByProductId(productId: number): Result<I_OrderItems[]> {
    return this._orderItemsRepo.findByProductId(productId);
  }

  // ========== DELETE ==========

  deleteItem(id: number): Result<void> {
    return this._orderItemsRepo.delete(id);
  }
}
