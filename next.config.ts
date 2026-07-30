import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  async headers() {
    return [
      {
        // Aplica a todas las rutas de la app
        source: "/:path*",
        headers: [
          // Evita que el sitio se cargue dentro de un <iframe> de otro dominio (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          // Evita que el navegador intente "adivinar" el tipo de archivo (MIME sniffing)
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Limita cuánta información de referer se envía a otros sitios
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Desactiva APIs sensibles del navegador que este sistema no usa
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Fuerza HTTPS en el navegador durante 6 meses (solo tiene efecto real en producción con HTTPS)
          {
            key: "Strict-Transport-Security",
            value: "max-age=15552000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;