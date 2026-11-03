import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  MAX_COMPROBANTE,
  MAX_MOTIVO_MOVIMIENTO,
  MOVIMIENTO_LABEL,
  TIPOS_MANUALES,
  createMovimientoRequest,
  formatEnvases,
  getArticuloRequest,
} from '@/api/articulos';
import type { Articulo, TipoMovimientoManual } from '@/api/articulos';
import { ApiError } from '@/api/client';
import { Button } from '@/components/button/button';
import { Chip } from '@/components/chip/chip';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Loader } from '@/components/loader/loader';
import { Screen } from '@/components/screen/screen';
import { TextField } from '@/components/textField/textField';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';
import { parseDecimal } from '@/utils/validation';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

// Mismo tope que el back (DECIMAL(10,3))
const MAX_ENVASES = 9999999.999;

const TIPO_TEXTO: Record<TipoMovimientoManual, { ayuda: string; cantidad: string; motivo: string }> = {
  INGRESO: { ayuda: 'Entraron envases al salón (por ejemplo, llegó un pedido).', cantidad: '¿Cuántos envases entran?', motivo: 'Ej.: Pedido de la semana' },
  EGRESO: { ayuda: 'Salieron envases sin usarse en un turno (se rompió, se venció, se vendió).', cantidad: '¿Cuántos envases salen?', motivo: 'Ej.: Se cayó y se rompió' },
  AJUSTE: { ayuda: 'Contaste los envases y no coinciden: el stock queda en lo que contaste.', cantidad: '¿Cuántos envases contaste?', motivo: 'Ej.: Conteo mensual' },
};

interface Errores {
  cantidad?: string;
  motivo?: string;
}

// F11, desde el detalle de un artículo: ingreso, egreso o ajuste de stock (en envases, con hasta 3 decimales).
// Lo que se usa en los turnos lo descuenta la ficha técnica sola; esto es para lo demás
export default function MovimientoNuevo() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ articuloId: string }>();
  const articuloId = Number(params.articuloId);

  const [articulo, setArticulo] = useState<Articulo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [tipo, setTipo] = useState<TipoMovimientoManual>('INGRESO');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [comprobante, setComprobante] = useState('');
  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // El stock actual, para mostrar cómo queda
  useEffect(() => {
    if (!token) return;
    getArticuloRequest(token, articuloId)
      .then(setArticulo)
      .catch((err) => setLoadError(errorMessage(err)));
  }, [token, articuloId]);

  if (loadError) {
    return (
      <Screen edges={[]}>
        <FormMessage message={loadError} />
      </Screen>
    );
  }
  if (!articulo || !token) return <Loader />;

  const motivoObligatorio = tipo !== 'INGRESO';
  const valor = parseDecimal(cantidad, 3);
  const stockActual = Number(articulo.stock);

  // Cómo queda el stock con lo escrito (solo si el número es válido)
  const stockNuevo =
    valor === null ? null : tipo === 'INGRESO' ? stockActual + valor : tipo === 'EGRESO' ? stockActual - valor : valor;

  const validar = (): Errores => {
    const result: Errores = {};
    if (valor === null) result.cantidad = 'Escribí un número de envases, con hasta 3 decimales.';
    else if (tipo !== 'AJUSTE' && valor <= 0) result.cantidad = 'Tiene que ser mayor a 0.';
    else if (valor > MAX_ENVASES) result.cantidad = 'Es demasiado grande.';
    if (motivoObligatorio && !motivo.trim()) result.motivo = 'Contanos el motivo.';
    return result;
  };

  const guardar = async () => {
    const result = validar();
    setErrores(result);
    if (Object.keys(result).length > 0 || valor === null) return;

    setIsSaving(true);
    setError('');
    try {
      const { articulo: actualizado, stockNegativo } = await createMovimientoRequest(token, articuloId, {
        tipo,
        cantidad: valor,
        motivo: motivo.trim() || undefined,
        numComprobante: comprobante.trim() || undefined,
      });
      if (stockNegativo) {
        // Se permite (puede faltar cargar un ingreso), pero se avisa
        Alert.alert(
          'El stock quedó en negativo',
          `${actualizado.nombre} quedó en ${formatEnvases(actualizado.stock)}. Revisá si falta registrar algún ingreso.`,
          [{ text: 'Entendido', onPress: () => router.back() }],
        );
      } else {
        router.back();
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const texto = TIPO_TEXTO[tipo];

  return (
    <Screen edges={['bottom']} scroll>
      <View style={styles.resumen}>
        <Text style={styles.nombre}>{articulo.nombre}</Text>
        <Text style={styles.detail}>Stock actual: {formatEnvases(articulo.stock)}</Text>
      </View>

      <View style={styles.gapSm}>
        <Text style={styles.label}>Tipo de movimiento</Text>
        <View style={styles.chips}>
          {TIPOS_MANUALES.map((item) => (
            <Chip
              key={item}
              label={MOVIMIENTO_LABEL[item]}
              selected={tipo === item}
              onPress={() => {
                setTipo(item);
                setErrores({});
              }}
              style={styles.flex}
            />
          ))}
        </View>
        <Text style={styles.detail}>{texto.ayuda}</Text>
      </View>

      <TextField
        label={texto.cantidad}
        value={cantidad}
        onChangeText={(text) => {
          setCantidad(text);
          setErrores((prev) => ({ ...prev, cantidad: undefined }));
        }}
        keyboardType="decimal-pad"
        placeholder="Ej.: 2 o 0,5"
        error={errores.cantidad}
        hint={
          stockNuevo === null
            ? 'Se cuentan envases enteros o partes (0,5 es medio envase).'
            : `El stock queda en ${formatEnvases(stockNuevo)}${stockNuevo < 0 ? ' (en negativo)' : ''}.`
        }
      />

      <TextField
        label={motivoObligatorio ? 'Motivo' : 'Motivo (opcional)'}
        value={motivo}
        onChangeText={(text) => {
          setMotivo(text);
          setErrores((prev) => ({ ...prev, motivo: undefined }));
        }}
        placeholder={texto.motivo}
        maxLength={MAX_MOTIVO_MOVIMIENTO}
        error={errores.motivo}
      />

      <TextField
        label="N.º de comprobante (opcional)"
        value={comprobante}
        onChangeText={setComprobante}
        placeholder="Factura o ticket"
        maxLength={MAX_COMPROBANTE}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      {error ? <FormMessage message={error} /> : null}

      <Button onPress={guardar} isLoading={isSaving}>
        Registrar {MOVIMIENTO_LABEL[tipo].toLowerCase()}
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  resumen: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  nombre: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  gapSm: {
    gap: spacing.sm,
  },
});
