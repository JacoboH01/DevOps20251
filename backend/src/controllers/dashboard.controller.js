// =====================================================
// BACKEND - Node.js + Express
// =====================================================

// controllers/dashboardController.js
const pool = require('../config/database');
const ExcelJS = require('exceljs');

const dashboardController = {
  // Obtener todas las estadísticas del dashboard
  async getDashboardStats(req, res) {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // Ventas del mes actual
      const salesQuery = `
        SELECT 
          DATE(o."createdAt") as date,
          COUNT(*) as orders_count,
          SUM(o."totalAmount") as total_sales
        FROM orders o
        WHERE EXTRACT(MONTH FROM o."createdAt") = $1 
        AND EXTRACT(YEAR FROM o."createdAt") = $2
        AND o.status != 'cancelled'
        GROUP BY DATE(o."createdAt")
        ORDER BY date
      `;

      // Producto más vendido
      const topProductQuery = `
        SELECT 
          p.name,
          p.category,
          SUM(oi.quantity) as total_sold,
          SUM(oi.quantity * oi.price) as revenue
        FROM order_items oi
        JOIN products p ON oi."productId" = p.id
        JOIN orders o ON oi."orderId" = o.id
        WHERE o.status != 'cancelled'
        GROUP BY p.id, p.name, p.category
        ORDER BY total_sold DESC
        LIMIT 10
      `;

      // Clientes que más compran
      const topCustomersQuery = `
        SELECT 
          u.name,
          u.email,
          COUNT(o.id) as total_orders,
          SUM(o."totalAmount") as total_spent
        FROM users u
        JOIN orders o ON u.id = o."userId"
        WHERE o.status != 'cancelled'
        GROUP BY u.id, u.name, u.email
        ORDER BY total_spent DESC
        LIMIT 10
      `;

      // Resumen general
      const summaryQuery = `
        SELECT 
          COUNT(DISTINCT o.id) as total_orders,
          SUM(o."totalAmount") as total_revenue,
          COUNT(DISTINCT o."userId") as active_customers,
          AVG(o."totalAmount") as avg_order_value
        FROM orders o
        WHERE EXTRACT(MONTH FROM o."createdAt") = $1 
        AND EXTRACT(YEAR FROM o."createdAt") = $2
        AND o.status != 'cancelled'
      `;

      const [salesResult, topProductResult, topCustomersResult, summaryResult] = await Promise.all([
        pool.query(salesQuery, [currentMonth, currentYear]),
        pool.query(topProductQuery),
        pool.query(topCustomersQuery),
        pool.query(summaryQuery, [currentMonth, currentYear])
      ]);

      res.json({
        success: true,
        data: {
          monthlyStats: summaryResult.rows[0],
          dailySales: salesResult.rows,
          topProducts: topProductResult.rows,
          topCustomers: topCustomersResult.rows
        }
      });

    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  },

  // Exportar reporte de ventas mensuales a Excel
  async exportMonthlySales(req, res) {
    try {
      const { month, year } = req.query;
      const targetMonth = month || new Date().getMonth() + 1;
      const targetYear = year || new Date().getFullYear();

      const query = `
        SELECT 
          DATE(o."createdAt") as fecha,
          COUNT(*) as num_ordenes,
          SUM(o."totalAmount") as ventas_totales,
          AVG(o."totalAmount") as promedio_orden
        FROM orders o
        WHERE EXTRACT(MONTH FROM o."createdAt") = $1 
        AND EXTRACT(YEAR FROM o."createdAt") = $2
        AND o.status != 'cancelled'
        GROUP BY DATE(o."createdAt")
        ORDER BY fecha
      `;

      const result = await pool.query(query, [targetMonth, targetYear]);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Ventas Mensuales');

      // Headers
      worksheet.columns = [
        { header: 'Fecha', key: 'fecha', width: 15 },
        { header: 'Número de Órdenes', key: 'num_ordenes', width: 20 },
        { header: 'Ventas Totales', key: 'ventas_totales', width: 20 },
        { header: 'Promedio por Orden', key: 'promedio_orden', width: 20 }
      ];

      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add data
      result.rows.forEach(row => {
        worksheet.addRow({
          fecha: new Date(row.fecha).toLocaleDateString(),
          num_ordenes: parseInt(row.num_ordenes),
          ventas_totales: parseFloat(row.ventas_totales),
          promedio_orden: parseFloat(row.promedio_orden)
        });
      });

      // Format currency columns
      worksheet.getColumn('ventas_totales').numFmt = '$#,##0.00';
      worksheet.getColumn('promedio_orden').numFmt = '$#,##0.00';

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=ventas-${targetMonth}-${targetYear}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Error exporting monthly sales:', error);
      res.status(500).json({ success: false, error: 'Error al exportar datos' });
    }
  },

  // Exportar reporte de productos más vendidos a Excel
  async exportTopProducts(req, res) {
    try {
      const query = `
        SELECT 
          p.name as producto,
          p.category as categoria,
          p.price as precio_unitario,
          SUM(oi.quantity) as cantidad_vendida,
          SUM(oi.quantity * oi.price) as ingresos_totales
        FROM order_items oi
        JOIN products p ON oi."productId" = p.id
        JOIN orders o ON oi."orderId" = o.id
        WHERE o.status != 'cancelled'
        GROUP BY p.id, p.name, p.category, p.price
        ORDER BY cantidad_vendida DESC
        LIMIT 50
      `;

      const result = await pool.query(query);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Productos Más Vendidos');

      worksheet.columns = [
        { header: 'Producto', key: 'producto', width: 30 },
        { header: 'Categoría', key: 'categoria', width: 20 },
        { header: 'Precio Unitario', key: 'precio_unitario', width: 20 },
        { header: 'Cantidad Vendida', key: 'cantidad_vendida', width: 20 },
        { header: 'Ingresos Totales', key: 'ingresos_totales', width: 20 }
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      result.rows.forEach(row => {
        worksheet.addRow({
          producto: row.producto,
          categoria: row.categoria,
          precio_unitario: parseFloat(row.precio_unitario),
          cantidad_vendida: parseInt(row.cantidad_vendida),
          ingresos_totales: parseFloat(row.ingresos_totales)
        });
      });

      worksheet.getColumn('precio_unitario').numFmt = '$#,##0.00';
      worksheet.getColumn('ingresos_totales').numFmt = '$#,##0.00';

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=productos-mas-vendidos.xlsx');

      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Error exporting top products:', error);
      res.status(500).json({ success: false, error: 'Error al exportar datos' });
    }
  },

  // Exportar reporte de mejores clientes a Excel
  async exportTopCustomers(req, res) {
    try {
      const query = `
        SELECT 
          u.name as cliente,
          u.email,
          COUNT(o.id) as total_ordenes,
          SUM(o."totalAmount") as total_gastado,
          AVG(o."totalAmount") as promedio_por_orden,
          MAX(o."createdAt") as ultima_compra
        FROM users u
        JOIN orders o ON u.id = o."userId"
        WHERE o.status != 'cancelled'
        GROUP BY u.id, u.name, u.email
        ORDER BY total_gastado DESC
        LIMIT 50
      `;

      const result = await pool.query(query);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Mejores Clientes');

      worksheet.columns = [
        { header: 'Cliente', key: 'cliente', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Total Órdenes', key: 'total_ordenes', width: 15 },
        { header: 'Total Gastado', key: 'total_gastado', width: 20 },
        { header: 'Promedio por Orden', key: 'promedio_por_orden', width: 20 },
        { header: 'Última Compra', key: 'ultima_compra', width: 20 }
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      result.rows.forEach(row => {
        worksheet.addRow({
          cliente: row.cliente,
          email: row.email,
          total_ordenes: parseInt(row.total_ordenes),
          total_gastado: parseFloat(row.total_gastado),
          promedio_por_orden: parseFloat(row.promedio_por_orden),
          ultima_compra: new Date(row.ultima_compra).toLocaleDateString()
        });
      });

      worksheet.getColumn('total_gastado').numFmt = '$#,##0.00';
      worksheet.getColumn('promedio_por_orden').numFmt = '$#,##0.00';

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=mejores-clientes.xlsx');

      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Error exporting top customers:', error);
      res.status(500).json({ success: false, error: 'Error al exportar datos' });
    }
  }
};

module.exports = dashboardController;