import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: string[];
      username?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    roles: string[];
    username?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    roles: string[];
    username?: string | null;
  }
}






