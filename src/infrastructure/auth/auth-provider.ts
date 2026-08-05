export type AuthMode = "local-profile" | "local-credential" | "hosted";

export interface AuthenticatedPrincipal {
  subjectId: string;
  userId: string;
  profileId: string;
  roles: readonly string[];
  permissions: readonly string[];
  displayName?: string;
  avatar?: string;
  preferredTheme?: "system" | "light" | "dark";
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
