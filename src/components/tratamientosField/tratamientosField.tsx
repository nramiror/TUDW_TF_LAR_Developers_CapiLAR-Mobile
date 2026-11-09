import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FRECUENCIAS_TRATAMIENTO, TRATAMIENTOS } from '@/api/tratamientos';
import type { TratamientoPrevio } from '@/api/tratamientos';
import { Chip } from '@/components/chip/chip';
import { TextField } from '@/components/textField/textField';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';
import { onlyDigits } from '@/utils/validation';

export const OTRO = 'Otro';
// Mismo largo que la web para lo que se escribe en "Otro"
const TRATAMIENTO_MAX = 60;
// Más atrás que esto, seguramente es un error de tipeo
const ANIOS_ATRAS = 50;

// Una fila mientras se edita (como tratamientoDraft en la web)
export interface TratamientoDraft {
  // Uno de la lista, "Otro" o "" si todavía no se eligió
  opcion: string;
  // Lo que se escribe con "Otro"
  otro: string;
  frecuencia: string;
  // "MM/AAAA" mientras se escribe
  ultimaVez: string;
}

export const newTratamiento = (): TratamientoDraft => ({ opcion: '', otro: '', frecuencia: '', ultimaVez: '' });

// Lo guardado -> fila: lo que no está en la lista va como "Otro"
export const toTratamientoDraft = ({ tratamiento, frecuencia, ultimaVez }: TratamientoPrevio): TratamientoDraft => {
  const deLaLista = TRATAMIENTOS.includes(tratamiento);
  return { opcion: deLaLista ? tratamiento : OTRO, otro: deLaLista ? '' : tratamiento, frecuencia, ultimaVez };
};

export const filaVacia = ({ opcion, otro, frecuencia, ultimaVez }: TratamientoDraft) => !opcion && !otro.trim() && !frecuencia && !ultimaVez;

// Mensaje de error de la fila, o undefined si está bien
export const validarTratamiento = (fila: TratamientoDraft) => {
  if (!fila.opcion) return 'Elegí el tratamiento';
  if (fila.opcion === OTRO && !fila.otro.trim()) return 'Escribí cuál fue el tratamiento';
  if (!fila.ultimaVez) return undefined;
  const match = /^(\d{2})\/(\d{4})$/.exec(fila.ultimaVez);
  const hoy = new Date();
  if (!match) return 'La última vez va como mes y año (ej. 03/2026)';
  const mes = Number(match[1]);
  const anio = Number(match[2]);
  if (mes < 1 || mes > 12) return 'El mes va de 01 a 12';
  if (anio < hoy.getFullYear() - ANIOS_ATRAS) return 'Revisá el año de la última vez';
  if (anio > hoy.getFullYear() || (anio === hoy.getFullYear() && mes > hoy.getMonth() + 1)) return 'La última vez no puede ser en el futuro';
  return undefined;
};

export const fromTratamientoDraft = ({ opcion, otro, frecuencia, ultimaVez }: TratamientoDraft): TratamientoPrevio => ({
  tratamiento: opcion === OTRO ? otro : opcion,
  frecuencia,
  ultimaVez,
});

// Mientras se escribe: solo números y la barra se pone sola ("032026" -> "03/2026")
const maskMesAnio = (value: string) => {
  const digits = onlyDigits(value).slice(0, 6);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

interface TratamientosFieldProps {
  filas: TratamientoDraft[];
  onChange: (filas: TratamientoDraft[]) => void;
  // Error de cada fila, por su posición
  errores: (string | undefined)[];
}

// Filas de tratamientos previos: tratamiento (lista + "Otro"), frecuencia y última vez. En el celu no hay
// desplegables: las opciones van en pastillas, y tocar la elegida la desmarca
export const TratamientosField = ({ filas, onChange, errores }: TratamientosFieldProps) => {
  const actualizar = (index: number, cambios: Partial<TratamientoDraft>) =>
    onChange(filas.map((fila, i) => (i === index ? { ...fila, ...cambios } : fila)));

  return (
    <View style={styles.container}>
      {filas.map((fila, index) => {
        // Una frecuencia que ya no está en la lista se conserva
        const frecuencias =
          fila.frecuencia && !FRECUENCIAS_TRATAMIENTO.includes(fila.frecuencia) ? [fila.frecuencia, ...FRECUENCIAS_TRATAMIENTO] : FRECUENCIAS_TRATAMIENTO;
        return (
          <View key={index} style={styles.fila}>
            <View style={styles.header}>
              <Text style={styles.label}>Tratamiento {index + 1}</Text>
              <Pressable
                onPress={() => onChange(filas.filter((_, i) => i !== index))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Quitar el tratamiento ${index + 1}`}
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.grey} />
              </Pressable>
            </View>
            <View style={styles.chips}>
              {[...TRATAMIENTOS, OTRO].map((opcion) => (
                <Chip
                  key={opcion}
                  label={opcion}
                  selected={fila.opcion === opcion}
                  onPress={() => actualizar(index, { opcion: fila.opcion === opcion ? '' : opcion })}
                />
              ))}
            </View>
            {fila.opcion === OTRO && (
              <TextField
                label="¿Cuál?"
                placeholder="ej. Matizador"
                maxLength={TRATAMIENTO_MAX}
                value={fila.otro}
                onChangeText={(text) => actualizar(index, { otro: text })}
              />
            )}
            <Text style={styles.label}>Frecuencia (opcional)</Text>
            <View style={styles.chips}>
              {frecuencias.map((frecuencia) => (
                <Chip
                  key={frecuencia}
                  label={frecuencia}
                  selected={fila.frecuencia === frecuencia}
                  onPress={() => actualizar(index, { frecuencia: fila.frecuencia === frecuencia ? '' : frecuencia })}
                />
              ))}
            </View>
            <TextField
              label="Última vez (opcional)"
              placeholder="MM/AAAA, ej. 03/2026"
              keyboardType="number-pad"
              maxLength={7}
              value={fila.ultimaVez}
              onChangeText={(text) => actualizar(index, { ultimaVez: maskMesAnio(text) })}
            />
            {errores[index] && <Text style={styles.error}>{errores[index]}</Text>}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  fila: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
});
