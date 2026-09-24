export const metadata = {
  title: "Privacidad — NutriProgress",
};

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 text-sm leading-relaxed text-slate-700">
      <h1 className="mb-1 text-xl font-bold text-slate-900">Política de privacidad</h1>
      <p className="mb-6 text-xs text-slate-400">Última actualización: 2026.</p>

      <Section title="Quién trata los datos">
        <p>
          NutriProgress es una aplicación de uso privado para el seguimiento nutricional y de ejercicio de las
          personas dadas de alta por su nutricionista. El responsable del tratamiento de los datos es la persona
          o consulta que gestiona esta aplicación (el admin que te ha dado de alta), no un tercero.
        </p>
      </Section>

      <Section title="Qué datos se tratan">
        <p>
          Datos de la cuenta (nombre, email), datos antropométricos y de salud (edad, sexo, altura, peso y su
          evolución, composición corporal si se registra), objetivos nutricionales, y los registros diarios que
          la propia persona o su nutricionista introducen: comidas, ejercicio y peso. Opcionalmente, una imagen
          del informe de la báscula si se sube al registrar el peso.
        </p>
      </Section>

      <Section title="Para qué se usan">
        <p>
          Únicamente para el seguimiento y ajuste del plan nutricional y de entrenamiento de cada persona por
          parte de su nutricionista. No se usan con fines publicitarios ni se comparten con terceros ajenos a
          esa relación de seguimiento.
        </p>
      </Section>

      <Section title="Dónde se guardan">
        <p>
          En una base de datos gestionada por el proveedor de alojamiento de la aplicación, con acceso
          restringido por usuario y contraseña. Cada persona solo puede ver sus propios datos; el admin puede
          ver y editar los de todas las personas que da de alta, para poder hacer el seguimiento.
        </p>
      </Section>

      <Section title="Cuánto tiempo se conservan">
        <p>
          Mientras la cuenta esté activa y sea necesario para el seguimiento. Si quieres que se borren tus datos
          o que se cierre tu cuenta, pídeselo directamente a tu nutricionista.
        </p>
      </Section>

      <Section title="Tus derechos">
        <p>
          Puedes pedir en cualquier momento acceder a tus datos, corregirlos si están equivocados, o que se
          borren, dirigiéndote a la persona que gestiona la aplicación (tu nutricionista).
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
