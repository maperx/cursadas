import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import * as schema from "./db/schema";
import { sendEmail } from "./email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verificá tu email - Cursadas",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>¡Hola ${user.name}!</h2>
            <p>Gracias por registrarte en Cursadas. Para verificar tu email, hacé clic en el siguiente enlace:</p>
            <p style="margin: 24px 0;">
              <a href="${url}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Verificar email
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">Si no creaste esta cuenta, podés ignorar este email.</p>
          </div>
        `,
      });
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Restablecer contraseña - Cursadas",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>¡Hola ${user.name}!</h2>
            <p>Recibimos una solicitud para restablecer tu contraseña. Hacé clic en el siguiente enlace:</p>
            <p style="margin: 24px 0;">
              <a href="${url}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Restablecer contraseña
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">Si no solicitaste este cambio, podés ignorar este email. El enlace expira en 1 hora.</p>
          </div>
        `,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    admin({
      defaultRole: "estudiante",
      adminRole: "admin",
    }),
    nextCookies(),
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "estudiante",
        input: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
