# Quedo móvil

App Flutter para Android e iOS. Consulta el catálogo público de Laravel mediante `/api/v1/estadias` y `/api/v1/estadias/{slug}`. Incluye búsqueda, filtros, fotos, estimación por noches y guardados en el dispositivo. La consulta de disponibilidad, WhatsApp y el acceso a la cuenta abren el flujo web de Quedo.

La pestaña Mapa consulta `/api/v1/mapa/zonas` y muestra referencias públicas aproximadas de Quibdó. La opción **Mi ubicación** se activa bajo petición y usa la posición durante esa visita al mapa. Laravel recibe solicitudes de catálogo por barrio. En iOS, compila con `BYPASS_PERMISSION_LOCATION_ALWAYS=1` para limitar el permiso a la app en uso.

El mapa base usa las teselas de OpenStreetMap con atribución visible. Para cambiar a un proveedor de teselas compatible con XYZ, configura `QUEDO_MAP_TILES`, `QUEDO_MAP_ATTRIBUTION` y `QUEDO_MAP_ATTRIBUTION_URL` al compilar. Revisa las condiciones del proveedor antes de distribuir la app.

## Desarrollo

Desde `mobile/`, ejecuta `flutter pub get`, `flutter analyze` y `flutter test`. Para probar en un emulador de Android, instala el SDK de Android y revisa sus licencias con `flutter doctor --android-licenses`. Inicia Apache y la base con `../laravel/iniciar-local.ps1` y ejecuta `flutter run --dart-define=QUEDO_URL=http://10.0.2.2:8089`.

La instalación local de Apache incluye una vista de prueba del cliente Flutter en <http://127.0.0.1:8089/flutter-preview/index.html>.

Un teléfono físico debe usar el dominio HTTPS donde esté desplegado Laravel con las rutas de la API. El puerto local del equipo solo escucha en loopback.

## Compilación y tiendas

- Android requiere Flutter y el SDK de Android. Configura la firma de Google Play en `android/key.properties` con `storeFile`, `storePassword`, `keyAlias` y `keyPassword`. Genera el paquete con `flutter build appbundle --dart-define=QUEDO_URL=https://tu-dominio`.
- iOS requiere una Mac con Xcode. Genera el paquete con `BYPASS_PERMISSION_LOCATION_ALWAYS=1 flutter build ipa --dart-define=QUEDO_URL=https://tu-dominio` y configura la firma de Apple.
- La integración web con Google y reCAPTCHA se activa en Laravel con credenciales de Google Cloud. La app abre ese acceso en el navegador. Los guardados del cliente Flutter se conservan en el dispositivo.

`QUEDO_URL` recibe el origen de Laravel, sin la ruta `/api`. Las compilaciones de distribución requieren HTTPS.

Los proyectos anfitriones de Android y iOS se basan en las plantillas de Flutter 3.50.1. Su licencia está en `FLUTTER-LICENSE`.
