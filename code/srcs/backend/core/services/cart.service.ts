import { Result, success, failure } from '../../utils/Error/ErrorManagement.js';
import { CartCreate, CartRepository } from '../repositories/cart.repository.js';
import { I_Cart } from '../interfaces/cart.interfaces.js';

export class CartService {
  private _cartRepo: CartRepository;

  constructor(cartRepo: CartRepository) {
    this._cartRepo = cartRepo;
  }

  // Create
  AddProductInCart(who_what_how_many: CartCreate): Result<I_Cart> {
    const id_user = who_what_how_many.user_id; // Verifier que cette utilisateur existe
    const id_product = who_what_how_many.product_id; // Verifier que ce produit existe
    // Verifier que id user et id product nexiste pas deja car si les 2 existe alors on doit faire update aux lieux de create
    const quantity = who_what_how_many.quantity;// Verifier que la quantité n'est pas supérieur aux stock du produit
    // Si tout est bon on ajoute si non on retrun error 

    // POur chaque verification de truc en faire une methode de services
    // En vrai cart c'est galere je dois dabord commencer par product
    return this._cartRepo.create({user_id: id_user, product_id: id_product, quantity: quantity});
  }
}