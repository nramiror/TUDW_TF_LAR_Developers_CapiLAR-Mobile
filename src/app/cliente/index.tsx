import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { agruparPorCategoria, getServicesRequest } from '@/api/services';
import type { Servicio } from '@/api/services';
import { Button } from '@/components/button/button';
import { CategoriaChips } from '@/components/categoriaChips/categoriaChips';
import { EmailVerification } from '@/components/emailVerification/emailVerification';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Greeting } from '@/components/greeting/greeting';
import { Screen } from '@/components/screen/screen';
import { ServiceCard } from '@/components/serviceCard/serviceCard';
import { colors, fonts, fontSizes, gradient, radius, spacing } from '@/theme';

// F03: catálogo de servicios. Al tocar uno se elige profesional, día y horario (reservar/[servicioId]).
// Arriba, la entrada a "Probá un color" (TP3, YouCam), como en el menú de la web.
// Encuesta del TP4 (como la web): agrupados por categoría, con pastillas para ver una sola
export default function Reservar() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  // Pastilla de categoría elegida; null: todas
  const [categoriaId, setCategoriaId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setServicios(await getServicesRequest());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, [load]);

  const refresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const grupos = agruparPorCategoria(servicios);
  // Si la categoría elegida se quedó sin servicios (al refrescar), se vuelve a "Todas"
  const visibles = grupos.filter((grupo) => categoriaId === null || grupo.categoria.id === categoriaId);
  const sections = (visibles.length > 0 ? visibles : grupos).map(({ categoria, servicios: data }) => ({ categoria, data }));

  const empty = isLoading ? (
    <ActivityIndicator color={colors.violet} style={styles.loading} accessibilityLabel="Cargando servicios" />
  ) : error ? (
    <View style={styles.gap}>
      <FormMessage message={error} />
      <Button variant="secundario" onPress={refresh}>
        Reintentar
      </Button>
    </View>
  ) : (
    <Text style={styles.hint}>Todavía no hay servicios para reservar.</Text>
  );

  return (
    <Screen edges={[]} style={styles.screen}>
      <SectionList
        sections={error ? [] : sections}
        keyExtractor={(servicio) => String(servicio.id)}
        renderItem={({ item }) => (
          <ServiceCard servicio={item} onPress={() => router.push({ pathname: '/reservar/[servicioId]', params: { servicioId: item.id } })} />
        )}
        // Con una sola categoría no hace falta el título
        renderSectionHeader={({ section }) =>
          grupos.length > 1 ? (
            <Text style={styles.categoria} accessibilityRole="header">
              {section.categoria.nombre}
            </Text>
          ) : null
        }
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Greeting subtitle="¿Qué te querés hacer?" />
            {/* Encuesta del TP4: el aviso solo estaba en el perfil y no lo veían hasta querer reservar */}
            <EmailVerification />
            <Pressable
              onPress={() => router.push('/probar-color')}
              style={({ pressed }) => pressed && styles.pressed}
              accessibilityRole="button"
              accessibilityLabel="Probá un color con inteligencia artificial"
            >
              {/* Pedido de Andrea: clara por dentro y con el degradado solo en el borde (el padding deja ver el degradado) */}
              <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={styles.colorBorder}>
                <View style={styles.colorCard}>
                  <View style={styles.colorIcon}>
                    <Ionicons name="color-palette-outline" size={24} color={colors.violet} />
                  </View>
                  <View style={styles.colorTexts}>
                    <View style={styles.colorTitleRow}>
                      <Text style={styles.colorTitle}>Probá un color</Text>
                      {/* Pedido de Linda (demo del 75%): que se vea que la función usa IA */}
                      <View style={styles.aiBadge}>
                        <Ionicons name="sparkles" size={12} color={colors.white} />
                        <Text style={styles.aiBadgeText}>IA</Text>
                      </View>
                    </View>
                    <Text style={styles.colorText}>Subí una selfie y mirá cómo te quedaría antes de reservar.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.violet} />
                </View>
              </LinearGradient>
            </Pressable>
            <Text style={styles.hint}>Elegí un servicio para ver los días y horarios disponibles.</Text>
            {!error && grupos.length > 1 && (
              <CategoriaChips
                categorias={grupos.map((grupo) => grupo.categoria)}
                value={visibles.length > 0 ? categoriaId : null}
                onChange={setCategoriaId}
              />
            )}
          </View>
        }
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[colors.violet]} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 0,
  },
  list: {
    padding: spacing.md,
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  colorBorder: {
    padding: 1.5,
    borderRadius: radius.md,
  },
  colorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md - 1.5,
    backgroundColor: colors.surface,
  },
  colorIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  colorTexts: {
    flex: 1,
    gap: 2,
  },
  colorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.full,
    backgroundColor: colors.violet,
  },
  aiBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
    color: colors.white,
  },
  colorTitle: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  colorText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  pressed: {
    opacity: 0.85,
  },
  separator: {
    height: spacing.sm,
  },
  // Como el título de categoría de la web: chico, en mayúsculas y gris
  categoria: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
    color: colors.grey,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  loading: {
    paddingVertical: spacing.xl,
  },
  gap: {
    gap: spacing.md,
  },
});
