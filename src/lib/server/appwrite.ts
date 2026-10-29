import { Client, Account, TablesDB, Storage, Databases, Users } from 'node-appwrite';
import { cookies } from 'next/headers';

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';
const API_KEY = process.env.APPWRITE_API_KEY || '';
export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'ripple_db';
export const STORAGE_BUCKET_ID = process.env.APPWRITE_STORAGE_BUCKET_ID || 'ripple_materials';
export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'ripple_session';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isAnonymous: boolean;
}

/**
 * Creates an admin client using the server API key.
 * Used for privileged setup, account creation, or fallback transactions.
 */
export function createAdminClient() {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

  if (API_KEY) {
    client.setKey(API_KEY);
  }

  return {
    client,
    get account() {
      return new Account(client);
    },
    get tablesDB() {
      return new TablesDB(client);
    },
    get databases() {
      return new Databases(client);
    },
    get storage() {
      return new Storage(client);
    },
    get users() {
      return new Users(client);
    },
  };
}

/**
 * Creates a session client scoped to the current user's session cookie.
 */
export async function createSessionClient() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

  client.setSession(sessionCookie.value);

  return {
    client,
    sessionSecret: sessionCookie.value,
    get account() {
      return new Account(client);
    },
    get tablesDB() {
      return new TablesDB(client);
    },
    get databases() {
      return new Databases(client);
    },
    get storage() {
      return new Storage(client);
    },
  };
}

/**
 * Retrieves the currently authenticated user from Appwrite using their session cookie.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const sessionClient = await createSessionClient();
    if (!sessionClient) return null;

    const user = await sessionClient.account.get();
    return {
      id: user.$id,
      name: user.name || 'Organizer',
      email: user.email || '',
      isAnonymous: !user.email,
    };
  } catch {
    return null;
  }
}

/**
 * Requires an authenticated user, throwing an Error if unauthorized.
 */
export async function requireAuthUser(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('Unauthorized: Valid session required');
  }
  return user;
}
