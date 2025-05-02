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

  static async getPublishedItem(collectionId: number, itemId: string): Promise<Record<string, any>> {
    const client = await this.createClient();

    return client.query<{ collection: string, token_id: string, properties: Record<string, any> }>("megadata.get_item", {
      collection: collectionId.toString(),
      token_id: itemId
    });
  }

  static async createCollection(account: string, id: number, name: string): Promise<void> {
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

  static async updateItems(collectionId: number, items: { id: string, data: Record<string, any> }[]) {
    const client = await this.createClient();

    const signatureProvider = this.getSignatureProvider();

    const operations = items.map(({ id, data }) => ({
      name: "megadata.update_item",
      args: [collectionId.toString(), id.toString(), JSON.stringify(data)]
    }));

    await client.signAndSendUniqueTransaction({
      operations,
      signers: [signatureProvider.pubKey]
    }, signatureProvider);
  }
  static async createItems(collectionId: number, items: { id: string, data: Record<string, any> }[]) {
    const client = await this.createClient();

    const signatureProvider = this.getSignatureProvider();

    const operations = items.map(({ id, data }) => ({
      name: "megadata.create_item",
      args: [collectionId.toString(), id.toString(), JSON.stringify(data)]
    }));

    await client.signAndSendUniqueTransaction({
      operations,
      signers: [signatureProvider.pubKey]
    }, signatureProvider);
  }

  static async uploadFile(file: Buffer, contentType: string, account: string, name: string): Promise<ResultAsync<void, Error>> {
    const client = await this.createClient();

    const fileAlreadyStored = await client.query<boolean>("filestorage.is_file_stored", {
      hash: file.toString('hex')
    });

    if (fileAlreadyStored) {
      return ok(undefined);
    }

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