export type AuthMode = "local-profile" | "local-credential" | "hosted";

export interface AuthenticatedPrincipal {
  subjectId: string;
  roles: readonly string[];
  displayName?: string;
}

export interface AuthSession {
  principal: AuthenticatedPrincipal;
  expiresAt?: Date;
}

export interface AuthCredentials {
  identifier: string;
  secret?: string;
}

export interface AuthProvider {
  readonly mode: AuthMode;
  getSession(): Promise<AuthSession | null>;
  signIn(credentials: AuthCredentials): Promise<AuthSession>;
  signOut(): Promise<void>;
}
