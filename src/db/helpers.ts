import { eq } from 'drizzle-orm';
import { db } from './index';
import { account } from './schema';
import { ApiError } from '@/utils/errors';

export async function accountExists(accountId: string): Promise<boolean> {
  const result = await db.select().from(account).where(eq(account.id, accountId)).limit(1);
  return result.length > 0;
}

export const handleDatabaseError = (error: unknown): ApiError => {
  console.error(error);
  if (error instanceof ApiError) {
    return {
      message: error.message,
      status: error.status,
      name: error.name,
    };
  }
  return {
    name: 'UnknownDatabaseError',
    message: 'Unknown database error',
    status: 500,
  };
};