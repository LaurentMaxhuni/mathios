import type {
  AuthCredentials,
  AuthMode,
  AuthProvider,
  AuthSession,
} from "@/infrastructure/auth/auth-provider";
import { ApplicationError } from "@/domain/errors/application-error";

/**
 * Phase 0 provider used by the shell before profile authentication is introduced.
 * It makes the authentication seam executable without pretending that identity exists yet.
 */
export class AnonymousAuthProvider implements AuthProvider {
  readonly mode: AuthMode = "local-profile";

  async getSession(): Promise<AuthSession | null> {
    return null;
  }

  async signIn(credentials: AuthCredentials): Promise<AuthSession> {
    void credentials;
    throw new ApplicationError(
      "UNAUTHORIZED",
      "Profile authentication is not configured yet.",
      401,
    );
  }

  async signOut(): Promise<void> {
    return undefined;
  }
}
