import { db } from "../db";
import { account } from "../db/schema";
import { handleDatabaseError } from "../db/helpers";
import type { Account, NewAccount } from "../db";
import { ResultAsync } from "neverthrow";
import type { Error } from "../types/error";
import { eq, desc } from "drizzle-orm";

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

  static async ensureAccount(id: string): Promise<ResultAsync<Account, Error>> {
    const accountResult = await this.getAccountById(id);
    if (accountResult.isErr() || !accountResult.value) {
      return this.createAccount({ id, type: "megadata" });
    }

    return accountResult.map(acc => acc!);
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