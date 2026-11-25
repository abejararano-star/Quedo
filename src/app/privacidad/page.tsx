import type { Metadata } from "next";
export const metadata: Metadata = { title: "Privacidad y condiciones de desarrollo" };
export default function Privacy() {
  return <div className="container page-space content-page">
    <p className="eyebrow">VERSIÓN LOCAL DE DESARROLLO</p>
    <h1>Privacidad y condiciones de prueba.</h1>
    <p>Este aviso explica el comportamiento de la versión local. Antes de una operación comercial deben identificarse el responsable del tratamiento, su canal de atención y los textos definitivos aplicables.</p>
    <section><h2>Datos que utiliza esta versión</h2>
      <p>Al crear una cuenta se guardan el nombre, correo y una contraseña protegida mediante un derivador criptográfico. Los anuncios guardan fotografías, servicios, tarifas, condiciones y datos de contacto aportados por el anfitrión.</p>
      <p>La cookie necesaria de acceso mantiene la sesión durante un máximo de ocho horas. Los favoritos de visitantes se guardan en este navegador. Al iniciar sesión, los nuevos guardados se asocian a la cuenta y se pueden consultar o quitar desde otro dispositivo.</p>
    </section>
    <section><h2>Información pública y privada</h2>
      <p>Cuando un anuncio real se publica, su ficha y fotografías son públicas. El nombre del anfitrión, número de RNT aportado y enlace de WhatsApp forman parte de la información de la publicación.</p>
      <p>Los anuncios no publicados y sus fotografías solo son accesibles para su propietario y la administración. Esta versión no solicita documentos de identidad ni evidencia sensible.</p>
    </section>
    <section><h2>Medición y seguimiento</h2>
      <p>La cookie analítica identifica una sesión de navegación durante un máximo de treinta minutos para relacionar fichas vistas y contactos iniciados. Usa un identificador opaco; no representa una persona única ni permite reconocerla entre dispositivos. La base guarda el hash del identificador del navegador.</p>
      <p>Se registran vistas, aperturas del contacto, el origen indicado en UTM cuando existe y reportes. El anfitrión o administrador puede añadir el estado y notas de seguimiento de una consulta. No deben incluir datos sensibles de huéspedes. Una vista, clic o confirmación manual no verifica un pago.</p>
      <p>Los administradores registran estados de planes con fecha de efecto para analizar permanencia. Esta operación no cobra dinero. Los anfitriones acceden a sus propios datos; la administración puede analizarlos y exportarlos a CSV. Las simulaciones están separadas de los datos reales.</p>
      <p>Los límites contra abuso usan identificadores derivados criptográficamente de la conexión; no conservan direcciones IP en texto plano en esas tablas.</p>
    </section>
    <section><h2>Servicios externos</h2>
      <p>Al pulsar el contacto en un anuncio real se abre WhatsApp, sujeto a sus condiciones. Las fotografías de referencia se sirven desde este proyecto y no describen alojamientos reales de Quibdó.</p>
    </section>
    <section><h2>Uso de la prueba</h2>
      <p>Usa datos de prueba y fotografías autorizadas. No cargues información sensible de terceros. El administrador local puede atender solicitudes sobre datos mediante las herramientas de administración de la base. El canal formal, el consentimiento y la política de conservación deben definirse antes del piloto.</p>
      <p>Publicar un anuncio requiere revisión administrativa. Las condiciones de la estadía se acuerdan entre las partes. Esta versión no procesa pagos ni cobra suscripciones.</p>
    </section>
  </div>;
}
