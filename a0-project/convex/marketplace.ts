import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

function makeCode(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 6)}-${Date.now().toString(36)}`.toUpperCase();
}

type DbCtx = { db: any };

type StoreDoc = {
  _id: any;
  storeCode: string;
  ownerCode: string;
  ownerAccountCode?: string;
  name: string;
  ownerName: string;
  status: 'active' | 'paused' | 'deleted';
};

type CustomerDoc = {
  _id: any;
  customerCode: string;
  name: string;
  phone?: string;
};

type AccountDoc = {
  _id: any;
  accountCode: string;
  name: string;
  role: 'admin' | 'assistant' | 'owner' | 'customer';
  createdByAdminCode?: string;
  storeCode?: string;
  ownerCode?: string;
  customerCode?: string;
};

async function findStoreByCode(ctx: DbCtx, storeCode: string): Promise<StoreDoc | null> {
  return await ctx.db
    .query('stores')
    .withIndex('by_storeCode', (q: any) => q.eq('storeCode', storeCode))
    .unique();
}

async function findCustomerByCode(ctx: DbCtx, customerCode: string): Promise<CustomerDoc | null> {
  return await ctx.db
    .query('customers')
    .withIndex('by_customerCode', (q: any) => q.eq('customerCode', customerCode))
    .unique();
}

async function findAccountByCode(ctx: DbCtx, accountCode: string): Promise<AccountDoc | null> {
  return await ctx.db
    .query('accounts')
    .withIndex('by_accountCode', (q: any) => q.eq('accountCode', accountCode))
    .unique();
}

function requireAdminCode(adminCode: string) {
  const clean = adminCode.trim();
  if (clean !== 'ADMIN-0001') {
    throw new Error('Invalid admin code');
  }
}

export const bootstrapAdmin = mutation({
  args: {
    adminCode: v.string(),
    name: v.string(),
  },
  returns: v.object({
    accountCode: v.string(),
  }),
  handler: async (ctx, args) => {
    requireAdminCode(args.adminCode);

    const existing = await ctx.db
      .query('accounts')
      .withIndex('by_role', (q: any) => q.eq('role', 'admin'))
      .unique();

    if (existing) {
      return { accountCode: existing.accountCode };
    }

    const accountCode = makeCode('ADMIN');
    await ctx.db.insert('accounts', {
      accountCode,
      name: args.name.trim(),
      role: 'admin',
    });

    return { accountCode };
  },
});

export const registerAccount = mutation({
  args: {
    name: v.string(),
    role: v.union(v.literal('owner'), v.literal('customer')),
    storeName: v.optional(v.string()),
    ownerName: v.optional(v.string()),
    storeCode: v.optional(v.string()),
    customerCode: v.optional(v.string()),
  },
  returns: v.object({
    accountCode: v.string(),
    storeCode: v.optional(v.string()),
    ownerCode: v.optional(v.string()),
    customerCode: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    if (args.role === 'owner') {
      const storeCode = args.storeCode?.trim() || makeCode('SHOP');
      const ownerCode = makeCode('OWNER');
      const accountCode = makeCode('OWNERACC');
      const storeName = args.storeName?.trim() || args.name.trim();
      const ownerName = args.ownerName?.trim() || args.name.trim();

      const existing = await findStoreByCode(ctx as DbCtx, storeCode);
      if (existing) {
        throw new Error('Store code already exists');
      }

      await ctx.db.insert('accounts', {
        accountCode,
        name: args.name.trim(),
        role: 'owner',
        storeCode,
        ownerCode,
      });
      await ctx.db.insert('stores', {
        storeCode,
        ownerCode,
        ownerAccountCode: accountCode,
        name: storeName,
        ownerName,
        status: 'active',
      });

      return { accountCode, storeCode, ownerCode };
    }

    const customerCode = args.customerCode?.trim() || makeCode('CUST');
    const accountCode = makeCode('CUSTACC');
    const existing = await findCustomerByCode(ctx as DbCtx, customerCode);
    if (existing) {
      throw new Error('Customer code already exists');
    }

    await ctx.db.insert('accounts', {
      accountCode,
      name: args.name.trim(),
      role: 'customer',
      customerCode,
    });
    await ctx.db.insert('customers', {
      customerCode,
      name: args.name.trim(),
    });

    return { accountCode, customerCode };
  },
});

export const loginAccount = mutation({
  args: {
    accountCode: v.string(),
    role: v.union(v.literal('admin'), v.literal('owner'), v.literal('customer')),
  },
  returns: v.union(
    v.object({
      accountCode: v.string(),
      role: v.literal('admin'),
      dashboard: v.literal('Admin'),
      name: v.string(),
    }),
    v.object({
      accountCode: v.string(),
      role: v.literal('owner'),
      dashboard: v.literal('ShopOwner'),
      name: v.string(),
      storeCode: v.string(),
      ownerCode: v.string(),
    }),
    v.object({
      accountCode: v.string(),
      role: v.literal('customer'),
      dashboard: v.literal('Customer'),
      name: v.string(),
      customerCode: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const account = await findAccountByCode(ctx as DbCtx, args.accountCode.trim());
    if (!account || account.role !== args.role) {
      throw new Error('Account not found');
    }

    if (account.role === 'admin') {
      return {
        accountCode: account.accountCode,
        role: 'admin' as const,
        dashboard: 'Admin' as const,
        name: account.name,
      };
    }

    if (account.role === 'owner') {
      const storeCode = account.storeCode;
      const ownerCode = account.ownerCode;
      if (!storeCode || !ownerCode) {
        throw new Error('Owner profile is incomplete');
      }
      return {
        accountCode: account.accountCode,
        role: 'owner' as const,
        dashboard: 'ShopOwner' as const,
        name: account.name,
        storeCode,
        ownerCode,
      };
    }

    const customerCode = account.customerCode;
    if (!customerCode) {
      throw new Error('Customer profile is incomplete');
    }
    return {
      accountCode: account.accountCode,
      role: 'customer' as const,
      dashboard: 'Customer' as const,
      name: account.name,
      customerCode,
    };
  },
});

export const createStore = mutation({
  args: {
    name: v.string(),
    ownerName: v.string(),
  },
  returns: v.object({
    storeCode: v.string(),
    ownerCode: v.string(),
  }),
  handler: async (ctx, args) => {
    const storeCode = makeCode('SHOP');
    const ownerCode = makeCode('OWNER');

    const storeId = await ctx.db.insert('stores', {
      storeCode,
      ownerCode,
      name: args.name.trim(),
      ownerName: args.ownerName.trim(),
      status: 'active',
    });

    const store = await ctx.db.get(storeId);
    return { storeCode: store!.storeCode, ownerCode };
  },
});

export const createCustomer = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
  },
  returns: v.object({
    customerCode: v.string(),
  }),
  handler: async (ctx, args) => {
    const customerCode = makeCode('CUST');
    await ctx.db.insert('customers', {
      customerCode,
      name: args.name.trim(),
      phone: args.phone?.trim() || undefined,
    });
    return { customerCode };
  },
});

export const addStoreCustomer = mutation({
  args: {
    storeCode: v.string(),
    ownerCode: v.string(),
    customerCode: v.string(),
    customerName: v.string(),
    phone: v.optional(v.string()),
  },
  returns: v.object({
    linked: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const store = await findStoreByCode(ctx as DbCtx, args.storeCode);
    if (!store || store.ownerCode !== args.ownerCode || store.status !== 'active') {
      throw new Error('Store not found or inactive');
    }

    let customer = await findCustomerByCode(ctx as DbCtx, args.customerCode);
    if (!customer) {
      const customerId = await ctx.db.insert('customers', {
        customerCode: args.customerCode,
        name: args.customerName.trim(),
        phone: args.phone?.trim() || undefined,
      });
      customer = await ctx.db.get(customerId);
    }

    const existingLink = await ctx.db
      .query('storeCustomers')
      .withIndex('by_storeId_and_customerId', (q: any) => q.eq('storeId', store._id).eq('customerId', customer!._id))
      .unique();

    if (!existingLink) {
      await ctx.db.insert('storeCustomers', {
        storeId: store._id,
        customerId: customer!._id,
      });
    }

    return { linked: true };
  },
});

export const listStoreCustomers = query({
  args: {
    storeCode: v.string(),
    ownerCode: v.string(),
  },
  returns: v.array(
    v.object({
      customerCode: v.string(),
      name: v.string(),
      phone: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const store = await findStoreByCode(ctx as DbCtx, args.storeCode);
    if (!store || store.ownerCode !== args.ownerCode) {
      return [];
    }

    const links = await ctx.db
      .query('storeCustomers')
      .withIndex('by_storeId', (q: any) => q.eq('storeId', store._id))
      .collect();

    const customers: Array<{ customerCode: string; name: string; phone?: string }> = [];
    for (const link of links) {
      const customer = await ctx.db.get(link.customerId);
      if (!customer) continue;
      customers.push({
        customerCode: customer.customerCode,
        name: customer.name,
        phone: customer.phone,
      });
    }

    return customers;
  },
});

export const pauseStore = mutation({
  args: {
    adminCode: v.string(),
    storeCode: v.string(),
  },
  returns: v.object({
    paused: v.boolean(),
  }),
  handler: async (ctx, args) => {
    requireAdminCode(args.adminCode);
    const store = await findStoreByCode(ctx as DbCtx, args.storeCode);
    if (!store) {
      throw new Error('Store not found');
    }
    await ctx.db.patch(store._id, { status: 'paused' });
    return { paused: true };
  },
});

export const deleteStore = mutation({
  args: {
    adminCode: v.string(),
    storeCode: v.string(),
  },
  returns: v.object({
    deleted: v.boolean(),
  }),
  handler: async (ctx, args) => {
    requireAdminCode(args.adminCode);
    const store = await findStoreByCode(ctx as DbCtx, args.storeCode);
    if (!store) {
      throw new Error('Store not found');
    }
    await ctx.db.patch(store._id, { status: 'deleted' });
    return { deleted: true };
  },
});

export const addAssistantAccount = mutation({
  args: {
    adminCode: v.string(),
    name: v.string(),
  },
  returns: v.object({
    accountCode: v.string(),
  }),
  handler: async (ctx, args) => {
    requireAdminCode(args.adminCode);
    const accountCode = makeCode('ASST');
    await ctx.db.insert('accounts', {
      accountCode,
      name: args.name.trim(),
      role: 'assistant',
      createdByAdminCode: args.adminCode.trim(),
    });
    return { accountCode };
  },
});

export const publishStoreSnapshot = mutation({
  args: {
    storeCode: v.string(),
    ownerCode: v.string(),
    name: v.string(),
    ownerName: v.string(),
    products: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        size: v.string(),
        barcode: v.string(),
        stock: v.number(),
        price: v.number(),
      }),
    ),
  },
  returns: v.object({
    productCount: v.number(),
  }),
  handler: async (ctx, args) => {
    let store = await findStoreByCode(ctx as DbCtx, args.storeCode);
    if (!store) {
      const storeId = await ctx.db.insert('stores', {
        storeCode: args.storeCode,
        ownerCode: args.ownerCode,
        name: args.name.trim(),
        ownerName: args.ownerName.trim(),
        status: 'active',
      });
      store = await ctx.db.get(storeId);
    }

    if (!store) {
      throw new Error('Store not found');
    }

    if (store.ownerCode !== args.ownerCode || store.status !== 'active') {
      throw new Error('Owner code does not match this store');
    }

    const currentProducts = await ctx.db
      .query('products')
      .withIndex('by_storeId', (q: any) => q.eq('storeId', store._id))
      .collect();

    for (const product of currentProducts) {
      await ctx.db.delete(product._id);
    }

    for (const product of args.products) {
      await ctx.db.insert('products', {
        storeId: store._id,
        name: product.name,
        size: product.size || undefined,
        barcode: product.barcode,
        stock: product.stock,
        price: product.price,
      });
    }

    const linkedCustomers = await ctx.db
      .query('storeCustomers')
      .withIndex('by_storeId', (q: any) => q.eq('storeId', store._id))
      .collect();

    for (const link of linkedCustomers) {
      await ctx.db.insert('notifications', {
        storeId: store._id,
        customerId: link.customerId,
        title: `${store.name} updated`,
        body: 'Prices and stock were updated in your shop view.',
        read: false,
      });
    }

    return { productCount: args.products.length };
  },
});

export const listCustomerStores = query({
  args: {
    customerCode: v.string(),
  },
  returns: v.array(
    v.object({
      storeCode: v.string(),
      name: v.string(),
      ownerName: v.string(),
      productCount: v.number(),
      status: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const customer = await findCustomerByCode(ctx as DbCtx, args.customerCode);
    if (!customer) {
      return [];
    }

    const links = await ctx.db
      .query('storeCustomers')
      .withIndex('by_customerId', (q: any) => q.eq('customerId', customer._id))
      .collect();

    const result: Array<{
      storeCode: string;
      name: string;
      ownerName: string;
      productCount: number;
      status: string;
    }> = [];

    for (const link of links) {
      const store = await ctx.db.get(link.storeId);
      if (!store) continue;
      const products = await ctx.db
        .query('products')
        .withIndex('by_storeId', (q: any) => q.eq('storeId', store._id))
        .collect();
      result.push({
        storeCode: store.storeCode,
        name: store.name,
        ownerName: store.ownerName,
        productCount: products.length,
        status: store.status,
      });
    }

    return result;
  },
});

export const listCustomerNotifications = query({
  args: {
    customerCode: v.string(),
  },
  returns: v.array(
    v.object({
      title: v.string(),
      body: v.string(),
      storeCode: v.string(),
      storeName: v.string(),
      read: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const customer = await findCustomerByCode(ctx as DbCtx, args.customerCode);
    if (!customer) {
      return [];
    }

    const notifications = await ctx.db
      .query('notifications')
      .withIndex('by_customerId', (q: any) => q.eq('customerId', customer._id))
      .order('desc')
      .take(10);

    const result: Array<{
      title: string;
      body: string;
      storeCode: string;
      storeName: string;
      read: boolean;
    }> = [];

    for (const notification of notifications) {
      const store = await ctx.db.get(notification.storeId);
      if (!store) continue;
      result.push({
        title: notification.title,
        body: notification.body,
        storeCode: store.storeCode,
        storeName: store.name,
        read: notification.read,
      });
    }

    return result;
  },
});

export const getStoreCatalog = query({
  args: {
    storeCode: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      storeCode: v.string(),
      name: v.string(),
      ownerName: v.string(),
      productCount: v.number(),
      status: v.string(),
      products: v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          size: v.string(),
          barcode: v.string(),
          stock: v.number(),
          price: v.number(),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const store = await findStoreByCode(ctx as DbCtx, args.storeCode);
    if (!store || store.status === 'deleted') {
      return null;
    }

    const products = await ctx.db
      .query('products')
      .withIndex('by_storeId', (q: any) => q.eq('storeId', store._id))
      .collect();

    return {
      storeCode: store.storeCode,
      name: store.name,
      ownerName: store.ownerName,
      productCount: products.length,
      status: store.status,
      products: products.map((product: any) => ({
        id: product._id,
        name: product.name,
        size: product.size || '',
        barcode: product.barcode,
        stock: product.stock,
        price: product.price,
      })),
    };
  },
});

export const sendCustomerMessage = mutation({
  args: {
    storeCode: v.string(),
    customerCode: v.string(),
    text: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const store = await findStoreByCode(ctx as DbCtx, args.storeCode);
    const customer = await findCustomerByCode(ctx as DbCtx, args.customerCode);
    if (!store || !customer) {
      throw new Error('Store or customer not found');
    }

    await ctx.db.insert('messages', {
      storeId: store._id,
      customerId: customer._id,
      sender: 'customer',
      text: args.text.trim(),
    });

    await ctx.db.insert('notifications', {
      storeId: store._id,
      customerId: customer._id,
      title: `Message sent to ${store.name}`,
      body: args.text.trim(),
      read: false,
    });

    return null;
  },
});

export const sendStoreMessage = mutation({
  args: {
    storeCode: v.string(),
    ownerCode: v.string(),
    customerCode: v.string(),
    text: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const store = await findStoreByCode(ctx as DbCtx, args.storeCode);
    if (!store || store.ownerCode !== args.ownerCode || store.status !== 'active') {
      throw new Error('Store not found or owner code does not match');
    }

    const customer = await findCustomerByCode(ctx as DbCtx, args.customerCode);
    if (!customer) {
      throw new Error('Customer not found');
    }

    await ctx.db.insert('messages', {
      storeId: store._id,
      customerId: customer._id,
      sender: 'store',
      text: args.text.trim(),
    });

    await ctx.db.insert('notifications', {
      storeId: store._id,
      customerId: customer._id,
      title: `New message from ${store.name}`,
      body: args.text.trim(),
      read: false,
    });

    return null;
  },
});