import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI!);
const clientPromise = Promise.resolve(client);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user, isNewUser }) {
      if (account) {
        token.refreshToken = account.refresh_token;
      }

      // Track new user signup with Reddit Pixel
      if (isNewUser && user?.email) {
        token.isNewUser = true;
        token.userEmail = user.email;
      }

      return token;
    },
    async session({ session, token }) {
      if (token.refreshToken) {
        (session as unknown as { refreshToken: string }).refreshToken =
          token.refreshToken as string;
      }

      // Pass new user flag to session for client-side tracking
      if (token.isNewUser) {
        (session as unknown as { isNewUser: boolean }).isNewUser = true;
        (session as unknown as { userEmail: unknown }).userEmail =
          token.userEmail;
        // Reset the flag so it only triggers once
        token.isNewUser = false;
      }

      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
});
