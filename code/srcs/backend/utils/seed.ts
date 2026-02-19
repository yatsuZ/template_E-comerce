import { UserService } from '../core/services/user.service.js';
import { ProductService } from '../core/services/products.service.js';
import { ArticleService } from '../core/services/article.service.js';
import { Logger } from './logger.js';

const location = 'utils/seed.ts';

/**
 * Crée un admin au démarrage si ADMIN_EMAIL + ADMIN_PASSWORD sont définis
 * dans les variables d'environnement et qu'aucun admin avec cet email n'existe.
 * Ne fait rien si les variables ne sont pas définies.
 */
export async function seedAdmin(userService: UserService): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) return;

  const exists = userService.getUserByEmail(email);
  if (exists.ok && exists.data) {
    Logger.info(location, `Admin already exists: ${email}`);
    return;
  }

  const result = await userService.createAdmin(email, password);
  if (result.ok)
    Logger.success(location, `Admin created: ${email}`);
  else
    Logger.warn(location, `Admin seed failed: ${result.error.message}`);
}

/**
 * Seed de données de test (produits + articles).
 * Ne s'exécute que si NODE_ENV=development ET que la BDD est vide.
 */
export function seedTestData(
  productService: ProductService,
  articleService: ArticleService,
  adminId: number
): void {
  if (process.env.NODE_ENV !== 'development') return;

  // --- Produits ---
  const existingProducts = productService.getAllPaginated({ page: 1, limit: 1 });
  if (existingProducts.ok && existingProducts.data.total > 0) {
    Logger.info(location, `Products already seeded (${existingProducts.data.total} found)`);
  } else {
    const products = [
      { name: 'Sneakers Carbon X',       description: 'Chaussures de running ultra-legeres avec semelle en fibre de carbone. Confort et performance au quotidien.', price: 18900, stock: 45, image: null },
      { name: 'Hoodie Stealth Black',    description: 'Sweat a capuche coupe oversize en coton premium 400g. Interieur brosse, finitions haut de gamme.', price: 8900, stock: 120, image: null },
      { name: 'Sac Voyager 40L',         description: 'Sac de voyage imperméable avec compartiments organises. Parfait pour les weekends et les deplacements.', price: 12500, stock: 30, image: null },
      { name: 'T-Shirt Essentials',      description: 'T-shirt basique en coton bio 180g. Coupe regular, col rond renforce. Le basique parfait.', price: 3500, stock: 200, image: null },
      { name: 'Casquette Urban Cap',     description: 'Casquette ajustable avec broderie logo. Tissu respirant, visiere incurvee.', price: 2900, stock: 80, image: null },
      { name: 'Jogger Tech Fleece',      description: 'Pantalon de jogging en tech fleece double epaisseur. Poches zippees, coupe slim.', price: 7500, stock: 65, image: null },
      { name: 'Montre Chrono Sport',     description: 'Montre chronographe avec bracelet silicone. Etanche 50m, retroeclairage LED.', price: 15900, stock: 25, image: null },
      { name: 'Lunettes Shade Pro',      description: 'Lunettes de soleil polarisees, monture legere en TR90. Protection UV400.', price: 6900, stock: 40, image: null },
      { name: 'Veste Windbreaker',       description: 'Veste coupe-vent avec capuche repliable. Tissu ripstop ultra-leger, poche kangourou.', price: 9900, stock: 55, image: null },
      { name: 'Chaussettes Pack x5',     description: 'Lot de 5 paires de chaussettes mi-hautes en coton. Renforts talon et pointe.', price: 1900, stock: 300, image: null },
      { name: 'Ceinture Minimal',        description: 'Ceinture en cuir veritable, boucle metal satine. Largeur 3cm, style epure.', price: 4500, stock: 70, image: null },
      { name: 'Bonnet Winter Core',      description: 'Bonnet en laine merinos avec doublure polaire. Chaud, leger et confortable.', price: 2500, stock: 90, image: null },
    ];

    let count = 0;
    for (const p of products) {
      const result = productService.createProduct(p);
      if (result.ok) count++;
    }
    Logger.success(location, `Seeded ${count} products`);
  }

  // --- Articles ---
  const existingArticles = articleService.getAllPaginated({ page: 1, limit: 1 });
  if (existingArticles.ok && existingArticles.data.total > 0) {
    Logger.info(location, `Articles already seeded (${existingArticles.data.total} found)`);
  } else {
    const articles = [
      {
        title: 'Comment choisir ses sneakers',
        content: `Le choix d'une bonne paire de sneakers depend de plusieurs criteres. Voici notre guide complet.\n\n## Le confort avant tout\n\nUne bonne sneaker doit offrir un maintien optimal du pied. Verifiez l'amorti de la semelle et le support de la voute plantaire.\n\n## Les materiaux\n\nPrivilegiez les materiaux respirants comme le mesh ou le knit. Pour un usage quotidien, le cuir synthetique offre un bon compromis entre durabilite et esthetique.\n\n## L'usage\n\nRunning, lifestyle ou training ? Chaque activite demande des caracteristiques specifiques. Ne negligez pas ce critere.`,
      },
      {
        title: 'Les tendances streetwear 2026',
        content: `Le streetwear continue d'evoluer en 2026. Decouvrez les tendances qui marquent cette annee.\n\n## Le retour du minimalisme\n\nApres des annees de logos XXL, la tendance est au clean et a l'epure. Les couleurs neutres dominent les collections.\n\n## Tech wear\n\nLes vetements techniques s'invitent dans le quotidien. Tissus impermeables, coupes ergonomiques et details fonctionnels sont au rendez-vous.\n\n## Le vintage revisité\n\nLes pieces vintage sont reinterpretees avec des materiaux modernes. Un melange retro-futuriste qui seduit.`,
      },
      {
        title: 'Entretenir ses vetements premium',
        content: `Investir dans des pieces de qualite, c'est bien. Les entretenir correctement, c'est mieux.\n\n## Le lavage\n\nToujours laver a l'envers, a 30 degres maximum. Evitez le seche-linge pour preserver les fibres et les couleurs.\n\n## Le stockage\n\nSuspendez les vestes et chemises sur des cintres adaptes. Pliez les mailles pour eviter qu'elles ne se deforment.\n\n## Les sneakers\n\nNettoyez regulierement vos sneakers avec une brosse douce et un produit adapte. Utilisez des embauchoirs pour maintenir leur forme.`,
      },
    ];

    let count = 0;
    for (const a of articles) {
      const result = articleService.createFromMarkdown(a.title, a.content, adminId);
      if (result.ok) count++;
    }
    Logger.success(location, `Seeded ${count} articles`);
  }
}
