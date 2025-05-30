const pool = require('../config/database');

exports.create = async (req, res) => {
  const { userId, cardNumber, expiryDate, cardName, total, cartItems } = req.body;
  const shippingAddress = req.body.shippingAddress || 'Default Address';
  const paymentMethod = req.body.paymentMethod || 'credit_card';
  
  try {
    // Insertar en orders (usa userId del token)
    const orderRes = await pool.query(`
      INSERT INTO orders
        ("userId", status, "totalAmount", "shippingAddress", "paymentMethod", card_last4, card_expiry, card_name, "createdAt", "updatedAt")   
      VALUES ($1, 'pending', $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id
    `, [userId, total, shippingAddress, paymentMethod, cardNumber.slice(-4), expiryDate, cardName]);

    const orderId = orderRes.rows[0].id; // ✅ ID autogenerado

    // Insertar cada item del carrito relacionado con la orden generada
    const insertItemQuery = `
      INSERT INTO order_items ("orderId", "productId", quantity, price)
      VALUES ($1, $2, $3, $4)
    `;
    for (const item of JSON.parse(cartItems)) {
      //console.log(`Insertando item ${item}: ${item.id}, Cantidad: ${item.quantity}, Precio: ${item.price || 0}`);
      await pool.query(insertItemQuery, [orderId, item.id, item.quantity, item.price || 0]);
    }

    // Confirmar transacción
    await pool.query('COMMIT');
    res.status(201).json({ orderId }); // ✅ Solo responde el ID de la orden creada

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el pago' });
  }
};

exports.getByIdUser = async (req, res) => {
  const { userId } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM orders WHERE "userId"=$1', [userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener like' });
  }
}; 

exports.getUserOrderStats = async (req, res) => {
    try {
      const { userId } = req.params;

      const statsQuery = `
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
          COALESCE(SUM(CASE WHEN status != 'cancelled' THEN "totalAmount" END), 0) as total_spent,
          COALESCE(AVG(CASE WHEN status != 'cancelled' THEN "totalAmount" END), 0) as avg_order_value,
          MAX("createdAt") as last_order_date
        FROM orders
        WHERE "userId" = $1
      `;

      const result = await pool.query(statsQuery, [userId]);
      const stats = result.rows[0];

      // Formatear estadísticas
      const formattedStats = {
        totalOrders: parseInt(stats.total_orders),
        completedOrders: parseInt(stats.completed_orders),
        pendingOrders: parseInt(stats.pending_orders),
        cancelledOrders: parseInt(stats.cancelled_orders),
        processingOrders: parseInt(stats.processing_orders),
        totalSpent: parseFloat(stats.total_spent),
        avgOrderValue: parseFloat(stats.avg_order_value),
        lastOrderDate: stats.last_order_date ? new Date(stats.last_order_date).toISOString() : null
      };

      res.json({
        success: true,
        data: formattedStats
      });

    } catch (error) {
      console.error('Error getting user order stats:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener las estadísticas de órdenes' 
      });
    }
};

exports.getOrderDetails = async (req, res) => {
    try {
      const userId = req.params.userId;
      const orderId = req.params.orderId;

      const orderQuery = `
        SELECT 
          o.*,
          u.name as user_name,
          u.email as user_email,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', oi.id,
                'productId', oi."productId",
                'productName', p.name,
                'productImage', p."imageUrl",
                'productDescription', p.description,
                'quantity', oi.quantity,
                'unitPrice', oi.price,
                'totalPrice', oi.quantity * oi.price,
                'category', p.category
              ) ORDER BY p.name
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::json
          ) as items
        FROM orders o
        LEFT JOIN users u ON o."userId" = u.id
        LEFT JOIN order_items oi ON o.id = oi."orderId"
        LEFT JOIN products p ON oi."productId" = p.id
        WHERE o.id = $1 AND o."userId" = $2
        GROUP BY o.id, u.name, u.email
      `;

      const result = await pool.query(orderQuery, [orderId, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Orden no encontrada o no tienes permisos para verla'
        });
      }

      const order = result.rows[0];
      
      // Formatear la respuesta
      const formattedOrder = {
        ...order,
        totalAmount: parseFloat(order.totalAmount),
        items: Array.isArray(order.items) ? order.items.map(item => ({
          ...item,
          unitPrice: parseFloat(item.unitPrice),
          totalPrice: parseFloat(item.totalPrice)
        })) : [],
        createdAt: new Date(order.createdAt).toISOString(),
        updatedAt: new Date(order.updatedAt).toISOString()
      };

      res.json({
        success: true,
        data: formattedOrder
      });

    } catch (error) {
      console.error('Error getting order details:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener los detalles de la orden' 
      });
    }
};

// Funciones utilitarias para manejo de órdenes
const buildWhereConditions = (userId, status, startDate, endDate) => {
  let whereConditions = ['o."userId" = $1'];
  let queryParams = [userId];
  let paramCount = 1;

  if (status && status !== 'all') {
    paramCount++;
    whereConditions.push(`o.status = $${paramCount}`);
    queryParams.push(status);
  }

  if (startDate) {
    paramCount++;
    whereConditions.push(`o."createdAt" >= $${paramCount}`);
    queryParams.push(startDate);
  }

  if (endDate) {
    paramCount++;
    whereConditions.push(`o."createdAt" <= $${paramCount}`);
    queryParams.push(endDate + ' 23:59:59');
  }

  return {
    whereClause: whereConditions.join(' AND '),
    queryParams,
    paramCount
  };
};

const validateSortParams = (sortBy, sortOrder) => {
  const validSortFields = ['createdAt', 'totalAmount', 'status'];
  const validSortOrders = ['asc', 'desc'];
  return {
    safeSortBy: validSortFields.includes(sortBy) ? sortBy : 'createdAt',
    safeSortOrder: validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC'
  };
};

const buildOrdersQuery = (whereClause, safeSortBy, safeSortOrder, paramCount) => `
  SELECT 
    o.id,
    o.status,
    o."totalAmount",
    o."shippingAddress",
    o."paymentMethod",
    o.card_last4,
    o."createdAt",
    o."updatedAt",
    COUNT(oi.id) as items_count,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'productId', oi."productId",
          'productName', p.name,
          'productImage', p."imageUrl",
          'quantity', oi.quantity,
          'price', oi.price,
          'category', p.category
        ) ORDER BY p.name
      ) FILTER (WHERE oi.id IS NOT NULL), 
      '[]'::json
    ) as items
  FROM orders o
  LEFT JOIN order_items oi ON o.id = oi."orderId"
  LEFT JOIN products p ON oi."productId" = p.id
  WHERE ${whereClause}
  GROUP BY o.id, o.status, o."totalAmount", o."shippingAddress", 
           o."paymentMethod", o.card_last4, o."createdAt", o."updatedAt"
  ORDER BY o."${safeSortBy}" ${safeSortOrder}
  LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
`;

const formatOrders = (orders) => {
  return orders.map(order => ({
    ...order,
    totalAmount: parseFloat(order.totalAmount),
    items: Array.isArray(order.items) ? order.items : [],
    createdAt: new Date(order.createdAt).toISOString(),
    updatedAt: new Date(order.updatedAt).toISOString()
  }));
};

const buildPaginationData = (page, limit, totalRecords) => {
  const totalPages = Math.ceil(totalRecords / parseInt(limit));
  return {
    currentPage: parseInt(page),
    totalPages,
    totalRecords,
    limit: parseInt(limit),
    hasNextPage: parseInt(page) < totalPages,
    hasPrevPage: parseInt(page) > 1
  };
};

exports.getAdminOrders = async (req, res) => {
    try {
      const { 
        userId,
        page = 1, 
        limit = 10, 
        status = '', 
        startDate = '', 
        endDate = '',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const { whereClause, queryParams, paramCount } = buildWhereConditions(userId, status, startDate, endDate);
      const { safeSortBy, safeSortOrder } = validateSortParams(sortBy, sortOrder);
      
      const ordersQuery = buildOrdersQuery(whereClause, safeSortBy, safeSortOrder, paramCount);
      queryParams.push(parseInt(limit), offset);

      const countQuery = `
        SELECT COUNT(DISTINCT o.id) as total
        FROM orders o
        WHERE ${whereClause}
      `;

      const [ordersResult, countResult] = await Promise.all([
        pool.query(ordersQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2))
      ]);

      const totalRecords = parseInt(countResult.rows[0].total);
      const formattedOrders = formatOrders(ordersResult.rows);
      const pagination = buildPaginationData(page, limit, totalRecords);

      res.json({
        success: true,
        data: {
          orders: formattedOrders,
          pagination
        }
      });

    } catch (error) {
      console.error('Error getting user orders:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener las órdenes del usuario' 
      });
    }
};

exports.getUserOrders = async (req, res) => {
    try {
      const { 
        userId,
        page = 1, 
        limit = 10, 
        status = '', 
        startDate = '', 
        endDate = '',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const { whereClause, queryParams, paramCount } = buildWhereConditions(userId, status, startDate, endDate);
      const { safeSortBy, safeSortOrder } = validateSortParams(sortBy, sortOrder);
      
      const ordersQuery = buildOrdersQuery(whereClause, safeSortBy, safeSortOrder, paramCount);
      queryParams.push(parseInt(limit), offset);

      const countQuery = `
        SELECT COUNT(DISTINCT o.id) as total
        FROM orders o
        WHERE ${whereClause}
      `;

      const [ordersResult, countResult] = await Promise.all([
        pool.query(ordersQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2))
      ]);

      const totalRecords = parseInt(countResult.rows[0].total);
      const formattedOrders = formatOrders(ordersResult.rows);
      const pagination = buildPaginationData(page, limit, totalRecords);

      res.json({
        success: true,
        data: {
          orders: formattedOrders,
          pagination
        }
      });

    } catch (error) {
      console.error('Error getting user orders:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener las órdenes del usuario' 
      });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
      const userId = req.body.userId; // Obtener userId del token
      const orderId = req.params.orderId;

      // Verificar que la orden existe y pertenece al usuario
      const checkQuery = `
        SELECT id, status 
        FROM orders 
        WHERE id = $1 AND "userId" = $2
      `;

      const checkResult = await pool.query(checkQuery, [orderId, userId]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Orden no encontrada'
        });
      }

      const order = checkResult.rows[0];

      if (order.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Solo se pueden cancelar órdenes pendientes'
        });
      }

      // Actualizar el estado de la orden
      const updateQuery = `
        UPDATE orders 
        SET status = 'cancelled', "updatedAt" = NOW()
        WHERE id = $1 AND "userId" = $2
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [orderId, userId]);

      res.json({
        success: true,
        message: 'Orden cancelada exitosamente',
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al cancelar la orden' 
      });
    }
};