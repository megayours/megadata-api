import type { 
  getCollectionTokens,
  getToken,
  createToken,
  updateToken,
  deleteToken,
  validateTokenPermissions,
  getRandomTokensByAttribute
} from './megadata.routes';

export type GetCollectionTokens = typeof getCollectionTokens;
export type GetToken = typeof getToken;
export type CreateToken = typeof createToken;
export type UpdateToken = typeof updateToken;
export type DeleteToken = typeof deleteToken;
export type ValidateTokenPermissions = typeof validateTokenPermissions;
export type GetRandomTokensByAttribute = typeof getRandomTokensByAttribute; 