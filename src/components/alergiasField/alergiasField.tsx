import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { MAX_ALERGIAS, getAlergiasRequest } from '@/api/alergias';
import type { AlergiaCliente } from '@/api/alergias';
import { Chip } from '@/components/chip/chip';
import { TextField } from '@/components/textField/textField';
import { colors, fonts, fontSizes, spacing } from '@/theme';

interface AlergiasFieldProps {
  // id de las elegidas
  selected: number[];
  onChangeSelected: (ids: number[]) => void;
  // "Otra": lo que no está en la lista
  otra: string;
  onChangeOtra: (text: string) => void;
  // Las que ya tiene la clienta: se muestran aunque el salón las haya dado de baja, para poder conservarlas o quitarlas
  actuales?: AlergiaCliente[];
}

// Alergias de la clienta (registro y editar perfil): pastillas con la lista del salón y "Otra" en texto libre.
// Si la lista no carga, igual se puede escribir en "Otra"
export const AlergiasField = ({ selected, onChangeSelected, otra, onChangeOtra, actuales = [] }: AlergiasFieldProps) => {
  const [lista, setLista] = useState<AlergiaCliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(false);
    getAlergiasRequest()
      .then((result) => !cancelled && setLista(result))
      .catch(() => !cancelled && setLoadError(true))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [intento]);

  // La lista activa más las que ya tiene y ya no están en ella
  const opciones = [...lista, ...actuales.filter((actual) => !lista.some((alergia) => alergia.id === actual.id))];

  const toggle = (id: number) => {
    if (selected.includes(id)) onChangeSelected(selected.filter((item) => item !== id));
    else if (selected.length < MAX_ALERGIAS) onChangeSelected([...selected, id]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Alergias o sensibilidades (opcional)</Text>
      <Text style={styles.hint}>Le sirve a tu estilista para elegir los productos. Tocá las que tengas.</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.violet} style={styles.loading} accessibilityLabel="Cargando alergias" />
      ) : (
        <>
          {loadError && (
            <View style={styles.errorRow}>
              <Text style={styles.error}>No pudimos cargar la lista. Podés escribirlas en &quot;Otra&quot;.</Text>
              <Chip label="Reintentar" onPress={() => setIntento((n) => n + 1)} />
            </View>
          )}
          {opciones.length > 0 && (
            <View style={styles.chips}>
              {opciones.map((alergia) => (
                <Chip key={alergia.id} label={alergia.nombre} selected={selected.includes(alergia.id)} onPress={() => toggle(alergia.id)} />
              ))}
            </View>
          )}
        </>
      )}

      <TextField
        label="Otra (opcional)"
        placeholder="ej. aceite de coco"
        hint="Lo que no esté en la lista"
        maxLength={255}
        value={otra}
        onChangeText={onChangeOtra}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.grey,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  loading: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
  },
  errorRow: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  error: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.error,
  },
});
