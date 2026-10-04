import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// PRODUCTS
export const addProduct = mutation({
  args: {
    storeId: v.id('stores'),
    name: v.string(),
    price: v.number(),
    quantity: v.number(),
    description: v.optional(v.string()),
    barcode: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean(), productId: v.id('products') }),
  handler: async (ctx, args) => {
    const productId = await ctx.db.insert('products', {
      storeId: args.storeId,
      name: args.name,
      price: args.price,
      quantity: args.quantity,
      description: args.description,
      barcode: args.barcode,
      category: args.category,
      createdAt: Date.now(),
    });
    return { success: true, productId };
  },
});

export const getStoreProducts = query({
  args: { storeId: v.id('stores') },
  returns: v.array(v.object({
    id: v.id('products'),
    name: v.string(),
    price: v.number(),
    quantity: v.number(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
  })),
  handler: async (ctx, { storeId }) => {
    const products = await ctx.db
      .query('products')
      .withIndex('by_storeId', (q: any) => q.eq('storeId', storeId))
      .collect();
    return products.map(p => ({
      id: p._id,
      name: p.name,
      price: p.price,
      quantity: p.quantity,
      description: p.description,
      category: p.category,
    }));
  },
});

// SALES
export const recordSale = mutation({
  args: {
    storeId: v.id('stores'),
    productId: v.id('products'),
    quantity: v.number(),
    paymentType: v.union(v.literal('cash'), v.literal('debt')),
    customerId: v.optional(v.id('customers')),
  },
  returns: v.object({ success: v.boolean(), saleId: v.id('sales') }),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.quantity < args.quantity) {
      throw new Error('Insufficient stock');
    }

    const totalPrice = product.price * args.quantity;
    
    const saleId = await ctx.db.insert('sales', {
      storeId: args.storeId,
      productId: args.productId,
      customerId: args.customerId,
      quantity: args.quantity,
      totalPrice: totalPrice,
      paymentType: args.paymentType,
      saleDate: Date.now(),
    });

    // Update product quantity
    await ctx.db.patch(args.productId, {
      quantity: product.quantity - args.quantity,
    });

    return { success: true, saleId };
  },
});

export const getStoreSales = query({
  args: { storeId: v.id('stores') },
  returns: v.array(v.object({
    id: v.id('sales'),
    productName: v.string(),
    quantity: v.number(),
    totalPrice: v.number(),
    paymentType: v.string(),
    saleDate: v.number(),
  })),
  handler: async (ctx, { storeId }) => {
    const sales = await ctx.db
      .query('sales')
      .withIndex('by_storeId', (q: any) => q.eq('storeId', storeId))
      .order('desc')
      .collect();

    const results = [];
    for (const sale of sales) {
      const product = await ctx.db.get(sale.productId);
      if (product) {
        results.push({
          id: sale._id,
          productName: product.name,
          quantity: sale.quantity,
          totalPrice: sale.totalPrice,
          paymentType: sale.paymentType,
          saleDate: sale.saleDate,
        });
      }
    }
    return results;
  },
});

// SHOPS FOR CUSTOMERS
export const getAllShops = query({
  returns: v.array(v.object({
    id: v.id('stores'),
    name: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    productCount: v.number(),
    rating: v.number(),
  })),
  handler: async (ctx) => {
    const stores = await ctx.db
      .query('stores')
      .withIndex('by_status', (q: any) => q.eq('status', 'active'))
      .collect();

    const results = [];
    for (const store of stores) {
      const productCount = await ctx.db
        .query('products')
        .withIndex('by_storeId', (q: any) => q.eq('storeId', store._id))
        .count();

      results.push({
        id: store._id,
        name: store.name,
        address: store.address,
        city: store.city,
        productCount: productCount,
        rating: 4.5, // Default rating
      });
    }
    return results;
  },
});

export const getShopProducts = query({
  args: { storeId: v.id('stores') },
  returns: v.array(v.object({
    id: v.id('products'),
    name: v.string(),
    price: v.number(),
    quantity: v.number(),
    category: v.optional(v.string()),
  })),
  handler: async (ctx, { storeId }) => {
    const products = await ctx.db
      .query('products')
      .withIndex('by_storeId', (q: any) => q.eq('storeId', storeId))
      .collect();

    return products.map(p => ({
      id: p._id,
      name: p.name,
      price: p.price,
      quantity: p.quantity,
      category: p.category,
    }));
  },
});
