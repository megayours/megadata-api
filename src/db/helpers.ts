import { eq } from 'drizzle-orm';
import { db } from './index';
import { account } from './schema';
import type { Error } from '../types/error';

export async function accountExists(accountId: string): Promise<boolean> {
  const result = await db.select().from(account).where(eq(account.id, accountId)).limit(1);
  return result.length > 0;
}

export const handleDatabaseError = (error: unknown): Error => {
  if (error instanceof Error) {
    return {
      context: error.message,
      status: 500,
    };
  }
  return {
    context: 'Unknown database error',
    status: 500,
  };
};