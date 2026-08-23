import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: { params: { scope: "read:user repo" } },
    }),
  ],
  trustHost: true,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.access_token) {
        token.githubAccessToken = account.access_token;
      }
      if (profile && "login" in profile) {
        token.githubUsername = profile.login as string;
      }
      return token;
    },
    async session({ session, token }) {
      session.githubAccessToken = token.githubAccessToken as string | undefined;
      session.githubUsername = token.githubUsername as string | undefined;
      return session;
    },
  },
});
