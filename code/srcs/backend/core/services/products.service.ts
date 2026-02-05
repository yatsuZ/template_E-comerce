import { Result, success, failure } from '../../utils/Error/ErrorManagement.js';
import { I_Product } from '../interfaces/product.interfaces.js';
import { ProductCreate, ProductUpdate, ProductRepository } from '../repositories/product.repository.js';

const location = 'core/services/products.service.ts';

export class ProductService {

  constructor(private _productRepo: ProductRepository) {}

  // ========== VALIDATION (private) ==========

  private isValidPrice(price: number): boolean {
    return price >= 0 && Number.isInteger(price);
  }

  private isValidStock(stock: number): boolean {
    return stock >= 0 && Number.isInteger(stock);
  }

  private isValidImageUrl(url: string | null): boolean {
    if (url === null) return true;
    // Vérifie que l'URL se termine par une extension d'image valide
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    try {
      new URL(url); // Vérifie que c'est une URL valide
      return imageExtensions.test(url);
    } catch {
      return false;
    }
  }

  // ========== CREATE ==========

  createProduct(data: ProductCreate): Result<I_Product> {
    // Validation du prix
    if (!this.isValidPrice(data.price))
      return failure('INVALID_ARG', `${location} createProduct: price must be a positive integer (centimes)`, data.price);

    // Validation du stock
    if (!this.isValidStock(data.stock)) 
      return failure('INVALID_ARG', `${location} createProduct: stock must be a positive integer`, data.stock);

    // Validation de l'image URL
    if (!this.isValidImageUrl(data.image))
      return failure('INVALID_ARG', `${location} createProduct: image must be a valid URL ending with jpg, jpeg, png, gif, webp or svg`, data.image);

    // Le repository gère l'unicité du nom (UNIQUE constraint en BDD)
    return this._productRepo.create(data);
  }

  // ========== READ ==========

  getById(id: number): Result<I_Product> {
    return this._productRepo.findById(id);
  }

  getByName(name: string): Result<I_Product | null> {
    const result = this._productRepo.findOneByName(name);
    if (!result.ok) return result;

    // findOneByName retourne un array, on veut le premier ou null
    return success(result.data.length > 0 ? result.data[0] : null);
  }

  getAll(): Result<I_Product[]> {
    return this._productRepo.findAll();
  }

  // ========== UPDATE ==========

  updateProduct(id: number, data: ProductUpdate): Result<I_Product> {
    // Validation du prix si fourni
    if (data.price !== undefined && !this.isValidPrice(data.price)) 
      return failure('INVALID_ARG', `${location} updateProduct: price must be a positive integer (centimes)`, data.price);

    // Validation du stock si fourni
    if (data.stock !== undefined && !this.isValidStock(data.stock)) 
      return failure('INVALID_ARG', `${location} updateProduct: stock must be a positive integer`, data.stock);

    // Validation de l'image URL si fournie
    if (data.image !== undefined && !this.isValidImageUrl(data.image)) 
      return failure('INVALID_ARG', `${location} updateProduct: image must be a valid URL ending with jpg, jpeg, png, gif, webp or svg`, data.image);

    return this._productRepo.update(id, data);
  }

  updateStock(id: number, newStock: number): Result<I_Product> {
    if (!this.isValidStock(newStock)) 
      return failure('INVALID_ARG', `${location} updateStock: stock must be a positive integer`, newStock);
    return this._productRepo.update(id, { stock: newStock });
  }

  updatePrice(id: number, newPrice: number): Result<I_Product> {
    if (!this.isValidPrice(newPrice)) 
      return failure('INVALID_ARG', `${location} updatePrice: price must be a positive integer (centimes)`, newPrice);
    return this._productRepo.update(id, { price: newPrice });
  }

  // ========== DELETE ==========

  deleteProduct(id: number): Result<boolean> {
    const result = this._productRepo.delete(id);
    if (!result.ok) return result;
    return success(true);
  }

  // ========== BUSINESS METHODS (pour Cart/Order) ==========

  /**
   * Vérifie si le produit a assez de stock pour la quantité demandée
   */
  hasEnoughStock(productId: number, quantity: number): Result<boolean> {
    const productResult = this._productRepo.findById(productId);
    if (!productResult.ok) return productResult;

    return success(productResult.data.stock >= quantity);
  }

  /**
   * Décrémente le stock après un achat
   */
  decrementStock(productId: number, quantity: number): Result<I_Product> {
    if (quantity <= 0) 
      return failure('INVALID_ARG', `${location} decrementStock: quantity must be positive`, quantity);

    const productResult = this._productRepo.findById(productId);
    if (!productResult.ok) return productResult;

    const product = productResult.data;
    const newStock = product.stock - quantity;

    if (newStock < 0) 
      return failure('INVALID_ARG', `${location} decrementStock: not enough stock. Available: ${product.stock}, requested: ${quantity}`, { available: product.stock, requested: quantity });

    return this._productRepo.update(productId, { stock: newStock });
  }

  /**
   * Incrémente le stock après un remboursement
   */
  incrementStock(productId: number, quantity: number): Result<I_Product> {
    if (quantity <= 0) 
      return failure('INVALID_ARG', `${location} incrementStock: quantity must be positive`, quantity);

    const productResult = this._productRepo.findById(productId);
    if (!productResult.ok) return productResult;

    const newStock = productResult.data.stock + quantity;
    return this._productRepo.update(productId, { stock: newStock });
  }
}