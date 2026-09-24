export const metadata = {
  title: "Términos de uso — NutriProgress",
};

export default function TerminosPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 text-sm leading-relaxed text-slate-700">
      <h1 className="mb-1 text-xl font-bold text-slate-900">Términos de uso</h1>
      <p className="mb-6 text-xs text-slate-400">Última actualización: 2026.</p>

      <Section title="Qué es esta aplicación">
        <p>
          NutriProgress es una herramienta de seguimiento diario de dieta y ejercicio, de uso privado: solo se
          entra con una cuenta dada de alta por el nutricionista que gestiona la aplicación. No es una app de
          acceso público ni de autorregistro.
        </p>
      </Section>

      <Section title="No sustituye una consulta médica">
        <p>
          Los objetivos, cálculos (calorías, macros, gasto por ejercicio) y planes que muestra la app son una
          herramienta de apoyo al seguimiento marcado por tu nutricionista, no un diagnóstico ni un consejo
          médico. Ante cualquier duda de salud, consulta siempre con un profesional.
        </p>
      </Section>

      <Section title="Uso de la cuenta">
        <p>
          Cada persona es responsable de la confidencialidad de su contraseña y del uso que se haga de su
          cuenta. Si varias personas comparten dispositivo, hay que cerrar sesión al terminar para no mezclar
          datos.
        </p>
      </Section>

      <Section title="Datos e imágenes registrados">
        <p>
          Lo que se registra (comidas, ejercicio, peso, y cualquier imagen que se suba) es responsabilidad de
          quien lo introduce. Ver la <a href="/privacidad" className="underline">política de privacidad</a> para
          saber cómo se tratan esos datos.
        </p>
      </Section>

      <Section title="Cambios">
        <p>
          Estos términos pueden actualizarse si cambia cómo funciona la aplicación. Si tienes dudas sobre algún
          punto, pregunta directamente a tu nutricionista.
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-1.5 font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}
