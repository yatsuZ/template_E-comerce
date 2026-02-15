import Database from 'better-sqlite3';
import { Result, success, failure } from '../../utils/Error/ErrorManagement.js';

const location = 'core/services/stats.service.ts';

export interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  ordersByStatus: Record<string, number>;
}

export class StatsService {
  constructor(private db: Database.Database) {}

  getDashboardStats(): Result<DashboardStats> {
    try {
      const totalUsers = (this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
      const totalProducts = (this.db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }).count;
      const totalOrders = (this.db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number }).count;
      const totalRevenue = (this.db.prepare('SELECT COALESCE(SUM(total), 0) as sum FROM orders WHERE status = ?').get('paid') as { sum: number }).sum;

      const statusRows = this.db.prepare('SELECT status, COUNT(*) as count FROM orders GROUP BY status').all() as { status: string; count: number }[];
      const ordersByStatus: Record<string, number> = {};
      for (const row of statusRows) {
        ordersByStatus[row.status] = row.count;
      }

      return success({
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        ordersByStatus,
      });
    } catch (err) {
      return failure('DATABASE', `${location} getDashboardStats: failed to fetch stats`, err);
    }
  }
}
