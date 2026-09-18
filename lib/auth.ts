import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const studentLoginSchema = z.object({
  username: z.string().min(1),
  pin: z.string().length(4).regex(/^\d{4}$/),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(parsed.data.password, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    Credentials({
      id: "student",
      name: "student",
      credentials: {
        username: { label: "Username", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        const parsed = studentLoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const student = await prisma.studentProfile.findUnique({
          where: { username: parsed.data.username },
        });
        if (!student) return null;

        const pinMatch = await bcrypt.compare(parsed.data.pin, student.pin);
        if (!pinMatch) return null;

        return {
          id: student.id,
          name: student.name,
          email: `${student.username}@siswa.local`,
          role: "STUDENT",
          studentProfileId: student.id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.studentProfileId = user.studentProfileId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = typeof token.role === "string" ? token.role : undefined;
        session.user.studentProfileId =
          typeof token.studentProfileId === "string" ? token.studentProfileId : undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  trustHost: true,
});
