import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { NIVEL_LABEL, TIPO_DE_PELO_LABEL, UNIDAD_LABEL, VOLUMEN_LABEL } from '@/api/fichas';
import type { Ficha, FormulaInsumo } from '@/api/fichas';
import { formatFechaLarga } from '@/api/turnos';
import { FichaFotos } from '@/components/fichaFotos/fichaFotos';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// "Tintura · Koleston · tono 7.1 · 30 g"
export const formatInsumo = (insumo: FormulaInsumo) => {
  const cantidad =
    insumo.cantidad !== null && insumo.cantidad !== ''
      ? `${Number(insumo.cantidad).toLocaleString('es-AR')}${insumo.unidad ? ` ${UNIDAD_LABEL[insumo.unidad]}` : ''}`
      : null;
  return [insumo.producto, insumo.marca, insumo.tono && `tono ${insumo.tono}`, cantidad].filter(Boolean).join(' · ');
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

// Dato de la ficha; si no se cargó, no se muestra
const Dato = ({ label, value }: { label: string; value: string | null | undefined }) =>
  value ? (
    <View style={styles.dato}>
      <Text style={styles.datoLabel}>{label}</Text>
      <Text style={styles.datoValue}>{value}</Text>
    </View>
  ) : null;

interface FichaViewProps {
  ficha: Ficha;
}

// F08: ficha técnica completa, solo lectura (historial de la clienta o ficha ya cerrada)
export const FichaView = ({ ficha }: FichaViewProps) => {
  const antecedentes = [
    ['Porosidad', ficha.porosidad && NIVEL_LABEL[ficha.porosidad]],
    ['Elasticidad', ficha.elasticidad && NIVEL_LABEL[ficha.elasticidad]],
    ['Canas', ficha.porcentajeCanas !== null ? `${ficha.porcentajeCanas}%` : null],
    ['Tipo de pelo', ficha.tipoDePelo && TIPO_DE_PELO_LABEL[ficha.tipoDePelo]],
    ['Volumen', ficha.volumenDePelo && VOLUMEN_LABEL[ficha.volumenDePelo]],
    ['Tratamientos previos', ficha.tratamientosPrevios],
  ] as const;
  const sinAntecedentes = antecedentes.every(([, value]) => !value);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.badge, { borderColor: ficha.cerradaEn ? colors.grey : colors.warning }]}>
          <Text style={[styles.badgeText, { color: ficha.cerradaEn ? colors.grey : colors.warning }]}>
            {ficha.cerradaEn ? 'Cerrada' : 'Abierta: el turno todavía no se completó'}
          </Text>
        </View>
        <Text style={styles.date}>
          {capitalize(formatFechaLarga(ficha.fecha))}, {ficha.horaInicio} h
        </Text>
        <Text style={styles.detail}>
          {ficha.servicio} · {ficha.profesional}
        </Text>
      </View>

      <Section title="Antecedentes del cabello">
        {sinAntecedentes ? (
          <Text style={styles.empty}>No se cargaron</Text>
        ) : (
          antecedentes.map(([label, value]) => <Dato key={label} label={label} value={value} />)
        )}
      </Section>

      <Section title="Fórmulas aplicadas">
        {ficha.formulas.length === 0 ? (
          <Text style={styles.empty}>No se cargaron</Text>
        ) : (
          ficha.formulas.map((formula, index) => (
            <View key={formula.id ?? index} style={styles.formula}>
              <Text style={styles.formulaTitle}>
                {index + 1}. {formula.descripcion || 'Fórmula'}
              </Text>
              {(formula.oxidanteVolumen !== null || formula.tiempoPoseMin !== null) && (
                <Text style={styles.detail}>
                  {[
                    formula.oxidanteVolumen !== null && `Oxidante ${formula.oxidanteVolumen} vol.`,
                    formula.tiempoPoseMin !== null && `Pose ${formula.tiempoPoseMin} min`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              )}
              {formula.insumos.map((insumo, i) => (
                <Text key={insumo.id ?? i} style={styles.insumo}>
                  • {formatInsumo(insumo)}
                </Text>
              ))}
            </View>
          ))
        )}
      </Section>

      <Section title="Fotos">
        <FichaFotos fichaId={ficha.id} fotos={ficha.fotos} />
      </Section>

      <Section title="Indicaciones para la clienta">
        <Text style={ficha.indicacionesCliente ? styles.text : styles.empty}>{ficha.indicacionesCliente || 'No se cargaron'}</Text>
      </Section>

      <Section title="Observaciones internas">
        <Text style={ficha.observacionesInternas ? styles.text : styles.empty}>{ficha.observacionesInternas || 'No se cargaron'}</Text>
      </Section>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: colors.white,
    marginBottom: spacing.xs,
  },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
  },
  date: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  section: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  dato: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  datoLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  datoValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  formula: {
    gap: 2,
  },
  formulaTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.violet,
  },
  insumo: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.black,
    lineHeight: 20,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.greyLight,
  },
});
