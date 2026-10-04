import { mutation } from './_generated/server';
import { v } from 'convex/values';


export const setupBankingConfig = mutation({
  args: {
    bankName: v.string(),
    branchName: v.string(),
    branchCode: v.string(),
    accountHolder: v.string(),
    accountNumber: v.string(),
    accountType: v.string(),
    swiftCode: v.string(),
    whatsappNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Delete existing config if any
    const existing = await ctx.db.query('bankingConfig').first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    // Create new config
    await ctx.db.insert('bankingConfig', {
      bankName: args.bankName,
      branchName: args.branchName,
      branchCode: args.branchCode,
      accountHolder: args.accountHolder,
      accountNumber: args.accountNumber,
      accountType: args.accountType,
      swiftCode: args.swiftCode,
      whatsappNumber: args.whatsappNumber,
    });
  },
});
