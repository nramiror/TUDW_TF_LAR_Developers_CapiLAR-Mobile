import { useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  DEPOSITO_LABEL,
  MAX_CODIGO_ARTICULO,
  MAX_NOMBRE_ARTICULO,
  MAX_PRECIO,
  MAX_STOCK,
  MAX_TEXTO_MARCA,
  MAX_TONALIDAD,
  TIPO_PRODUCTO_LABEL,
  USO_LABEL,
  formatMarca,
} from '@/api/articulos';
import type { ArticuloData, Marca, MarcaData, TipoDeposito, TipoProducto, UsoArticulo } from '@/api/articulos';
import { ApiError } from '@/api/client';
import { UNIDAD_LABEL } from '@/api/fichas';
import type { UnidadInsumo } from '@/api/fichas';
import { Button } from '@/components/button/button';
import { Chip } from '@/components/chip/chip';
import { FormMessage } from '@/components/formMessage/formMessage';
import { TextField } from '@/components/textField/textField';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';
import { fechaToIso, maskFecha, parseDecimal } from '@/utils/validation';

// Pastillas para elegir una opción de una lista fija
function Opciones<T extends string>({ label, options, value, onChange }: { label: string; options: Record<T, string>; value: T; onChange: (value: T) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {(Object.keys(options) as T[]).map((key) => (
          <Chip key={key} label={options[key]} selected={value === key} onPress={() => onChange(key)} />
        ))}
      </View>
    </View>
  );
}

// Marcas de la lista y "+ Nueva marca" para cargarla ahí mismo; la nueva queda elegida
const MarcaField = ({
  marcas,
  value,
  onChange,
  error,
  onCrearMarca,
}: {
  marcas: Marca[];
  value: number | null;
  onChange: (id: number) => void;
  error?: string;
  onCrearMarca: (data: MarcaData) => Promise<Marca>;
}) => {
  const [creando, setCreando] = useState(false);
  const [razonSocial, setRazonSocial] = useState('');
  const [linea, setLinea] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorMarca, setErrorMarca] = useState('');

  const cerrar = () => {
    setCreando(false);
    setRazonSocial('');
    setLinea('');
    setErrorMarca('');
  };

  const guardar = async () => {
    if (guardando) return;
    if (!razonSocial.trim()) return setErrorMarca('Ingresá el nombre de la marca');
    setGuardando(true);
    setErrorMarca('');
    try {
      const nueva = await onCrearMarca({ razonSocial: razonSocial.trim(), linea: linea.trim() || null });
      onChange(nueva.id);
      cerrar();
    } catch (err) {
      setErrorMarca(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Marca</Text>
      <View style={styles.chips}>
        {marcas.map((marca) => (
          <Chip key={marca.id} label={formatMarca(marca)} selected={value === marca.id} onPress={() => onChange(marca.id)} />
        ))}
        {!creando && <Chip label="+ Nueva marca" onPress={() => setCreando(true)} />}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {creando && (
        <View style={styles.box}>
          <TextField label="Marca" placeholder="ej. Fidelité" maxLength={MAX_TEXTO_MARCA} value={razonSocial} onChangeText={setRazonSocial} />
          <TextField label="Línea (opcional)" placeholder="ej. Argán" maxLength={MAX_TEXTO_MARCA} value={linea} onChangeText={setLinea} />
          {errorMarca !== '' && <FormMessage message={errorMarca} />}
          <View style={styles.chips}>
            <Chip label={guardando ? 'Guardando...' : 'Guardar marca'} onPress={guardar} disabled={guardando} />
            <Chip label="Cancelar" onPress={cerrar} disabled={guardando} />
          </View>
        </View>
      )}
    </View>
  );
};

// Número con hasta `decimales` decimales, entre 0 y max. Devuelve el mensaje de error o undefined
const validarNumero = (text: string, decimales: number, max: number, vacio: string) => {
  if (!text.trim()) return vacio;
  const valor = parseDecimal(text, decimales);
  if (valor === null) return `Ingresá un número, con hasta ${decimales} decimales`;
  if (valor > max) return 'El número es demasiado alto';
  return undefined;
};

interface ArticuloFormProps {
  marcas: Marca[];
  // Quien lo usa llama a la API y suma la marca a la lista
  onCrearMarca: (data: MarcaData) => Promise<Marca>;
  // Recibe los datos ya validados; quien lo usa llama a la API
  onSubmit: (data: ArticuloData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  // Error del back
  error?: string;
  // Debajo del error (ej. usar el artículo que ya existe)
  errorAction?: ReactNode;
  // Alta desde la ficha: solo lo necesario para usarlo ya. Uso y depósito quedan en Salón y el resto lo completa el ADMIN
  rapido?: boolean;
  nombreInicial?: string;
}

// Alta de un artículo (ADMIN y PROFESIONAL), con las mismas reglas que la web. El stock inicial solo se carga acá:
// después cambia con los movimientos
export const ArticuloForm = ({
  marcas,
  onCrearMarca,
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  errorAction,
  rapido = false,
  nombreInicial = '',
}: ArticuloFormProps) => {
  const [nombre, setNombre] = useState(nombreInicial);
  const [marcaId, setMarcaId] = useState<number | null>(null);
  const [tipoProducto, setTipoProducto] = useState<TipoProducto>('TINTURA');
  const [uso, setUso] = useState<UsoArticulo>('SALON');
  const [tonalidad, setTonalidad] = useState('');
  const [codigo, setCodigo] = useState('');
  const [pesoInicial, setPesoInicial] = useState('');
  const [tipoPeso, setTipoPeso] = useState<UnidadInsumo>('G');
  const [precioCosto, setPrecioCosto] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  // Desde la ficha arranca en 1: con 0, al completar el turno el stock quedaría negativo enseguida
  const [stock, setStock] = useState(rapido ? '1' : '0');
  const [stockMinAlert, setStockMinAlert] = useState('0');
  const [tipoDeposito, setTipoDeposito] = useState<TipoDeposito>('SALON');
  const [vencimiento, setVencimiento] = useState('');
  const [errores, setErrores] = useState<Record<string, string | undefined>>({});

  const seVende = uso !== 'SALON';

  const submit = () => {
    const nuevos: Record<string, string | undefined> = {
      nombre: nombre.trim() ? undefined : 'Ingresá el nombre del artículo',
      marcaId: marcaId ? undefined : 'Elegí la marca',
      pesoInicial:
        validarNumero(pesoInicial, 2, MAX_PRECIO, 'Ingresá el contenido del envase') ??
        ((parseDecimal(pesoInicial, 2) ?? 0) > 0 ? undefined : 'Tiene que ser mayor a 0'),
      precioCosto: validarNumero(precioCosto, 2, MAX_PRECIO, 'Ingresá el precio de costo'),
      precioVenta: seVende ? validarNumero(precioVenta, 2, MAX_PRECIO, 'Ingresá el precio de venta') : undefined,
      stock: validarNumero(stock, 3, MAX_STOCK, rapido ? 'Ingresá cuántos envases hay' : 'Ingresá el stock inicial'),
      stockMinAlert: validarNumero(stockMinAlert, 3, MAX_STOCK, 'Ingresá el stock mínimo'),
      vencimiento: vencimiento && !fechaToIso(vencimiento) ? 'Ingresá una fecha válida (DD/MM/AAAA)' : undefined,
    };
    setErrores(nuevos);
    if (Object.values(nuevos).some(Boolean) || !marcaId) return;

    onSubmit({
      nombre: nombre.trim(),
      codigo: codigo.trim() || null,
      uso,
      tipoProducto,
      marcaId,
      precioCosto: parseDecimal(precioCosto, 2) ?? 0,
      ...(seVende && { precioVenta: parseDecimal(precioVenta, 2) ?? 0 }),
      pesoInicial: parseDecimal(pesoInicial, 2) ?? 0,
      tipoPeso,
      tonalidad: tonalidad.trim() || null,
      tipoDeposito,
      stockMinAlert: parseDecimal(stockMinAlert, 3) ?? 0,
      fechaVencimiento: vencimiento ? fechaToIso(vencimiento) : null,
      stock: parseDecimal(stock, 3) ?? 0,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>{rapido ? 'Queda en el stock y elegido en este producto.' : 'El QR se genera solo al crearlo.'}</Text>

      <TextField
        label="Nombre"
        placeholder="ej. Tintura Koleston"
        maxLength={MAX_NOMBRE_ARTICULO}
        value={nombre}
        onChangeText={setNombre}
        error={errores.nombre}
      />
      <MarcaField marcas={marcas} value={marcaId} onChange={setMarcaId} error={errores.marcaId} onCrearMarca={onCrearMarca} />
      <Opciones label="Tipo de producto" options={TIPO_PRODUCTO_LABEL} value={tipoProducto} onChange={setTipoProducto} />
      <TextField
        label="Tono o volumen (opcional)"
        placeholder="ej. 7.1 o 20 vol"
        maxLength={MAX_TONALIDAD}
        value={tonalidad}
        onChangeText={setTonalidad}
      />
      {!rapido && (
        <>
          <TextField
            label="Código del proveedor (opcional)"
            placeholder="ej. 725TS"
            maxLength={MAX_CODIGO_ARTICULO}
            value={codigo}
            onChangeText={setCodigo}
          />
          <Opciones label="Uso" options={USO_LABEL} value={uso} onChange={setUso} />
          <Opciones label="Dónde se guarda" options={DEPOSITO_LABEL} value={tipoDeposito} onChange={setTipoDeposito} />
        </>
      )}

      <TextField
        label="Contenido de un envase"
        placeholder="ej. 60"
        keyboardType="decimal-pad"
        maxLength={12}
        value={pesoInicial}
        onChangeText={setPesoInicial}
        error={errores.pesoInicial}
      />
      <Opciones label="Unidad" options={UNIDAD_LABEL} value={tipoPeso} onChange={setTipoPeso} />

      <TextField
        label="Precio de costo ($)"
        placeholder="ej. 12500"
        keyboardType="decimal-pad"
        maxLength={12}
        value={precioCosto}
        onChangeText={setPrecioCosto}
        hint="Lo que paga el salón por un envase"
        error={errores.precioCosto}
      />
      {seVende && (
        <TextField
          label="Precio de venta ($)"
          placeholder="ej. 18000"
          keyboardType="decimal-pad"
          maxLength={12}
          value={precioVenta}
          onChangeText={setPrecioVenta}
          error={errores.precioVenta}
        />
      )}

      <TextField
        label={rapido ? 'Envases que hay' : 'Stock inicial'}
        keyboardType="decimal-pad"
        maxLength={12}
        value={stock}
        onChangeText={setStock}
        hint="En envases"
        error={errores.stock}
      />
      {!rapido && (
        <>
          <TextField
            label="Stock mínimo"
            keyboardType="decimal-pad"
            maxLength={12}
            value={stockMinAlert}
            onChangeText={setStockMinAlert}
            hint="En envases: avisa al llegar a este número"
            error={errores.stockMinAlert}
          />
          <TextField
            label="Vencimiento (opcional)"
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            maxLength={10}
            value={vencimiento}
            onChangeText={(text) => setVencimiento(maskFecha(text))}
            error={errores.vencimiento}
          />
        </>
      )}

      {error ? <FormMessage message={error} /> : null}
      {errorAction}

      <View style={styles.actions}>
        <Button onPress={submit} isLoading={isLoading}>
          Crear artículo
        </Button>
        <Button variant="grey" onPress={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.error,
  },
  box: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actions: {
    gap: spacing.sm,
  },
});
