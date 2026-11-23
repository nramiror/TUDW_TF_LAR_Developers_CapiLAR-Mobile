import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SelectField } from '@/components/selectField/selectField';
import type { SelectOption } from '@/components/selectField/selectField';
import { TextField } from '@/components/textField/textField';
import { colors, fonts, fontSizes, radius, spacing, useAccent } from '@/theme';
import { fechaToIso, maskFecha } from '@/utils/validation';

// Lo que usan los filtros de una ficha (sirve para la del salón y la que ve la clienta)
interface FichaFiltrable {
  // "YYYY-MM-DD"
  fecha: string;
  servicio: string;
  profesional: string;
}

type FiltroFecha = 'todas' | 'rango';

const TODOS = '';
const OPCIONES_FECHA: SelectOption<FiltroFecha>[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'rango', label: 'Elegir rango' },
];

// Opciones de un desplegable con los valores que aparecen en el historial (no todo el catálogo), por nombre
const opciones = (valores: string[]): SelectOption<string>[] => [
  { value: TODOS, label: 'Todos' },
  ...[...new Set(valores)].sort((a, b) => a.localeCompare(b, 'es')).map((valor) => ({ value: valor, label: valor })),
];

/**
 * Filtros del historial capilar por servicio, fecha (todas o un rango) y, opcional, profesional (como PWA-299 de la web).
 * Se filtra en el celu: el historial ya llega completo. Devuelve las fichas filtradas y el bloque de filtros, para ponerlo
 * de encabezado de la lista
 */
export const useHistorialFiltrado = <T extends FichaFiltrable>(fichas: T[], conProfesional = false) => {
  const accent = useAccent();
  const [servicio, setServicio] = useState(TODOS);
  const [profesional, setProfesional] = useState(TODOS);
  const [fecha, setFecha] = useState<FiltroFecha>('todas');
  // Lo que se escribe ("DD/MM/AAAA"): el rango cuenta recién con las dos fechas completas y en orden
  const [rango, setRango] = useState({ desde: '', hasta: '' });

  const desde = fechaToIso(rango.desde);
  const hasta = fechaToIso(rango.hasta);
  const rangoInvertido = Boolean(desde && hasta && desde > hasta);
  const conRango = fecha === 'rango' && desde !== null && hasta !== null && !rangoInvertido;

  // "YYYY-MM-DD" se compara como texto
  const filtradas = fichas.filter(
    (ficha) =>
      (servicio === TODOS || ficha.servicio === servicio) &&
      (profesional === TODOS || ficha.profesional === profesional) &&
      (!conRango || (ficha.fecha >= desde && ficha.fecha <= hasta)),
  );

  const conFiltros = servicio !== TODOS || profesional !== TODOS || fecha !== 'todas';
  const limpiar = () => {
    setServicio(TODOS);
    setProfesional(TODOS);
    setFecha('todas');
    setRango({ desde: '', hasta: '' });
  };

  const servicioField = (
    <SelectField label="Servicio" value={servicio} options={opciones(fichas.map((f) => f.servicio))} onChange={setServicio} style={styles.flex} />
  );
  const fechaField = <SelectField label="Fecha" value={fecha} options={OPCIONES_FECHA} onChange={setFecha} style={styles.flex} />;

  // Sin fichas no hay nada que filtrar
  const filtros =
    fichas.length === 0 ? null : (
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: accent.surface }]}>
          {conProfesional ? (
            <>
              <View style={styles.row}>
                {servicioField}
                <SelectField
                  label="Profesional"
                  value={profesional}
                  options={opciones(fichas.map((f) => f.profesional))}
                  onChange={setProfesional}
                  style={styles.flex}
                />
              </View>
              <View style={styles.row}>
                {fechaField}
                {/* Mitad vacía: la fecha queda del mismo ancho que los de arriba */}
                <View style={styles.flex} />
              </View>
            </>
          ) : (
            <View style={styles.row}>
              {servicioField}
              {fechaField}
            </View>
          )}

          {fecha === 'rango' && (
            <>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <TextField
                    label="Desde"
                    value={rango.desde}
                    onChangeText={(value) => setRango((prev) => ({ ...prev, desde: maskFecha(value) }))}
                    placeholder="DD/MM/AAAA"
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>
                <View style={styles.flex}>
                  <TextField
                    label="Hasta"
                    value={rango.hasta}
                    onChangeText={(value) => setRango((prev) => ({ ...prev, hasta: maskFecha(value) }))}
                    placeholder="DD/MM/AAAA"
                    keyboardType="number-pad"
                    maxLength={10}
                    error={rangoInvertido ? '"Desde" tiene que ser antes que "Hasta"' : undefined}
                  />
                </View>
              </View>
              {!conRango && !rangoInvertido && <Text style={styles.hint}>Se filtra cuando completás las dos fechas.</Text>}
            </>
          )}

          {conFiltros && (
            <Pressable onPress={limpiar} hitSlop={spacing.sm} style={styles.clear} accessibilityRole="button">
              <Ionicons name="close" size={16} color={colors.grey} />
              <Text style={styles.clearText}>Limpiar filtros</Text>
            </Pressable>
          )}
        </View>
        {/* Se anuncia al cambiar, para quien usa TalkBack */}
        {conFiltros && (
          <Text style={styles.hint} accessibilityLiveRegion="polite">
            Mostrando {filtradas.length} de {fichas.length} {fichas.length === 1 ? 'ficha' : 'fichas'}
          </Text>
        )}
      </View>
    );

  return { filtradas, filtros, conFiltros };
};

// Lo que va en la lista vacía cuando hay fichas pero ninguna pasa los filtros
export const SIN_RESULTADOS = 'No hay fichas con estos filtros.';

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.grey,
  },
  clear: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: spacing.xs,
  },
  clearText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
});
