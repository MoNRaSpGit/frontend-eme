# frontend-eme — Nueva Pizzería Tacuarembó (cliente real)

Rubro restaurante: el manual general está en `docs/rubros/restaurante.md`
(este proyecto ES la base de ese manual).

## Datos clave
- App: https://monraspgit.github.io/frontend-eme/ — repo MoNRaSpGit/frontend-eme, deploy AUTOMÁTICO (GitHub Actions al pushear a main).
- Backend: `backend/src/modules/eme/` (tablas `saas_eme_*`, migraciones 148, 150, 151, 152). Sin login: cualquiera con el link entra.
- Local: Nueva Pizzería Tacuarembó, tel/WhatsApp 092455379, Instagram @NuevaPizzeriaTacuarembo.
- Repartidores: Seba y Maycol (tabla `saas_eme_couriers`, sin pantalla para editarlos).
- Formas de pago: Efectivo, POS (valor interno `tarjeta`), Transferencia. Cuenta corriente OCULTA (`src/features/eme/eme.features.ts`, `ACCOUNTS_ENABLED=false`).
- Corte del día y cierre automático de caja: 3:00 Montevideo.
- Productos: cargados del Excel `C:\Users\MoNRa\Desktop\EmeClienta\PrecisoCostos\Costos.xlsx` (fuente de verdad de precios) + ingredientes de las fotos de menú en esa misma carpeta. Agregados de pizza: 1/2M $60 (costo 30), 1M $100 (costo 60).
- Impresora del local: térmica "POS Printer" (PS8), QZ Tray con certificado `override.crt`.

## Reglas de este proyecto
- **Candado**: productos, categorías e ingredientes NO se borran nunca (triggers en la base). Tampoco el registro de uso (`saas_eme_activity_log`).
- Uso real de la clienta: desde el 20/11/2026 ~01:00 (después de la limpieza de datos de prueba). Lo anterior fue prueba.
- Subir backend → esperar Render → subir frontend.
- El usuario suele decir "subilo": sin esa palabra, dejar los cambios locales y preguntar.

## Pendiente
- Logo en PNG original (el actual está recortado de la imagen del ticket).
- Costos de Nortoña, Patricia lata y los 3 postres (hoy cuentan toda la venta como ganancia).
- Ingredientes de Pizza Burguer individual, Bauru + fritas, Salchipapa, Tacos.
- Revisar ingredientes de Boloness (dice pollo y BBQ) y Vegetariana (igual a Capresse).
- Sabores de refrescos (por ahora no).
- Probar en la térmica real el ticket con imagen y el cierre de caja.
- Tabla vieja `saas_eme_demo_state` sin uso: se puede borrar cuando esté todo estable.
