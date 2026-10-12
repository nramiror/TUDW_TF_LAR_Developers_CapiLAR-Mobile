import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { addMyServiceRequest, getMyServicesRequest, removeMyServiceRequest } from '@/api/professionals';
import { formatPrice, formatServiceDuration, getServicesRequest } from '@/api/services';
import type { Servicio } from '@/api/services';
import { Button } from '@/components/button/button';
import { FormMessage } from '@/components/formMessage/formMessage';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

// Catálogo del salón con un interruptor por servicio para que el PROFESIONAL marque los que hace (igual que en la web).
// Los clientes solo pueden reservarle los servicios marcados
export const MyServices = () => {
  const { token } = useAuth();
  const [catalog, setCatalog] = useState<Servicio[]>([]);
  const [mine, setMine] = useState<Set<number>>(new Set());
  // Servicios con un cambio en curso: su interruptor queda deshabilitado hasta que responde el back
  const [saving, setSaving] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setLoadError('');
    try {
      const [all, own] = await Promise.all([getServicesRequest(), getMyServicesRequest(token)]);
      setCatalog(all);
      setMine(new Set(own.map((servicio) => servicio.id)));
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleIn = (set: Set<number>, id: number, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  };

  // Se marca al instante y, si el back rechaza el cambio, vuelve a como estaba
  const toggle = async (servicio: Servicio, on: boolean) => {
    if (!token) return;
    setError('');
    setMine((prev) => toggleIn(prev, servicio.id, on));
    setSaving((prev) => toggleIn(prev, servicio.id, true));
    try {
      if (on) await addMyServiceRequest(token, servicio.id);
      else await removeMyServiceRequest(token, servicio.id);
    } catch (err) {
      setMine((prev) => toggleIn(prev, servicio.id, !on));
      setError(errorMessage(err));
    } finally {
      setSaving((prev) => toggleIn(prev, servicio.id, false));
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Mis servicios</Text>
      <Text style={styles.hint}>Marcá los servicios que realizás. Los clientes solo pueden reservarte esos.</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.violet} style={styles.loading} accessibilityLabel="Cargando servicios" />
      ) : loadError ? (
        <>
          <FormMessage message={loadError} />
          <Button variant="secundario" onPress={load}>
            Reintentar
          </Button>
        </>
      ) : catalog.length === 0 ? (
        <Text style={styles.hint}>El salón todavía no tiene servicios cargados.</Text>
      ) : (
        <View style={styles.card}>
          {catalog.map((servicio, index) => (
            <View key={servicio.id} style={[styles.row, index > 0 && styles.divider]}>
              <View style={styles.rowText}>
                <Text style={styles.name}>{servicio.tipo}</Text>
                <Text style={styles.detail}>
                  {formatServiceDuration(servicio.tiempoDuracion)} · {formatPrice(servicio.precio)}
                </Text>
              </View>
              <Switch
                value={mine.has(servicio.id)}
                onValueChange={(on) => toggle(servicio, on)}
                disabled={saving.has(servicio.id)}
                trackColor={{ false: colors.border, true: colors.violet }}
                thumbColor={colors.white}
                accessibilityLabel={`Realizo ${servicio.tipo}`}
              />
            </View>
          ))}
        </View>
      )}

      {error !== '' && <FormMessage message={error} />}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  heading: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.lg,
    color: colors.black,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  loading: {
    paddingVertical: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.grey,
  },
});
