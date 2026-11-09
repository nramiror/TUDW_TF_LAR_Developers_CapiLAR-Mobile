import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatPrice } from '@/api/services';
import { METODO_PAGO_LABEL } from '@/api/turnos';
import type { CompletarTurnoData, MetodoPago, Turno } from '@/api/turnos';
import { Button } from '@/components/button/button';
import { Chip } from '@/components/chip/chip';
import { FormMessage } from '@/components/formMessage/formMessage';
import { TextField } from '@/components/textField/textField';
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

// F12: antes de completar, lo que se cobró por cada servicio (precargado con el precio de lista) y cómo se pagó.
// Se manda todo junto porque después el precio final no se puede cambiar
export const CompletarModal = ({ turno, isLoading = false, onConfirm, onClose }: CompletarModalProps) => {
  const [precios, setPrecios] = useState<Record<number, string>>({});
  const [errores, setErrores] = useState<Record<number, string>>({});
  const [metodoPago, setMetodoPago] = useState<MetodoPago | null>(null);
  const [error, setError] = useState('');

  // Cada vez que se abre, arranca con los precios de lista y el método que eligió la clienta al reservar (si eligió)
  useEffect(() => {
    if (!turno) return;
    setPrecios(Object.fromEntries(turno.detalles.map((detalle) => [detalle.id, precioText(detalle.precioBase)])));
    setErrores({});
    setMetodoPago(turno.metodoPago);
    setError('');
  }, [turno]);

  if (!turno) return null;

  // Con servicios de más de un profesional, se aclara de quién es cada uno
  const variosProfesionales = new Set(turno.detalles.map((detalle) => detalle.legajo)).size > 1;

  const valores = turno.detalles.map((detalle) => parseDecimal(precios[detalle.id] ?? '', 2));
  const total = valores.every((valor) => valor !== null) ? valores.reduce<number>((sum, valor) => sum + (valor ?? 0), 0) : null;

  const confirm = () => {
    const nuevosErrores: Record<number, string> = {};
    turno.detalles.forEach((detalle, index) => {
      const valor = valores[index];
      if (valor === null) nuevosErrores[detalle.id] = 'Escribí el precio en números, sin puntos (ej. 18000 o 18000,50)';
      else if (valor > MAX_PRECIO) nuevosErrores[detalle.id] = 'El precio es demasiado alto';
    });
    setErrores(nuevosErrores);
    if (!metodoPago) setError('Elegí cómo pagó la clienta');
    if (Object.keys(nuevosErrores).length > 0 || !metodoPago) return;
    onConfirm({
      detalles: turno.detalles.map((detalle, index) => ({ turnoDetalleId: detalle.id, precioFinal: valores[index] ?? 0 })),
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
            <Text style={styles.description}>
              Turno de {turno.cliente.nombre} {turno.cliente.apellido}. Cargá lo que cobraste: después no se puede cambiar.
            </Text>

            {turno.detalles.map((detalle) => (
              <TextField
                key={detalle.id}
                label={variosProfesionales ? `${detalle.servicio} · ${detalle.profesional}` : detalle.servicio}
                hint={`Precio de lista: ${formatPrice(detalle.precioBase)}`}
                keyboardType="decimal-pad"
                maxLength={12}
                value={precios[detalle.id] ?? ''}
                onChangeText={(text) => {
                  setPrecios((prev) => ({ ...prev, [detalle.id]: text }));
                  setErrores((prev) => ({ ...prev, [detalle.id]: '' }));
                }}
                error={errores[detalle.id]}
              />
            ))}

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
                      setError('');
                    }}
                  />
                ))}
              </View>
            </View>

            {total !== null && turno.detalles.length > 1 && <Text style={styles.total}>Total: {formatPrice(total)}</Text>}

            {error !== '' && <FormMessage message={error} />}

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
  description: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
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
  total: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.md,
    color: colors.violet,
  },
  actions: {
    gap: spacing.sm,
  },
});
