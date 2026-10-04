"use node";
import { action } from './_generated/server';
import { v } from 'convex/values';
import crypto from 'crypto';

export const hashPassword = action({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    return crypto.createHash('sha256').update(password).digest('hex');
  },
});
