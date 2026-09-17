"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.string().email("Introduce un email válido"),
  password: z.string().min(1, "Introduce tu contraseña"),
});

export type LoginState = {
  error?: string;
};

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Revisa el email y la contraseña." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return { error: "Email o contraseña incorrectos." };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { error: "Email o contraseña incorrectos." };
  }

  await createSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
}

/**
 * No hace redirect() aquí a propósito: el botón que la llama fuerza una
 * recarga completa (`window.location`) en vez de una navegación de cliente,
 * para no dejar en el DOM ningún resto (aunque sea invisible, como el
 * payload RSC de hidratación) de los datos de la sesión anterior en
 * dispositivos compartidos entre varias personas.
 */
export async function clearSessionAction() {
  await destroySession();
}
