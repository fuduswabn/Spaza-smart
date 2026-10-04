import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getBankingConfig = query({
  handler: async (ctx) => {
    const config = await ctx.db.query('bankingConfig').first();
    if (!config) return null;
    return {
      bankName: config.bankName,
      branchName: config.branchName,
      branchCode: config.branchCode,
      accountHolder: config.accountHolder,
      accountNumber: config.accountNumber,
      accountType: config.accountType,
      swiftCode: config.swiftCode,
      whatsappNumber: config.whatsappNumber,
    };
  },
});

export const getPaymentStatus = query({
  args: { storeId: v.id('stores') },
  returns: v.object({
    paymentStatus: v.string(),
    verification: v.optional(
      v.object({
        status: v.string(),
        submittedAt: v.number(),
        verifiedAt: v.optional(v.number()),
        rejectionReason: v.optional(v.string()),
      })
    ),
  }),
  handler: async (ctx, { storeId }) => {
    const store = await ctx.db.get(storeId);
    if (!store) throw new Error('Store not found');

    const verification = await ctx.db
      .query('paymentVerifications')
      .withIndex('by_storeId', (q: any) => q.eq('storeId', storeId))
      .order('desc')
      .first();

    return {
      paymentStatus: store.paymentStatus,
      verification: verification
        ? {
            status: verification.status,
            submittedAt: verification.submittedAt,
            verifiedAt: verification.verifiedAt,
            rejectionReason: verification.rejectionReason,
          }
        : undefined,
    };
  },
});

export const submitPaymentProof = mutation({
  args: {
    storeId: v.id('stores'),
    proofUrl: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, { storeId, proofUrl }) => {
    const store = await ctx.db.get(storeId);
    if (!store) throw new Error('Store not found');

    // Create payment verification record
    await ctx.db.insert('paymentVerifications', {
      storeId,
      proofUrl,
      status: 'submitted',
      submittedAt: Date.now(),
    });

    // Update store status to submitted
    await ctx.db.patch(storeId, { paymentStatus: 'submitted' });

    return {
      success: true,
      message: 'Payment proof submitted successfully. Admin will verify within 24 hours.',
    };
  },
});

export const verifyPayment = mutation({
  args: {
    verificationId: v.id('paymentVerifications'),
    adminCode: v.string(),
    approved: v.boolean(),
    rejectionReason: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, { verificationId, adminCode, approved, rejectionReason }) => {
    const verification = await ctx.db.get(verificationId);
    if (!verification) throw new Error('Verification not found');

    const newStatus = approved ? 'verified' : 'rejected';
    const storeStatus = approved ? 'active' : 'pending';

    await ctx.db.patch(verificationId, {
      status: newStatus,
      verifiedAt: Date.now(),
      verifiedByAdminCode: adminCode,
      rejectionReason: approved ? undefined : rejectionReason,
    });

    await ctx.db.patch(verification.storeId, {
      paymentStatus: newStatus,
      status: storeStatus,
    });

    return {
      success: true,
      message: `Payment ${newStatus} successfully.`,
    };
  },
});

export const getAllPendingPayments = query({
  returns: v.array(
    v.object({
      id: v.id('paymentVerifications'),
      storeName: v.string(),
      ownerName: v.string(),
      status: v.string(),
      submittedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const verifications = await ctx.db
      .query('paymentVerifications')
      .withIndex('by_status', (q: any) => q.eq('status', 'submitted'))
      .collect();

    const results = [];
    for (const v of verifications) {
      const store = await ctx.db.get(v.storeId);
      if (store) {
        results.push({
          id: v._id,
          storeName: store.name,
          ownerName: store.ownerName,
          status: v.status,
          submittedAt: v.submittedAt,
        });
      }
    }
    return results;
  },
});