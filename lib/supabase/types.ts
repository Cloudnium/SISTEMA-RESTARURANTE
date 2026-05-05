// lib/supabase/types.ts
// Tipos TypeScript derivados del esquema madre_schema.sql
// Actualizar si se agrega/modifica alguna tabla en Supabase.

// ─── Enums (deben coincidir con los CREATE TYPE del schema) ───────────────────
export type RolUsuario          = 'admin' | 'cajero' | 'cocinero';
export type EstadoMesa          = 'disponible' | 'ocupada' | 'limpieza' | 'reservada';
export type ZonaAlmacen         = 'tienda' | 'cocina' | 'general';
export type TipoProducto        = 'producto_venta' | 'insumo' | 'material';
export type EstadoPedido        = 'abierto' | 'enviado_cocina' | 'listo' | 'entregado' | 'cancelado';
export type TipoMovAlmacen      = 'entrada' | 'salida_venta' | 'salida_cocina' | 'traslado' | 'ajuste' | 'merma';
export type TipoProduccion      = 'produccion' | 'porcionado';
export type MetodoPago          = 'efectivo' | 'tarjeta' | 'yape' | 'plin' | 'transferencia' | 'izipay';
export type TipoComprobante     = 'boleta' | 'factura' | 'nota_venta';
export type TipoComprobanteCompra = 'factura' | 'boleta' | 'nota_venta' | 'recibo' | 'otro';
export type EstadoComprobante   = 'emitido' | 'anulado';
export type EstadoCaja          = 'abierta' | 'cerrada';
export type TipoMovCaja         = 'ingreso' | 'egreso';
export type TipoCliente         = 'persona' | 'empresa';
export type EstadoVenta         = 'completada' | 'anulada' | 'pendiente';

// ─── Interfaces de cada tabla ─────────────────────────────────────────────────

export interface Usuario {
  id:          string;
  nombre:      string;
  email:       string;
  rol:         RolUsuario;
  dni:         string | null;
  caja_id:     string | null;
  activo:      boolean;
  created_at:  string;
  updated_at:  string;
  // Relación
  caja?:       Caja | null;
}

export interface CategoriaProducto {
  id:          string;
  nombre:      string;
  tipo:        TipoProducto;
  descripcion: string | null;
  activo:      boolean;
  created_at:  string;
}

export interface Producto {
  id:                    string;
  nombre:                string;
  categoria:             string;
  categoria_id:          string | null;
  tipo:                  TipoProducto;
  precio:                number;
  costo:                 number | null;
  unidad_medida:         string;
  imagen:                string | null;
  descripcion:           string | null;
  codigo_barras:         string | null;
  // Triple stock
  stock_tienda:          number;
  stock_cocina:          number;
  stock_general:         number;
  stock_minimo_tienda:   number;
  stock_minimo_cocina:   number;
  stock:                 number;   // columna generada: tienda + cocina + general
  activo:                boolean;
  created_at:            string;
  updated_at:            string;
}

export interface Mesa {
  id:         string;
  numero:     string;
  nombre:     string;
  zona:       string;
  capacidad:  number;
  estado:     EstadoMesa;
  activo:     boolean;
  created_at: string;
  updated_at: string;
  // Relaciones opcionales (cuando se hace join)
  pedido_activo?: Pedido | null;
}

export interface Cliente {
  id:                 string;
  tipo:               TipoCliente;
  nombre:             string;
  ruc:                string | null;
  dni:                string | null;
  telefono:           string | null;
  email:              string | null;
  direccion:          string | null;
  fecha_nacimiento:   string | null;
  puntos_acumulados:  number;
  activo:             boolean;
  created_at:         string;
  updated_at:         string;
  dni_extranjero:     string | null;
}

export interface Caja {
  id:               string;
  nombre:           string;
  estado:           EstadoCaja;
  zona:             string | null;
  monto_inicial:    number;
  monto_actual:     number;
  fecha_apertura:   string | null;
  fecha_cierre:     string | null;
  usuario_apertura: string | null;
  usuario_cierre:   string | null;
  usuario_id:       string | null;
  habilitado:       boolean;
  created_at:       string;
  updated_at:       string;
  // Relación
  usuario?:         Usuario | null;
}

export interface Pedido {
  id:         string;
  mesa_id:    string;
  cliente_id: string | null;
  usuario_id: string;
  estado:     EstadoPedido;
  notas:      string | null;
  total:      number;
  created_at: string;
  updated_at: string;
  // Relaciones
  mesa?:      Mesa;
  cliente?:   Cliente | null;
  usuario?:   Usuario;
  items?:     PedidoItem[];
}

export interface PedidoItem {
  id:              string;
  pedido_id:       string;
  producto_id:     string;
  cantidad:        number;
  precio_unitario: number;
  subtotal:        number;
  notas:           string | null;
  estado:          EstadoPedido;
  created_at:      string;
  // Relación
  producto?:       Producto;
}

export interface Venta {
  id:                   string;
  pedido_id:            string | null;
  mesa_id:              string | null;
  cliente_id:           string | null;
  usuario_id:           string;
  caja_id:              string | null;
  tipo_comprobante:     TipoComprobante;
  metodo_pago:          MetodoPago;
  subtotal:             number;
  igv:                  number;
  total:                number;
  descuento_porcentaje: number | null;
  descuento_monto:      number | null;
  puntos_usados:        number | null;
  puntos_ganados:       number | null;
  monto_recibido:       number | null;
  vuelto:               number | null;
  estado:               EstadoVenta;
  notas:                string | null;
  fecha_local:          string;
  created_at:           string;
  updated_at:           string;
  // Relaciones
  cliente?:             Cliente | null;
  usuario?:             Usuario;
  caja?:                Caja | null;
  items?:               VentaItem[];
  comprobante?:         Comprobante | null;
}

export interface VentaItem {
  id:              string;
  venta_id:        string;
  producto_id:     string;
  cantidad:        number;
  precio_unitario: number;
  subtotal:        number;
  created_at:      string;
  // Relación
  producto?:       Producto;
}

export interface Comprobante {
  id:            string;
  venta_id:      string;
  numero:        string;
  tipo:          TipoComprobante;
  serie:         string;
  correlativo:   number;
  fecha_emision: string;
  estado:        EstadoComprobante;
  usuario_id:    string | null;
  pdf_url:       string | null;
  created_at:    string;
  updated_at:    string;
  // Relaciones
  venta?:        Venta;
  usuario?:      Usuario | null;
}

export interface ProduccionCocina {
  id:          string;
  producto_id: string;
  tipo:        TipoProduccion;
  cantidad:    number;
  unidad:      string;
  usuario_id:  string;
  notas:       string | null;
  fecha:       string;
  hora:        string;
  created_at:  string;
  // Relaciones
  producto?:   Producto;
  usuario?:    Usuario;
}

export interface Receta {
  id:          string;
  producto_id: string;   // plato final
  insumo_id:   string;   // insumo de cocina
  cantidad:    number;
  unidad:      string;
  activo:      boolean;
  created_at:  string;
  // Relaciones
  producto?:   Producto;
  insumo?:     Producto;
}

export interface MovimientoAlmacen {
  id:                     string;
  producto_id:            string;
  tipo:                   TipoMovAlmacen;
  zona_origen:            ZonaAlmacen | null;
  zona_destino:           ZonaAlmacen | null;
  cantidad:               number;
  stock_tienda_antes:     number;
  stock_cocina_antes:     number;
  stock_general_antes:    number;
  stock_tienda_despues:   number;
  stock_cocina_despues:   number;
  stock_general_despues:  number;
  referencia_id:          string | null;
  usuario_id:             string;
  observacion:            string | null;
  created_at:             string;
  // Relaciones
  producto?:              Producto;
  usuario?:               Usuario;
}

export interface Compra {
  id:                string;
  tipo_comprobante:  TipoComprobanteCompra;
  serie:             string | null;
  numero:            string | null;
  fecha_emision:     string;
  fecha_vencimiento: string | null;
  proveedor_nombre:  string;
  proveedor_doc:     string | null;
  proveedor_tipo_doc:string | null;
  base_imponible:    number;
  igv:               number;
  total:             number;
  descripcion:       string | null;
  usuario_id:        string;
  created_at:        string;
  updated_at:        string;
  // Relaciones
  usuario?:          Usuario;
  items?:            CompraItem[];
}

export interface CompraItem {
  id:              string;
  compra_id:       string;
  producto_id:     string | null;
  descripcion:     string;
  cantidad:        number;
  precio_unitario: number;
  subtotal:        number;
  zona_destino:    ZonaAlmacen;
  // Relación
  producto?:       Producto | null;
}

export interface MovimientoCaja {
  id:           string;
  caja_id:      string;
  tipo:         TipoMovCaja;
  concepto:     string;
  monto:        number;
  metodo_pago:  MetodoPago | null;
  venta_id:     string | null;
  usuario_id:   string;
  observaciones:string | null;
  created_at:   string;
  // Relaciones
  caja?:        Caja;
  usuario?:     Usuario;
}

export interface Notificacion {
  id:         string;
  tipo:       string;
  titulo:     string;
  mensaje:    string;
  leida:      boolean;
  usuario_id: string | null;
  referencia: Record<string, unknown> | null;
  created_at: string;
}

// ─── Tipo Database completo para el cliente Supabase tipado ──────────────────
export interface Database {
  public: {
    Tables: {
      usuarios:             { Row: Usuario;            Insert: Omit<Usuario, 'created_at'|'updated_at'|'caja'>; Update: Partial<Omit<Usuario,'id'|'caja'>>; };
      productos:            { Row: Producto;           Insert: Omit<Producto,'stock'|'created_at'|'updated_at'>; Update: Partial<Omit<Producto,'id'|'stock'>>; };
      mesas:                { Row: Mesa;               Insert: Omit<Mesa,'id'|'created_at'|'updated_at'|'pedido_activo'>; Update: Partial<Omit<Mesa,'id'|'pedido_activo'>>; };
      clientes:             { Row: Cliente;            Insert: Omit<Cliente,'id'|'created_at'|'updated_at'>; Update: Partial<Omit<Cliente,'id'>>; };
      cajas:                { Row: Caja;               Insert: Omit<Caja,'id'|'created_at'|'updated_at'|'usuario'>; Update: Partial<Omit<Caja,'id'|'usuario'>>; };
      pedidos:              { Row: Pedido;             Insert: Omit<Pedido,'id'|'created_at'|'updated_at'|'mesa'|'cliente'|'usuario'|'items'>; Update: Partial<Omit<Pedido,'id'|'mesa'|'cliente'|'usuario'|'items'>>; };
      pedido_items:         { Row: PedidoItem;         Insert: Omit<PedidoItem,'id'|'subtotal'|'created_at'|'producto'>; Update: Partial<Omit<PedidoItem,'id'|'subtotal'|'producto'>>; };
      ventas:               { Row: Venta;              Insert: Omit<Venta,'id'|'created_at'|'updated_at'|'cliente'|'usuario'|'caja'|'items'|'comprobante'>; Update: Partial<Omit<Venta,'id'|'cliente'|'usuario'|'caja'|'items'|'comprobante'>>; };
      venta_items:          { Row: VentaItem;          Insert: Omit<VentaItem,'id'|'subtotal'|'created_at'|'producto'>; Update: never; };
      comprobantes:         { Row: Comprobante;        Insert: Omit<Comprobante,'id'|'numero'|'serie'|'correlativo'|'created_at'|'updated_at'|'venta'|'usuario'>; Update: Partial<Omit<Comprobante,'id'|'venta'|'usuario'>>; };
      produccion_cocina:    { Row: ProduccionCocina;   Insert: Omit<ProduccionCocina,'id'|'created_at'|'producto'|'usuario'>; Update: never; };
      recetas:              { Row: Receta;             Insert: Omit<Receta,'id'|'created_at'|'producto'|'insumo'>; Update: Partial<Omit<Receta,'id'|'producto'|'insumo'>>; };
      movimientos_almacen:  { Row: MovimientoAlmacen;  Insert: Omit<MovimientoAlmacen,'id'|'created_at'|'producto'|'usuario'>; Update: never; };
      compras:              { Row: Compra;             Insert: Omit<Compra,'id'|'created_at'|'updated_at'|'usuario'|'items'>; Update: Partial<Omit<Compra,'id'|'usuario'|'items'>>; };
      compra_items:         { Row: CompraItem;         Insert: Omit<CompraItem,'id'|'subtotal'|'producto'>; Update: never; };
      movimientos_caja:     { Row: MovimientoCaja;     Insert: Omit<MovimientoCaja,'id'|'created_at'|'caja'|'usuario'>; Update: never; };
      notificaciones:       { Row: Notificacion;       Insert: Omit<Notificacion,'id'|'created_at'>; Update: Partial<Pick<Notificacion,'leida'>>; };
      categorias_producto:  { Row: CategoriaProducto;  Insert: Omit<CategoriaProducto,'id'|'created_at'>; Update: Partial<Omit<CategoriaProducto,'id'>>; };
    };
    Views: {
      v_ventas_hoy:         { Row: Venta & { comprobante_numero: string | null; comprobante_tipo: TipoComprobante | null } };
      v_resumen_stock:      { Row: Producto & { alerta_tienda: boolean; alerta_cocina: boolean } };
      v_mesas_con_pedido:   { Row: Mesa & { pedido_id: string|null; pedido_total: number|null; pedido_inicio: string|null; minutos_ocupada: number|null; mozo: string|null } };
      v_comprobantes_detalle:{ Row: Comprobante & { monto: number; metodo_pago: MetodoPago; estado_venta: EstadoVenta; cliente_nombre: string|null; dni: string|null; ruc: string|null; usuario_nombre: string } };
    };
    Functions: {
      fn_mover_stock: {
        Args: { p_producto_id: string; p_zona_origen: ZonaAlmacen; p_zona_destino: ZonaAlmacen; p_cantidad: number; p_usuario_id: string; p_observacion?: string };
        Returns: void;
      };
      fn_abrir_caja: {
        Args: { p_caja_id: string; p_usuario_id: string; p_monto_inicial?: number };
        Returns: void;
      };
      fn_cerrar_caja: {
        Args: { p_caja_id: string; p_usuario_id: string };
        Returns: number;
      };
      fn_es_admin: { Args: Record<never, never>; Returns: boolean };
      fn_rol_usuario_actual: { Args: Record<never, never>; Returns: string };
    };
    Enums: {
      rol_usuario:             RolUsuario;
      estado_mesa:             EstadoMesa;
      zona_almacen:            ZonaAlmacen;
      tipo_producto:           TipoProducto;
      estado_pedido:           EstadoPedido;
      tipo_movimiento_almacen: TipoMovAlmacen;
      tipo_produccion:         TipoProduccion;
      metodo_pago:             MetodoPago;
      tipo_comprobante:        TipoComprobante;
      tipo_comprobante_compra: TipoComprobanteCompra;
      estado_comprobante:      EstadoComprobante;
      estado_caja:             EstadoCaja;
      tipo_movimiento_caja:    TipoMovCaja;
    };
  };
}

// ─── Tipos de utilidad para formularios ──────────────────────────────────────

/** Item del carrito de venta (estado local, no en BD) */
export interface CartItem {
  id:              string;
  nombre:          string;
  precio:          number;
  cantidad:        number;
  stock_tienda:    number;
}

/** Totales calculados del carrito */
export interface TotalesCarrito {
  subtotal:      number;
  igv:           number;
  total:         number;
  totalItems:    number;
}

/** Payload para crear una venta completa */
export interface CrearVentaPayload {
  items:             CartItem[];
  tipo_comprobante:  TipoComprobante;
  metodo_pago:       MetodoPago;
  cliente_id?:       string;
  caja_id?:          string;
  mesa_id?:          string;
  monto_recibido?:   number;
  descuento_monto?:  number;
  notas?:            string;
}