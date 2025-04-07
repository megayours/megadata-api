import * as jose from 'jose';
import { ResultAsync } from 'neverthrow';
import { SigningKey, getAddress, computeAddress } from 'ethers';

// Different JWKS endpoints for social logins and external wallets
const SOCIAL_LOGIN_JWKS_URL = 'https://api-auth.web3auth.io/jwks';
const EXTERNAL_WALLET_JWKS_URL = 'https://authjs.web3auth.io/jwks';

// Cache for JWKS
let socialLoginJWKS: jose.JWTVerifyGetKey;
let externalWalletJWKS: jose.JWTVerifyGetKey;

export interface Wallet {
  type: string;
  address?: string;
  public_key?: string;
  curve?: string;
}

export interface JwtPayload {
  iat?: number;
  exp?: number;
  verifier: string;
  verifierId: string;
  aggregateVerifier?: string;
  wallets: Wallet[];
  [key: string]: unknown;
}

const fetchJWKS = async (url: string): Promise<jose.JWTVerifyGetKey> => {
  return jose.createRemoteJWKSet(new URL(url));
};

// Initialize JWKS
export const initJWKS = async (): Promise<void> => {
  try {
    socialLoginJWKS = await fetchJWKS(SOCIAL_LOGIN_JWKS_URL);
    externalWalletJWKS = await fetchJWKS(EXTERNAL_WALLET_JWKS_URL);
    console.log('JWKS initialized successfully');
  } catch (error) {
    console.error('Failed to initialize JWKS:', error);
    throw error;
  }
};

export const verifyToken = (token: string, appPubKey: string | undefined): ResultAsync<JwtPayload, Error> => {
  return ResultAsync.fromPromise(
    (async () => {
      try {
        if (appPubKey) {
          console.log('appPubKey', appPubKey);
          // Social login
          const jwks = socialLoginJWKS;
          const jwtDecoded = await jose.jwtVerify(token, jwks, { algorithms: ["ES256"] });
          if ((jwtDecoded.payload as any).wallets.find((x: { type: string }) => x.type === "web3auth_app_key").public_key.toLowerCase() === appPubKey.toLowerCase()) {
            return jwtDecoded.payload as JwtPayload;
          } else {
            throw new Error('Invalid app pub key');
          }
        } else {
          // External wallet
          const jwks = externalWalletJWKS;
          const jwtDecoded = await jose.jwtVerify(token, jwks, { algorithms: ["ES256"] });
          return jwtDecoded.payload as JwtPayload;
        }
      } catch (error) {
        console.error('Token verification error:', error);
        throw error;
      }
    })(),
    (error) => {
      console.error('ResultAsync error:', error);
      return error as Error;
    }
  );
};

// Helper to get wallet address from payload
export const getWalletAddress = (payload: JwtPayload, appPubKey: string | undefined): string | null => {

  if (appPubKey) {
    const address = compressedPubKeyToAddress(appPubKey);
    return address;
  }

  // First try to find an ethereum wallet
  const ethereumWallet = payload.wallets?.find(w => w.type === 'ethereum');
  if (ethereumWallet?.address) {
    return ethereumWallet.address;
  }

  return null;
}; 

function compressedPubKeyToAddress(compressedPubKey: string): string {
  // Ensure the public key has the 0x prefix
  const prefixedKey = compressedPubKey.startsWith('0x') 
    ? compressedPubKey 
    : '0x' + compressedPubKey;
  
  // Convert compressed public key to an uncompressed public key
  const publicKey = SigningKey.computePublicKey(prefixedKey, false);
  
  // Calculate the address from the public key
  const address = getAddress(computeAddress(publicKey));
  
  return address;
}