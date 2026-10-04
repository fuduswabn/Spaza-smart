import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    email: v.string(),
    password: v.string(),
    displayName: v.optional(v.string()),
    phone: v.optional(v.string()),
    userType: v.union(v.literal('shopowner'), v.literal('customer'), v.literal('admin')),
    approvalStatus: v.optional(v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected'))),
    shopAddress: v.optional(v.string()),
    shopLatitude: v.optional(v.number()),
    shopLongitude: v.optional(v.number()),
    appFeeAmount: v.optional(v.number()),
    paymentSubmittedAt: v.optional(v.number()),
    paymentNotificationStatus: v.optional(v.union(v.literal('not_submitted'), v.literal('submitted'))),
    approvedAt: v.optional(v.number()),
    rejectedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
  }).index('by_email', ['email']).index('by_userType_and_approvalStatus', ['userType', 'approvalStatus']),
  
  stores: defineTable({
    name: v.string(),
    ownerCode: v.string(),
    ownerId: v.optional(v.id('users')),
    ownerAccountCode: v.optional(v.string()),
    storeCode: v.string(),
    ownerName: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('paused'), v.literal('deleted')),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    paymentStatus: v.optional(v.union(v.literal('pending'), v.literal('verified'), v.literal('rejected'))),
    createdAt: v.optional(v.number()),
  })
    .index('by_ownerCode', ['ownerCode'])
    .index('by_ownerId', ['ownerId'])
    .index('by_storeCode', ['storeCode'])
    .index('by_status', ['status']),

  customers: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.string(),
  }).index('by_email', ['email']),

  paymentVerifications: defineTable({
    storeId: v.string(),
    storeName: v.string(),
    ownerName: v.string(),
    email: v.string(),
    proofImageUrl: v.optional(v.string()),
    status: v.union(v.literal('pending'), v.literal('verified'), v.literal('rejected')),
    rejectionReason: v.optional(v.string()),
    submittedAt: v.number(),
    verifiedAt: v.optional(v.number()),
  }).index('by_storeId', ['storeId']).index('by_status', ['status']),

  passwordResetRequests: defineTable({
    email: v.string(),
    userId: v.optional(v.id('users')),
    tokenHash: v.optional(v.string()),
    status: v.union(v.literal('pending'), v.literal('completed'), v.literal('rejected')),
    requestedAt: v.number(),
    expiresAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
  }).index('by_status', ['status']).index('by_email', ['email']).index('by_tokenHash', ['tokenHash']),

  customerInvites: defineTable({
    ownerId: v.id('users'),
    customerEmail: v.string(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    inviteCode: v.string(),
    status: v.union(v.literal('sent'), v.literal('accepted')),
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
    acceptedCustomerEmail: v.optional(v.string()),
  }).index('by_ownerId', ['ownerId']).index('by_customerEmail', ['customerEmail']).index('by_inviteCode', ['inviteCode']),

  purchaseEntries: defineTable({
    ownerId: v.id('users'),
    customerEmail: v.string(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    amount: v.number(),
    items: v.string(),
    paymentType: v.union(v.literal('cash'), v.literal('debt')),
    createdAt: v.number(),
  })
    .index('by_ownerId', ['ownerId'])
    .index('by_customerEmail', ['customerEmail'])
    .index('by_ownerId_and_customerEmail', ['ownerId', 'customerEmail']),

  shopCustomers: defineTable({
    ownerId: v.id('users'),
    storeId: v.optional(v.id('stores')),
    customerEmail: v.string(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('blocked')),
    joinedAt: v.number(),
  })
    .index('by_ownerId', ['ownerId'])
    .index('by_customerEmail', ['customerEmail'])
    .index('by_ownerId_and_status', ['ownerId', 'status'])
    .index('by_ownerId_and_customerEmail', ['ownerId', 'customerEmail']),

  debtEntries: defineTable({
    ownerId: v.id('users'),
    customerEmail: v.string(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    amount: v.number(),
    items: v.string(),
    dueDate: v.string(),
    status: v.union(v.literal('open'), v.literal('paid')),
    createdAt: v.number(),
  }).index('by_ownerId', ['ownerId']).index('by_customerEmail', ['customerEmail']).index('by_ownerId_and_customerEmail', ['ownerId', 'customerEmail']),

  bankingConfig: defineTable({
    bankName: v.string(),
    branchName: v.string(),
    branchCode: v.string(),
    accountHolder: v.string(),
    accountNumber: v.string(),
    accountType: v.string(),
    swiftCode: v.string(),
    whatsappNumber: v.string(),
  }),

  products: defineTable({
    storeId: v.id('stores'),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    quantity: v.number(),
    barcode: v.optional(v.string()),
    category: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_storeId', ['storeId']),

  sales: defineTable({
    storeId: v.id('stores'),
    productId: v.id('products'),
    customerId: v.optional(v.id('customers')),
    quantity: v.number(),
    totalPrice: v.number(),
    paymentType: v.union(v.literal('cash'), v.literal('debt')),
    saleDate: v.number(),
  }).index('by_storeId', ['storeId']).index('by_customerId', ['customerId']),

  customerDebt: defineTable({
    storeId: v.id('stores'),
    customerId: v.id('customers'),
    totalOwed: v.number(),
    totalPaid: v.number(),
    saleIds: v.array(v.id('sales')),
    lastSale: v.number(),
  }).index('by_storeId', ['storeId']).index('by_customerId', ['customerId']),
});