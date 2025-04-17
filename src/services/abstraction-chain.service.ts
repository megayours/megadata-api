import { createClient, newSignatureProvider } from "postchain-client";
import { err, ok, ResultAsync } from "neverthrow";

export class AbstractionChainService {
  static async getAccountLinks(account: string): Promise<string[]> {
    const client = await this.createClient();

    const result = await client.query<{ links: string[] }>("account_links.get_account_links", {
      search: account
    });

    return result.links || [];
  }
  
  static async createCollection(account: string, id: number, name: string): Promise<void> {
    console.log("Creating collection on chain for collection", account, id, name);
    const client = await this.createClient();

    const signatureProvider = this.getSignatureProvider();

    await client.signAndSendUniqueTransaction({
      operations: [
        {
          name: "megadata.create_collection",
          args: [account, id.toString(), name]
        }
      ],
      signers: [signatureProvider.pubKey]
    }, signatureProvider);
  }

  static async updateItem(collectionId: number, itemId: string, data: Record<string, any>) {
    console.log("Updating item on chain for collection", collectionId, itemId, data);
    const client = await this.createClient();

    const signatureProvider = this.getSignatureProvider();

    await client.signAndSendUniqueTransaction({
      operations: [
        {
          name: "megadata.update_item",
          args: [collectionId.toString(), itemId.toString(), JSON.stringify(data)]
        }
      ],
      signers: [signatureProvider.pubKey]
    }, signatureProvider);
  }

  static async createItems(collectionId: number, items: { id: string, data: Record<string, any> }[]) {
    console.log("Creating items on chain for collection", collectionId, items);
    const client = await this.createClient();

    const signatureProvider = this.getSignatureProvider();

    const operations = items.map(({ id, data }) => ({
      name: "megadata.create_item",
      args: [collectionId.toString(), id.toString(), JSON.stringify(data)]
    }));

    console.log("Operations", operations);

    try {
      await client.signAndSendUniqueTransaction({
        operations,
        signers: [signatureProvider.pubKey]
      }, signatureProvider);

      console.log("Successfully created items on chain");

      return ok(true);
    } catch (error) {
      console.error(`Failed to create items on chain:`, error);
      return err(new Error("Failed to create item on chain", { cause: error }));
    }
  }

  static async uploadFile(file: Buffer, contentType: string, account: string, name: string): Promise<ResultAsync<void, Error>> {
    const client = await this.createClient();

    const signatureProvider = this.getSignatureProvider();

    try {
      await client.signAndSendUniqueTransaction({
        operations: [
          {
            name: "filestorage.store_file",
            args: [file, contentType, account, name]
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