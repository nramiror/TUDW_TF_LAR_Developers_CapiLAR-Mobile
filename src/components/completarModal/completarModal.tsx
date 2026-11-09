import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getArticulosRequest } from '@/api/articulos';
import { getFichaRequest, insumosDeFicha, textoSinPrecio, totalDeProductos } from '@/api/fichas';
import type { TotalDeProductos } from '@/api/fichas';
import { formatPrice } from '@/api/services';
import { METODO_PAGO_LABEL } from '@/api/turnos';
import type { CompletarTurnoData, MetodoPago, Turno } from '@/api/turnos';
import { Button } from '@/components/button/button';
import { Chip } from '@/components/chip/chip';
import { FormMessage } from '@/components/formMessage/formMessage';
import { TextField } from '@/components/textField/textField';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';
import { parseDecimal } from '@/utils/validation';

// Mismo tope que el back (Decimal 10,2)
const MAX_PRECIO = 99999999.99;

interface CompletarModalProps {
  // null: cerrado
  turno: Turno | null;
  isLoading?: boolean;
  onConfirm: (data: CompletarTurnoData) => void;
  onClose: () => void;
}

// "15000.00" -> "15000" para precargar el campo
const precioText = (precio: string) => String(Number(precio));

const validarPrecio = (texto: string) => {
  if (!texto.trim()) return 'Indicá cuánto se cobró';
  const valor = parseDecimal(texto, 2);
  if (valor === null) return 'Un número con hasta 2 decimales, sin puntos';
  if (valor > MAX_PRECIO) return 'El precio es demasiado alto';
  return '';
};

// F12 (igual que la web): antes de completar, lo que se cobró por cada servicio (arranca con el precio base) y el
// método de pago. Debajo de cada servicio, lo que suman sus productos, para decidir cuánto cobrar
export const CompletarModal = ({ turno, isLoading = false, onConfirm, onClose }: CompletarModalProps) => {
  const { token, user } = useAuth();
  const legajo = user?.profesional?.legajo;
  const [precios, setPrecios] = useState<Record<number, string>>({});
  const [errores, setErrores] = useState<Record<number, string>>({});
  const [metodoPago, setMetodoPago] = useState<MetodoPago | null>(null);
  const [errorMetodo, setErrorMetodo] = useState('');
  // Productos de la ficha de cada servicio (por id de ficha). Si no se pueden calcular, se completa igual sin la línea
  const [costos, setCostos] = useState<Map<number, TotalDeProductos>>(new Map());

  // Cada vez que se abre, arranca con los precios de lista y el método que eligió la clienta al reservar (si eligió)
  useEffect(() => {
    if (!turno) return;
    setPrecios(Object.fromEntries(turno.detalles.map((detalle) => [detalle.id, precioText(detalle.precioBase)])));
    setErrores({});
    setMetodoPago(turno.metodoPago);
    setErrorMetodo('');
    setCostos(new Map());

    const fichaIds = turno.detalles.flatMap((detalle) => (detalle.fichaId ? [detalle.fichaId] : []));
    if (!token || fichaIds.length === 0) return;
    let cancelled = false;
    Promise.all([Promise.all(fichaIds.map((id) => getFichaRequest(token, id))), getArticulosRequest(token, 'SALON')])
      .then(([fichas, articulos]) => {
        if (!cancelled) setCostos(new Map(fichas.map((ficha) => [ficha.id, totalDeProductos(insumosDeFicha(ficha), articulos)])));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [turno, token]);

  if (!turno) return null;

  // Con servicios de más de un profesional, se aclara de quién es cada uno
  const variosProfesionales = new Set(turno.detalles.map((detalle) => detalle.legajo)).size > 1;
  // Al completar, las fichas se cierran: si el servicio propio no tiene, ya no se puede cargar
  const sinFicha = turno.detalles.some((detalle) => detalle.legajo === legajo && !detalle.fichaId);
  const total = turno.detalles.reduce((suma, detalle) => suma + (parseDecimal(precios[detalle.id] ?? '', 2) ?? 0), 0);

  const confirm = () => {
    const nuevos = Object.fromEntries(turno.detalles.map((detalle) => [detalle.id, validarPrecio(precios[detalle.id] ?? '')]));
    setErrores(nuevos);
    setErrorMetodo(metodoPago ? '' : 'Elegí cómo se pagó');
    if (!metodoPago || Object.values(nuevos).some(Boolean)) return;
    onConfirm({
      detalles: turno.detalles.map((detalle) => ({
        turnoDetalleId: detalle.id,
        precioFinal: parseDecimal(precios[detalle.id] ?? '', 2) ?? 0,
      })),
      metodoPago,
    });
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.backdrop} behavior="padding">
        <Pressable style={StyleSheet.absoluteFill} onPress={isLoading ? undefined : onClose} accessibilityLabel="Cerrar" />
        <View style={styles.dialog}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Completar turno</Text>
            <Text style={styles.subtitle}>
              {turno.cliente.nombre} {turno.cliente.apellido} · {turno.horaInicio} h
            </Text>

            <Text style={styles.label}>¿Cuánto se cobró?</Text>
            {turno.detalles.map((detalle) => {
              const productos = detalle.fichaId ? costos.get(detalle.fichaId) : undefined;
              return (
                <View key={detalle.id} style={styles.servicio}>
                  <View style={styles.servicioInfo}>
                    <Text style={styles.servicioNombre}>{detalle.servicio}</Text>
                    {variosProfesionales && <Text style={styles.detail}>{detalle.profesional}</Text>}
                    <Text style={styles.detail}>Desde {formatPrice(detalle.precioBase)}</Text>
                    {productos && productos.total > 0 && (
                      <Text style={styles.detail}>
                        Productos{productos.estimado ? ' (estimado)' : ''}: {formatPrice(productos.total)}
                      </Text>
                    )}
                    {productos && productos.sinPrecio > 0 && <Text style={styles.detail}>{textoSinPrecio(productos.sinPrecio)}</Text>}
                  </View>
                  <View style={styles.precio}>
                    <TextField
                      label="Cobrado"
                      accessibilityLabel={`Precio cobrado por ${detalle.servicio}`}
                      keyboardType="decimal-pad"
                      maxLength={12}
                      value={precios[detalle.id] ?? ''}
                      onChangeText={(text) => {
                        setPrecios((prev) => ({ ...prev, [detalle.id]: text }));
                        setErrores((prev) => ({ ...prev, [detalle.id]: '' }));
                      }}
                      error={errores[detalle.id] || undefined}
                    />
                  </View>
                </View>
              );
            })}
            {turno.detalles.length > 1 && (
              <View style={styles.totalRow}>
                <Text style={styles.total}>Total</Text>
                <Text style={styles.total}>{formatPrice(total)}</Text>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Método de pago</Text>
              <View style={styles.chips}>
                {(Object.keys(METODO_PAGO_LABEL) as MetodoPago[]).map((metodo) => (
                  <Chip
                    key={metodo}
                    label={METODO_PAGO_LABEL[metodo]}
                    selected={metodoPago === metodo}
                    onPress={() => {
                      setMetodoPago(metodo);
                      setErrorMetodo('');
                    }}
                  />
                ))}
              </View>
              {errorMetodo !== '' && <FormMessage message={errorMetodo} />}
            </View>

            <Text style={styles.description}>El precio y el método de pago no se pueden cambiar después.</Text>
            <Text style={[styles.description, sinFicha && styles.warning]}>
              {sinFicha
                ? 'Ojo: todavía no cargaste la ficha técnica y, una vez completado, ya no se puede cargar.'
                : 'La ficha técnica se cierra y la clienta ve tus indicaciones y las fotos en su historial.'}
            </Text>

            <View style={styles.actions}>
              <Button onPress={confirm} isLoading={isLoading}>
                Completar turno
              </Button>
              <Button variant="grey" onPress={onClose} disabled={isLoading}>
                Volver
              </Button>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  dialog: {
    maxHeight: '90%',
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.lg,
    color: colors.black,
  },
  subtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  servicio: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  servicioInfo: {
    flex: 1,
    gap: 2,
  },
  servicioNombre: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.grey,
  },
  precio: {
    width: 130,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  total: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.md,
    color: colors.violet,
  },
  field: {
    gap: spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
  warning: {
    fontFamily: fonts.bodyMedium,
    color: colors.warning,
  },
  actions: {
    gap: spacing.sm,
  },
});
