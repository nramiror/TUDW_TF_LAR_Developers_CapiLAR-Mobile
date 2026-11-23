import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import type { SugerenciaIA } from '@/api/fichas';
import { Chip } from '@/components/chip/chip';
import { TextLink } from '@/components/textLink/textLink';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

interface SugerenciaIACardProps {
  sugerencia: SugerenciaIA;
  // Cuántas fórmulas sugeridas quedaron en el formulario (0 si no había o si se mantuvieron las cargadas)
  formulasPrecargadas: number;
  // Sin él no se ofrece descartar (por ejemplo, después de guardar)
  onDescartar?: () => void;
  onCopiar: () => void;
}

// Texto del análisis para guardarlo en las observaciones internas: el back no lo guarda solo
export const analisisComoTexto = ({ analisis }: SugerenciaIA) =>
  [
    analisis.evolucion && `Evolución: ${analisis.evolucion}`,
    analisis.alertas.length > 0 && `Alertas: ${analisis.alertas.join(' ')}`,
    analisis.recomendacion && `Recomendación: ${analisis.recomendacion}`,
  ]
    .filter(Boolean)
    .join('\n');

// F14/F15: lo que devolvió la IA en la ficha técnica. Las alertas van primero y destacadas (F15: advertencia antes
// de trabajar); el diagnóstico y las fórmulas ya quedaron precargados en el formulario, sin guardar
export const SugerenciaIACard = ({ sugerencia, formulasPrecargadas, onDescartar, onCopiar }: SugerenciaIACardProps) => {
  const { alertas, evolucion, recomendacion } = sugerencia.analisis;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={18} color={colors.fuchsia} />
        <Text style={styles.title}>Sugerencia de IA</Text>
        {sugerencia.simulado && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Modo prueba</Text>
          </View>
        )}
      </View>

      {alertas.length > 0 ? (
        <View style={styles.alertas} accessibilityRole="alert">
          <Text style={styles.alertasTitle}>Antes de trabajar, tené en cuenta</Text>
          {alertas.map((alerta, index) => (
            <View key={index} style={styles.alerta}>
              <Ionicons name="warning" size={16} color={colors.error} style={styles.alertaIcon} />
              <Text style={styles.alertaText}>{alerta}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.row}>
          <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
          <Text style={styles.text}>Sin alertas para esta clienta.</Text>
        </View>
      )}

      {evolucion && (
        <View style={styles.block}>
          <Text style={styles.label}>Evolución del cabello</Text>
          <Text style={styles.text}>{evolucion}</Text>
        </View>
      )}
      {recomendacion && (
        <View style={styles.block}>
          <Text style={styles.label}>Recomendación para hoy</Text>
          <Text style={styles.text}>{recomendacion}</Text>
        </View>
      )}

      <Text style={styles.hint}>
        {formulasPrecargadas > 0
          ? `Precargamos el diagnóstico y ${formulasPrecargadas === 1 ? 'la fórmula sugerida' : `${formulasPrecargadas} fórmulas sugeridas`} en la ficha.`
          : 'Precargamos el diagnóstico sugerido en la ficha.'}{' '}
        Revisalo: no se guarda nada hasta que toques Guardar.
      </Text>

      <Chip label="Copiar el análisis a las observaciones" onPress={onCopiar} style={styles.chip} />
      {onDescartar && <TextLink label="Descartar sugerencia" onPress={onDescartar} />}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.fuchsia,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.md,
    color: colors.fuchsiaText,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
    color: colors.warning,
  },
  alertas: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.errorSurface,
  },
  alertasTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.error,
  },
  alerta: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  alertaIcon: {
    marginTop: 2,
  },
  alertaText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.black,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  block: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.black,
    lineHeight: 20,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
  chip: {
    alignSelf: 'flex-start',
  },
});
