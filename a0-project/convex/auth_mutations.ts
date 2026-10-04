import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Simple hash function for passwords
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

function makeToken(): string {
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function makeInviteCode(): string {
  return `CUST-${Math.random().toString(36).slice(2, 7)}-${Date.now().toString(36).slice(-4)}`.toUpperCase();
}

export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    userType: v.union(v.literal('shopowner'), v.literal('customer')),
    displayName: v.optional(v.string()),
    phone: v.optional(v.string()),
    shopAddress: v.optional(v.string()),
    shopLatitude: v.optional(v.number()),
    shopLongitude: v.optional(v.number()),
    inviteCode: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    userId: v.optional(v.id('users')),
    userType: v.optional(v.union(v.literal('shopowner'), v.literal('customer'))),
    approvalStatus: v.optional(v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected'))),
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
    phone: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { email, password, userType, displayName, phone, shopAddress, shopLatitude, shopLongitude, inviteCode }) => {
    if (userType === 'shopowner' && !shopAddress?.trim() && (shopLatitude === undefined || shopLongitude === undefined)) {
      throw new Error('Shop location required');
    }

    // Check if user already exists
    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (q: any) => q.eq('email', email.toLowerCase()))
      .first();

    if (existing) {
      return {
        success: false,
        error: 'User already exists',
      };
    }

    const approvalStatus = userType === 'shopowner' ? 'pending' : 'approved';
    const normalizedInviteCode = inviteCode?.trim().toUpperCase();
    const invite = normalizedInviteCode
      ? await ctx.db
          .query('customerInvites')
          .withIndex('by_inviteCode', (q: any) => q.eq('inviteCode', normalizedInviteCode))
          .first()
      : null;

    if (userType === 'customer' && normalizedInviteCode && (!invite || invite.status !== 'sent')) {
      throw new Error('Invalid invite code');
    }

    // Create user
    const userId = await ctx.db.insert('users', {
      email: email.toLowerCase(),
      password: simpleHash(password),
      displayName: displayName?.trim() || undefined,
      phone: phone?.trim() || undefined,
      userType,
      approvalStatus,
      shopAddress: userType === 'shopowner' ? shopAddress?.trim() : undefined,
      shopLatitude: userType === 'shopowner' ? shopLatitude : undefined,
      shopLongitude: userType === 'shopowner' ? shopLongitude : undefined,
      appFeeAmount: userType === 'shopowner' ? 200 : undefined,
      paymentNotificationStatus: userType === 'shopowner' ? 'not_submitted' : undefined,
    });

    if (userType === 'customer' && invite) {
      const normalizedEmail = email.toLowerCase().trim();
      const customerName = displayName?.trim() || invite.customerName;
      const customerPhone = phone?.trim() || invite.customerPhone;
      const existingShopCustomer = await ctx.db
        .query('shopCustomers')
        .withIndex('by_ownerId_and_customerEmail', (q: any) => q.eq('ownerId', invite.ownerId).eq('customerEmail', normalizedEmail))
        .first();

      if (existingShopCustomer) {
        await ctx.db.patch(existingShopCustomer._id, {
          customerName,
          customerPhone,
          status: 'active',
        });
      } else {
        await ctx.db.insert('shopCustomers', {
          ownerId: invite.ownerId,
          customerEmail: normalizedEmail,
          customerName,
          customerPhone,
          status: 'active',
          joinedAt: Date.now(),
        });
      }

      await ctx.db.patch(invite._id, {
        status: 'accepted',
        acceptedAt: Date.now(),
        acceptedCustomerEmail: normalizedEmail,
      });
    }

    return { 
      success: true, 
      userId,
      userType,
      approvalStatus,
      email: email.toLowerCase().trim(),
      displayName: displayName?.trim() || undefined,
      phone: phone?.trim() || undefined,
    };
  },
});

export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    userId: v.id('users'),
    userType: v.union(v.literal('shopowner'), v.literal('customer'), v.literal('admin')),
    approvalStatus: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),
    email: v.string(),
    displayName: v.optional(v.string()),
    phone: v.optional(v.string()),
  }),
  handler: async (ctx, { email, password }) => {
    // Find user
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q: any) => q.eq('email', email.toLowerCase()))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    if (user.password !== simpleHash(password)) {
      throw new Error('Invalid password');
    }

    return {
      success: true,
      userId: user._id,
      userType: user.userType,
      approvalStatus: user.approvalStatus ?? 'approved',
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
    };
  },
});

export const listPendingShopOwners = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id('users'),
      email: v.string(),
      approvalStatus: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),
      shopAddress: v.optional(v.string()),
      shopLatitude: v.optional(v.number()),
      shopLongitude: v.optional(v.number()),
      appFeeAmount: v.optional(v.number()),
      paymentSubmittedAt: v.optional(v.number()),
      paymentNotificationStatus: v.optional(v.union(v.literal('not_submitted'), v.literal('submitted'))),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const users = await ctx.db
      .query('users')
      .withIndex('by_userType_and_approvalStatus', (q: any) =>
        q.eq('userType', 'shopowner').eq('approvalStatus', 'pending')
      )
      .collect();

    return users.map((user: any) => ({
      id: user._id,
      email: user.email,
      approvalStatus: user.approvalStatus ?? 'pending',
      shopAddress: user.shopAddress,
      shopLatitude: user.shopLatitude,
      shopLongitude: user.shopLongitude,
      appFeeAmount: user.appFeeAmount ?? 200,
      paymentSubmittedAt: user.paymentSubmittedAt,
      paymentNotificationStatus: user.paymentNotificationStatus ?? 'not_submitted',
      createdAt: user._creationTime,
    }));
  },
});

export const notifyShopOwnerPaid = mutation({
  args: {
    userId: v.id('users'),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user || user.userType !== 'shopowner') {
      throw new Error('Shop owner not found');
    }

    await ctx.db.patch(userId, {
      appFeeAmount: 200,
      paymentSubmittedAt: Date.now(),
      paymentNotificationStatus: 'submitted',
    });

    return { success: true };
  },
});

export const reviewShopOwner = mutation({
  args: {
    userId: v.id('users'),
    approved: v.boolean(),
    rejectionReason: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { userId, approved, rejectionReason }) => {
    const user = await ctx.db.get(userId);
    if (!user || user.userType !== 'shopowner') {
      throw new Error('Shop owner not found');
    }

    if (approved && user.paymentNotificationStatus !== 'submitted') {
      throw new Error('Payment notification required before approval');
    }

    await ctx.db.patch(userId, {
      approvalStatus: approved ? 'approved' : 'rejected',
      approvedAt: approved ? Date.now() : undefined,
      rejectedAt: approved ? undefined : Date.now(),
      rejectionReason: approved ? undefined : rejectionReason,
    });

    return { success: true };
  },
});

export const createOwnerStore = mutation({
  args: {
    ownerId: v.id('users'),
    name: v.string(),
    address: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    storeId: v.id('stores'),
    storeCode: v.string(),
  }),
  handler: async (ctx, { ownerId, name, address, latitude, longitude }) => {
    const owner = await ctx.db.get(ownerId);
    const ownerIsApproved = owner?.approvalStatus === 'approved' || owner?.approvalStatus === undefined;
    if (!owner || owner.userType !== 'shopowner' || !ownerIsApproved) {
      throw new Error('Approved shop owner required');
    }

    const storeCount = await ctx.db
      .query('stores')
      .withIndex('by_ownerId', (q: any) => q.eq('ownerId', ownerId))
      .collect();
    const storeCode = `STORE${String(storeCount.length + 1).padStart(3, '0')}`;

    const storeId = await ctx.db.insert('stores', {
      name: name.trim(),
      ownerId,
      ownerCode: owner.email,
      storeCode,
      ownerName: owner.email,
      status: 'active',
      address: address.trim(),
      latitude,
      longitude,
      paymentStatus: 'verified',
      createdAt: Date.now(),
    });

    return { success: true, storeId, storeCode };
  },
});

export const listOwnerStores = query({
  args: { ownerId: v.id('users') },
  returns: v.array(v.object({
    id: v.id('stores'),
    name: v.string(),
    code: v.string(),
    address: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    status: v.union(v.literal('active'), v.literal('paused'), v.literal('deleted')),
  })),
  handler: async (ctx, { ownerId }) => {
    const stores = await ctx.db
      .query('stores')
      .withIndex('by_ownerId', (q: any) => q.eq('ownerId', ownerId))
      .collect();

    return stores.map((store: any) => ({
      id: store._id,
      name: store.name,
      code: store.storeCode,
      address: store.address,
      latitude: store.latitude,
      longitude: store.longitude,
      status: store.status,
    }));
  },
});

export const listDiscoverableShops = query({
  args: {},
  returns: v.array(v.object({
    id: v.string(),
    ownerId: v.id('users'),
    storeId: v.optional(v.id('stores')),
    name: v.string(),
    email: v.string(),
    address: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  })),
  handler: async (ctx) => {
    const approvedShopOwners = await ctx.db
      .query('users')
      .withIndex('by_userType_and_approvalStatus', (q: any) =>
        q.eq('userType', 'shopowner').eq('approvalStatus', 'approved')
      )
      .collect();
    const allUsers = await ctx.db.query('users').collect();
    const legacyShopOwners = allUsers.filter((user: any) => user.userType === 'shopowner' && user.approvalStatus === undefined);
    const shopOwners = [...approvedShopOwners, ...legacyShopOwners];

    const ownerShops = shopOwners.map((owner: any) => ({
      id: String(owner._id),
      ownerId: owner._id,
      storeId: undefined,
      name: owner.shopAddress ? `Shop near ${owner.shopAddress}` : 'Approved shop',
      email: owner.email,
      address: owner.shopAddress,
      latitude: owner.shopLatitude,
      longitude: owner.shopLongitude,
    }));

    const stores = await ctx.db
      .query('stores')
      .withIndex('by_status', (q: any) => q.eq('status', 'active'))
      .collect();

    const savedStores = stores
      .filter((store: any) => store.ownerId !== undefined)
      .map((store: any) => ({
        id: String(store._id),
        ownerId: store.ownerId,
        storeId: store._id,
        name: store.name,
        email: store.ownerName ?? store.ownerCode,
        address: store.address,
        latitude: store.latitude,
        longitude: store.longitude,
      }));

    return [...savedStores, ...ownerShops];
  },
});

export const joinShopAsCustomer = mutation({
  args: {
    customerEmail: v.string(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    ownerId: v.id('users'),
    storeId: v.optional(v.id('stores')),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { customerEmail, customerName, customerPhone, ownerId, storeId }) => {
    const owner = await ctx.db.get(ownerId);
    const ownerIsApproved = owner?.approvalStatus === 'approved' || owner?.approvalStatus === undefined;
    if (!owner || owner.userType !== 'shopowner' || !ownerIsApproved) {
      throw new Error('Shop owner not available');
    }

    if (storeId) {
      const store = await ctx.db.get(storeId);
      if (!store || store.ownerId !== ownerId || store.status !== 'active') {
        throw new Error('Store not available');
      }
    }

    const normalizedEmail = customerEmail.toLowerCase().trim();
    const existing = await ctx.db
      .query('shopCustomers')
      .withIndex('by_ownerId_and_customerEmail', (q: any) => q.eq('ownerId', ownerId).eq('customerEmail', normalizedEmail))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        customerName: customerName.trim(),
        customerPhone: customerPhone?.trim() || existing.customerPhone,
        storeId: storeId ?? existing.storeId,
        status: 'active',
      });
      return { success: true };
    }

    await ctx.db.insert('shopCustomers', {
      ownerId,
      storeId,
      customerEmail: normalizedEmail,
      customerName: customerName.trim(),
      customerPhone: customerPhone?.trim() || undefined,
      status: 'active',
      joinedAt: Date.now(),
    });

    return { success: true };
  },
});

export const listShopCustomers = query({
  args: { ownerId: v.id('users') },
  returns: v.array(v.object({
    id: v.id('shopCustomers'),
    customerEmail: v.string(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    joinedAt: v.number(),
  })),
  handler: async (ctx, { ownerId }) => {
    const customers = await ctx.db
      .query('shopCustomers')
      .withIndex('by_ownerId_and_status', (q: any) => q.eq('ownerId', ownerId).eq('status', 'active'))
      .order('desc')
      .collect();

    return customers.map((customer: any) => ({
      id: customer._id,
      customerEmail: customer.customerEmail,
      customerName: customer.customerName,
      customerPhone: customer.customerPhone,
      joinedAt: customer.joinedAt,
    }));
  },
});

export const requestPasswordReset = mutation({
  args: {
    email: v.string(),
  },
  returns: v.object({ success: v.boolean(), resetLink: v.optional(v.string()) }),
  handler: async (ctx, { email }) => {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q: any) => q.eq('email', normalizedEmail))
      .first();

    // Always return success so people cannot check which emails exist.
    if (!user) {
      return { success: true };
    }

    const token = makeToken();
    const tokenHash = simpleHash(token);
    await ctx.db.insert('passwordResetRequests', {
      email: normalizedEmail,
      userId: user._id,
      tokenHash,
      status: 'pending',
      requestedAt: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    return { success: true, resetLink: `spazasmart://reset-password?token=${token}` };
  },
});

export const resetPasswordWithToken = mutation({
  args: {
    token: v.string(),
    newPassword: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { token, newPassword }) => {
    if (newPassword.trim().length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const tokenHash = simpleHash(token.trim());
    const request = await ctx.db
      .query('passwordResetRequests')
      .withIndex('by_tokenHash', (q: any) => q.eq('tokenHash', tokenHash))
      .first();

    if (!request || request.status !== 'pending' || !request.userId || !request.expiresAt || request.expiresAt < Date.now()) {
      throw new Error('Reset link is invalid or expired');
    }

    await ctx.db.patch(request.userId, {
      password: simpleHash(newPassword),
    });

    await ctx.db.patch(request._id, {
      status: 'completed',
      resolvedAt: Date.now(),
    });

    return { success: true };
  },
});

export const createCustomerInvite = mutation({
  args: {
    ownerId: v.id('users'),
    customerEmail: v.string(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean(), inviteLink: v.string(), inviteCode: v.string() }),
  handler: async (ctx, { ownerId, customerEmail, customerName, customerPhone }) => {
    const owner = await ctx.db.get(ownerId);
    const ownerIsApproved = owner?.approvalStatus === 'approved' || owner?.approvalStatus === undefined;
    if (!owner || owner.userType !== 'shopowner' || !ownerIsApproved) {
      throw new Error('Approved shop owner required');
    }

    const inviteCode = makeInviteCode();
    const normalizedEmail = customerEmail.toLowerCase().trim();
    await ctx.db.insert('customerInvites', {
      ownerId,
      customerEmail: normalizedEmail,
      customerName: customerName.trim(),
      customerPhone: customerPhone?.trim() || undefined,
      inviteCode,
      status: 'sent',
      createdAt: Date.now(),
    });

    return {
      success: true,
      inviteCode,
      inviteLink: `spazasmart://signup-customer?invite=${inviteCode}`,
    };
  },
});

export const createPurchaseEntry = mutation({
  args: {
    ownerId: v.id('users'),
    customerEmail: v.string(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    amount: v.number(),
    items: v.string(),
    paymentType: v.union(v.literal('cash'), v.literal('debt')),
  },
  returns: v.object({ success: v.boolean(), purchaseId: v.id('purchaseEntries') }),
  handler: async (ctx, args) => {
    const owner = await ctx.db.get(args.ownerId);
    const ownerIsApproved = owner?.approvalStatus === 'approved' || owner?.approvalStatus === undefined;
    if (!owner || owner.userType !== 'shopowner' || !ownerIsApproved) {
      throw new Error('Approved shop owner required');
    }

    const normalizedCustomerEmail = args.customerEmail.toLowerCase().trim();
    const joinedCustomer = await ctx.db
      .query('shopCustomers')
      .withIndex('by_ownerId_and_customerEmail', (q: any) => q.eq('ownerId', args.ownerId).eq('customerEmail', normalizedCustomerEmail))
      .first();

    if (!joinedCustomer || joinedCustomer.status !== 'active') {
      throw new Error('Customer must join this shop before purchases can be recorded');
    }

    const purchaseId = await ctx.db.insert('purchaseEntries', {
      ownerId: args.ownerId,
      customerEmail: normalizedCustomerEmail,
      customerName: joinedCustomer.customerName,
      customerPhone: joinedCustomer.customerPhone ?? args.customerPhone?.trim(),
      amount: args.amount,
      items: args.items.trim(),
      paymentType: args.paymentType,
      createdAt: Date.now(),
    });

    return { success: true, purchaseId };
  },
});

export const createDebtEntry = mutation({
  args: {
    ownerId: v.id('users'),
    customerEmail: v.string(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    amount: v.number(),
    items: v.string(),
    dueDate: v.string(),
  },
  returns: v.object({ success: v.boolean(), debtId: v.id('debtEntries') }),
  handler: async (ctx, args) => {
    const owner = await ctx.db.get(args.ownerId);
    const ownerIsApproved = owner?.approvalStatus === 'approved' || owner?.approvalStatus === undefined;
    if (!owner || owner.userType !== 'shopowner' || !ownerIsApproved) {
      throw new Error('Approved shop owner required');
    }

    const normalizedCustomerEmail = args.customerEmail.toLowerCase().trim();
    const joinedCustomer = await ctx.db
      .query('shopCustomers')
      .withIndex('by_ownerId_and_customerEmail', (q: any) => q.eq('ownerId', args.ownerId).eq('customerEmail', normalizedCustomerEmail))
      .first();

    if (!joinedCustomer || joinedCustomer.status !== 'active') {
      throw new Error('Customer must join this shop before debt can be allocated');
    }

    const debtId = await ctx.db.insert('debtEntries', {
      ownerId: args.ownerId,
      customerEmail: normalizedCustomerEmail,
      customerName: joinedCustomer.customerName,
      customerPhone: joinedCustomer.customerPhone ?? args.customerPhone?.trim(),
      amount: args.amount,
      items: args.items.trim(),
      dueDate: args.dueDate,
      status: 'open',
      createdAt: Date.now(),
    });

    return { success: true, debtId };
  },
});

export const listOwnerDebts = query({
  args: { ownerId: v.id('users') },
  returns: v.array(v.object({
    id: v.id('debtEntries'),
    customerEmail: v.string(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    amount: v.number(),
    items: v.string(),
    dueDate: v.string(),
    status: v.union(v.literal('open'), v.literal('paid')),
    createdAt: v.number(),
  })),
  handler: async (ctx, { ownerId }) => {
    const debts = await ctx.db
      .query('debtEntries')
      .withIndex('by_ownerId', (q: any) => q.eq('ownerId', ownerId))
      .order('desc')
      .collect();

    return debts.map((debt: any) => ({
      id: debt._id,
      customerEmail: debt.customerEmail,
      customerName: debt.customerName,
      customerPhone: debt.customerPhone,
      amount: debt.amount,
      items: debt.items,
      dueDate: debt.dueDate,
      status: debt.status,
      createdAt: debt.createdAt,
    }));
  },
});

export const listCustomerPurchases = query({
  args: { customerEmail: v.string() },
  returns: v.array(v.object({
    id: v.id('purchaseEntries'),
    shopOwnerEmail: v.string(),
    customerName: v.string(),
    amount: v.number(),
    items: v.string(),
    paymentType: v.union(v.literal('cash'), v.literal('debt')),
    createdAt: v.number(),
  })),
  handler: async (ctx, { customerEmail }) => {
    const normalizedEmail = customerEmail.toLowerCase().trim();
    const purchases = await ctx.db
      .query('purchaseEntries')
      .withIndex('by_customerEmail', (q: any) => q.eq('customerEmail', normalizedEmail))
      .order('desc')
      .collect();

    const result = [];
    for (const purchase of purchases) {
      const owner = await ctx.db.get(purchase.ownerId);
      result.push({
        id: purchase._id,
        shopOwnerEmail: owner?.email ?? 'Shop owner',
        customerName: purchase.customerName,
        amount: purchase.amount,
        items: purchase.items,
        paymentType: purchase.paymentType,
        createdAt: purchase.createdAt,
      });
    }

    return result;
  },
});

export const listCustomerDebts = query({
  args: { customerEmail: v.string() },
  returns: v.array(v.object({
    id: v.id('debtEntries'),
    shopOwnerEmail: v.string(),
    customerName: v.string(),
    amount: v.number(),
    items: v.string(),
    dueDate: v.string(),
    status: v.union(v.literal('open'), v.literal('paid')),
    createdAt: v.number(),
  })),
  handler: async (ctx, { customerEmail }) => {
    const normalizedEmail = customerEmail.toLowerCase().trim();
    const debts = await ctx.db
      .query('debtEntries')
      .withIndex('by_customerEmail', (q: any) => q.eq('customerEmail', normalizedEmail))
      .order('desc')
      .collect();

    const result = [];
    for (const debt of debts) {
      const owner = await ctx.db.get(debt.ownerId);
      result.push({
        id: debt._id,
        shopOwnerEmail: owner?.email ?? 'Shop owner',
        customerName: debt.customerName,
        amount: debt.amount,
        items: debt.items,
        dueDate: debt.dueDate,
        status: debt.status,
        createdAt: debt.createdAt,
      });
    }

    return result;
  },
});

export const signOut = mutation({
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx) => {
    return { success: true };
  },
});

export const getUserIdentity = query({
  returns: v.null(),
  handler: async (ctx) => {
    return await ctx.auth.getUserIdentity();
  },
});