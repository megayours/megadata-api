import { createClient, newSignatureProvider } from "postchain-client";
import { err, ok, ResultAsync } from "neverthrow";

export class AbstractionChainService {
  static async createCollection(account: string, id: number, name: string): Promise<ResultAsync<boolean, Error>> {
    const client = await this.createClient();

    const signatureProvider = this.getSignatureProvider();

    try {
      await client.signAndSendUniqueTransaction({
        operations: [
          {
            name: "megadata.create_collection",
            args: [account, id.toString(), name]
          }
        ],
        signers: [signatureProvider.pubKey]
      }, signatureProvider);

      return ok(true);
    } catch (error) {
      return err(new Error("Failed to create collection on chain", { cause: error }));
    }
  }

  static async createItems(collectionId: number, items: { id: string, data: Record<string, any> }[]) {
    const client = await this.createClient();

    const signatureProvider = this.getSignatureProvider();

    const operations = items.map(({ id, data }) => ({
      name: "megadata.create_item",
      args: [collectionId.toString(), id.toString(), JSON.stringify({ erc721: data })]
    }));

    try {
      await client.signAndSendUniqueTransaction({
        operations,
        signers: [signatureProvider.pubKey]
      }, signatureProvider);

      return ok(true);
    } catch (error) {
      return err(new Error("Failed to create item on chain", { cause: error }));
    }
  }

  static async uploadFile(file: Buffer, contentType: string, account: string): Promise<ResultAsync<void, Error>> {
    const client = await this.createClient();

    const signatureProvider = this.getSignatureProvider();

    try {
      await client.signAndSendUniqueTransaction({
        operations: [
          {
            name: "filestorage.store_file",
            args: [file, contentType, account]
          }
        ],
        signers: [signatureProvider.pubKey]
      }, signatureProvider);
      return ok(undefined);
    } catch (error) {
      console.error(error);
      return err(new Error("Failed to upload file to chain", { cause: error }));
    }
  }

  private static createClient() {
    const url = process.env.ABSTRACTION_CHAIN_URL;
    const rid = process.env.ABSTRACTION_CHAIN_RID;

    if (!url || !rid) {
      throw new Error("ABSTRACTION_CHAIN_URL and ABSTRACTION_CHAIN_RID must be set");
    }

    return createClient({
      directoryNodeUrlPool: url.split(","),
      blockchainRid: rid,
    });
  }

  private static getSignatureProvider() {
    const privateKey = process.env.ABSTRACTION_CHAIN_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error("ABSTRACTION_CHAIN_PRIVATE_KEY must be set");
    }

    return newSignatureProvider({ privKey: privateKey });
  }
}