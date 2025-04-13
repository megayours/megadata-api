import { db } from "../db";
import { account } from "../db/schema";
import { handleDatabaseError } from "../db/helpers";
import type { Account, NewAccount } from "../db";
import { ResultAsync } from "neverthrow";
import { eq, desc } from "drizzle-orm";
import { ApiError } from "@/utils/errors";
import * as HTTP_STATUS_CODES from "@/lib/http-status-codes";

export class AccountService {
  static async getAllAccounts(): Promise<ResultAsync<Account[], Error>> {
    return ResultAsync.fromPromise<Account[], Error>(
      db.select().from(account).orderBy(desc(account.created_at)),
      (error) => handleDatabaseError(error)
    );
  }

  static async getAccountById(id: string): Promise<ResultAsync<Account | null, Error>> {
    return ResultAsync.fromPromise<Account | null, Error>(
      db.select().from(account).where(eq(account.id, id)).limit(1).then(result => result[0] ?? null),
      (error) => handleDatabaseError(error)
    );
  }

  static async ensureAccount(id: string): Promise<Account> {
    // First try to get the existing account
    const existingAccount = await db.select().from(account).where(eq(account.id, id)).limit(1).then(result => result[0] ?? null);
    
    if (existingAccount) {
      return existingAccount;
    }

    // If account doesn't exist, create it
    const result = await db.insert(account).values({ id, type: "megadata" }).returning().then(result => result[0] ?? null);
    if (!result) throw new ApiError("Failed to create account", HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    return result;
  }

  static async createAccount(accountData: NewAccount): Promise<ResultAsync<Account, Error>> {
    return ResultAsync.fromPromise<Account, Error>(
      db.insert(account).values(accountData).returning().then(result => {
        const record = result[0];
        if (!record) throw new Error("Failed to create account");
        return record;
      }),
      (error) => handleDatabaseError(error)
    );
  }

  static async deleteAccount(id: string): Promise<ResultAsync<Account | null, Error>> {
    return ResultAsync.fromPromise<Account | null, Error>(
      db.delete(account).where(eq(account.id, id)).returning().then(result => result[0] ?? null),
      (error) => handleDatabaseError(error)
    );
  }
} 