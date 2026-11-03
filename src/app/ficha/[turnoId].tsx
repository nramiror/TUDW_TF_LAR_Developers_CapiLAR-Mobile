import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import {
  MAX_FORMULAS,
  MAX_INSUMOS,
  NIVEL_LABEL,
  TIPO_DE_PELO_LABEL,
  UNIDAD_LABEL,
  VOLUMEN_LABEL,
  createFichaRequest,
  deleteFichaPhotoRequest,
  getFichaRequest,
  updateFichaRequest,
  uploadFichaPhotoRequest,
} from '@/api/fichas';
import type {
  Ficha,
  FichaData,
  Formula,
  FormulaInsumo,
  FotoFicha,
  MomentoFoto,
  NivelCapilar,
  TipoDePelo,
  UnidadInsumo,
  VolumenDePelo,
} from '@/api/fichas';
import { formatFechaLarga } from '@/api/turnos';
import { Button } from '@/components/button/button';
import { Chip } from '@/components/chip/chip';
import { FichaFotos } from '@/components/fichaFotos/fichaFotos';
import { FichaView } from '@/components/fichaView/fichaView';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Screen } from '@/components/screen/screen';
import { TextField } from '@/components/textField/textField';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';
import { pickImage } from '@/utils/pickImage';
import type { ImageSource } from '@/utils/pickImage';

// Lo que se edita: los números van como texto mientras se escriben
interface InsumoForm {
  producto: string;
  marca: string;
  tono: string;
  cantidad: string;
  unidad: UnidadInsumo | null;
}

interface FormulaForm {
  descripcion: string;
  oxidanteVolumen: string;
  tiempoPoseMin: string;
  insumos: InsumoForm[];
}

interface FichaForm {
  porosidad: NivelCapilar | null;
  elasticidad: NivelCapilar | null;
  porcentajeCanas: string;
  tipoDePelo: TipoDePelo | null;
  volumenDePelo: VolumenDePelo | null;
  tratamientosPrevios: string;
  observacionesInternas: string;
  indicacionesCliente: string;
  formulas: FormulaForm[];
}

const EMPTY_INSUMO: InsumoForm = { producto: '', marca: '', tono: '', cantidad: '', unidad: 'G' };
const EMPTY_FORMULA: FormulaForm = { descripcion: '', oxidanteVolumen: '', tiempoPoseMin: '', insumos: [EMPTY_INSUMO] };

const numberText = (value: number | string | null) => (value === null || value === '' ? '' : String(Number(value)));

const toForm = (ficha: Ficha | null): FichaForm => ({
  porosidad: ficha?.porosidad ?? null,
  elasticidad: ficha?.elasticidad ?? null,
  porcentajeCanas: numberText(ficha?.porcentajeCanas ?? null),
  tipoDePelo: ficha?.tipoDePelo ?? null,
  volumenDePelo: ficha?.volumenDePelo ?? null,
  tratamientosPrevios: ficha?.tratamientosPrevios ?? '',
  observacionesInternas: ficha?.observacionesInternas ?? '',
  indicacionesCliente: ficha?.indicacionesCliente ?? '',
  formulas: (ficha?.formulas ?? []).map((formula) => ({
    descripcion: formula.descripcion ?? '',
    oxidanteVolumen: numberText(formula.oxidanteVolumen),
    tiempoPoseMin: numberText(formula.tiempoPoseMin),
    insumos: formula.insumos.map((insumo) => ({
      producto: insumo.producto,
      marca: insumo.marca ?? '',
      tono: insumo.tono ?? '',
      cantidad: numberText(insumo.cantidad),
      unidad: insumo.unidad,
    })),
  })),
});

// Entero dentro del rango, o null si está vacío; undefined si no es válido
const parseEntero = (text: string, min: number, max: number) => {
  const value = text.trim();
  if (!value) return null;
  const number = Number(value);
  return /^\d+$/.test(value) && number >= min && number <= max ? number : undefined;
};

// Mismas reglas que el back. Las fórmulas e insumos que quedaron vacíos no se mandan
const toData = (form: FichaForm): { data: FichaData } | { error: string } => {
  const porcentajeCanas = parseEntero(form.porcentajeCanas, 0, 100);
  if (porcentajeCanas === undefined) return { error: 'El porcentaje de canas tiene que ser un número de 0 a 100.' };

  const formulas: Formula[] = [];
  for (const [i, formula] of form.formulas.entries()) {
    const n = i + 1;
    const oxidanteVolumen = parseEntero(formula.oxidanteVolumen, 1, 60);
    if (oxidanteVolumen === undefined) return { error: `Fórmula ${n}: el oxidante va de 1 a 60 vol.` };
    const tiempoPoseMin = parseEntero(formula.tiempoPoseMin, 1, 240);
    if (tiempoPoseMin === undefined) return { error: `Fórmula ${n}: el tiempo de pose va de 1 a 240 minutos.` };

    const insumos: FormulaInsumo[] = [];
    for (const [j, insumo] of formula.insumos.entries()) {
      const vacio = !insumo.producto.trim() && !insumo.marca.trim() && !insumo.tono.trim() && !insumo.cantidad.trim();
      if (vacio) continue;
      if (!insumo.producto.trim()) return { error: `Fórmula ${n}, insumo ${j + 1}: falta el producto.` };
      const cantidadText = insumo.cantidad.trim().replace(',', '.');
      if (cantidadText && (!/^\d+(\.\d{1,2})?$/.test(cantidadText) || Number(cantidadText) <= 0)) {
        return { error: `Fórmula ${n}, insumo ${j + 1}: la cantidad tiene que ser mayor a 0, con hasta 2 decimales.` };
      }
      insumos.push({
        producto: insumo.producto.trim(),
        marca: insumo.marca.trim() || null,
        tono: insumo.tono.trim() || null,
        cantidad: cantidadText ? Number(cantidadText) : null,
        unidad: cantidadText ? insumo.unidad : null,
      });
    }

    const descripcion = formula.descripcion.trim() || null;
    if (!descripcion && oxidanteVolumen === null && tiempoPoseMin === null && insumos.length === 0) continue;
    formulas.push({ descripcion, oxidanteVolumen, tiempoPoseMin, insumos });
  }

  return {
    data: {
      porosidad: form.porosidad,
      elasticidad: form.elasticidad,
      porcentajeCanas,
      tipoDePelo: form.tipoDePelo,
      volumenDePelo: form.volumenDePelo,
      tratamientosPrevios: form.tratamientosPrevios.trim() || null,
      observacionesInternas: form.observacionesInternas.trim() || null,
      indicacionesCliente: form.indicacionesCliente.trim() || null,
      formulas,
    },
  };
};

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const Section = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {hint && <Text style={styles.hint}>{hint}</Text>}
    {children}
  </View>
);

// Pastillas para elegir una opción; tocar la elegida la desmarca
function OptionChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Record<T, string>;
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chips}>
        {(Object.keys(options) as T[]).map((key) => (
          <Chip key={key} label={options[key]} selected={value === key} onPress={() => onChange(value === key ? null : key)} />
        ))}
      </View>
    </View>
  );
}

// F08: ficha técnica del servicio del profesional en este turno. Se carga con el turno CONFIRMADO y se puede
// editar hasta que lo completa: ahí se cierra y queda como historial (se ve solo de lectura)
export default function FichaTecnica() {
  const params = useLocalSearchParams<{
    turnoId: string;
    detalleId: string;
    // Vacío si el servicio todavía no tiene ficha
    fichaId: string;
    cliente: string;
    alergia?: string;
    servicio: string;
    fecha: string;
    estado: string;
  }>();
  const turnoId = Number(params.turnoId);
  const detalleId = Number(params.detalleId);
  const fichaId = params.fichaId ? Number(params.fichaId) : null;
  const { user, token } = useAuth();
  const legajo = user?.profesional?.legajo;

  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [form, setForm] = useState<FichaForm>(() => toForm(null));
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [busyTipo, setBusyTipo] = useState<MomentoFoto | null>(null);

  // Cada servicio del turno trae el id de su ficha: sin ficha, el formulario arranca vacío
  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setLoadError('');
    try {
      const existente = fichaId ? await getFichaRequest(token, fichaId) : null;
      setFicha(existente);
      setForm(toForm(existente));
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [token, fichaId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!token) return null;

  const header = (
    <View style={styles.header}>
      <Text style={styles.client}>{params.cliente}</Text>
      <Text style={styles.detail}>
        {params.servicio} · {capitalize(formatFechaLarga(params.fecha))}
      </Text>
      {params.alergia ? (
        <View style={styles.row}>
          <Ionicons name="warning-outline" size={16} color={colors.error} />
          <Text style={[styles.detail, styles.alergia]}>Alergia: {params.alergia}</Text>
        </View>
      ) : null}
    </View>
  );

  if (isLoading) {
    return (
      <Screen edges={['bottom']}>
        <ActivityIndicator color={colors.violet} style={styles.loading} accessibilityLabel="Cargando ficha" />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen edges={['bottom']} style={styles.container}>
        <FormMessage message={loadError} />
        <Button variant="secundario" onPress={load}>
          Reintentar
        </Button>
      </Screen>
    );
  }

  // Cerrada (el turno se completó) o de otro profesional: solo lectura
  if (ficha && (ficha.cerradaEn || ficha.legajo !== legajo)) {
    return (
      <Screen scroll edges={['bottom']} style={styles.container}>
        {header}
        {ficha.cerradaEn && <Text style={styles.hint}>La ficha se cerró al completar el turno: queda en el historial y no se edita.</Text>}
        <FichaView ficha={ficha} />
      </Screen>
    );
  }

  // Sin ficha y el turno ya no está confirmado (por ejemplo, se completó sin cargarla)
  if (!ficha && params.estado !== 'CONFIRMADO') {
    return (
      <Screen edges={['bottom']} style={styles.container}>
        {header}
        <Text style={styles.hint}>No se cargó la ficha técnica de este servicio. Se carga mientras el turno está confirmado.</Text>
        <Button variant="secundario" onPress={() => router.back()}>
          Volver
        </Button>
      </Screen>
    );
  }

  const setField = <K extends keyof FichaForm>(name: K, value: FichaForm[K]) => setForm((prev) => ({ ...prev, [name]: value }));

  const setFormulas = (update: (formulas: FormulaForm[]) => FormulaForm[]) => setForm((prev) => ({ ...prev, formulas: update(prev.formulas) }));

  const updateFormula = (index: number, patch: Partial<FormulaForm>) =>
    setFormulas((formulas) => formulas.map((formula, i) => (i === index ? { ...formula, ...patch } : formula)));

  const updateInsumo = (index: number, insumoIndex: number, patch: Partial<InsumoForm>) =>
    setFormulas((formulas) =>
      formulas.map((formula, i) =>
        i === index
          ? { ...formula, insumos: formula.insumos.map((insumo, j) => (j === insumoIndex ? { ...insumo, ...patch } : insumo)) }
          : formula,
      ),
    );

  // Crea la ficha o guarda los cambios. Devuelve la ficha guardada, o null si hubo un error
  const save = async () => {
    const result = toData(form);
    if ('error' in result) {
      setError(result.error);
      return null;
    }
    setError('');
    setIsSaving(true);
    try {
      const saved = ficha
        ? await updateFichaRequest(token, ficha.id, result.data)
        : await createFichaRequest(token, turnoId, detalleId, result.data);
      setFicha(saved);
      setForm(toForm(saved));
      return saved;
    } catch (err) {
      setError(errorMessage(err));
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (await save()) Alert.alert('Ficha guardada', 'Podés seguir editándola hasta que marques el turno como completado.');
  };

  const addPhoto = async (tipo: MomentoFoto, source: ImageSource) => {
    const uri = await pickImage(source);
    if (!uri) return;
    setBusyTipo(tipo);
    try {
      // La foto va en una ficha: si todavía no existe, primero se guarda con lo que se cargó
      const target = ficha ?? (await save());
      if (!target) return;
      const updated = await uploadFichaPhotoRequest(token, target.id, tipo, uri);
      // Solo se toman las fotos, para no pisar lo que se esté editando sin guardar
      setFicha((prev) => (prev ? { ...prev, fotos: updated.fotos } : updated));
    } catch (err) {
      Alert.alert('No se pudo subir la foto', errorMessage(err));
    } finally {
      setBusyTipo(null);
    }
  };

  const removePhoto = (foto: FotoFicha) => {
    if (!ficha) return;
    Alert.alert('Quitar foto', '¿Querés quitar esta foto de la ficha?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await deleteFichaPhotoRequest(token, ficha.id, foto.id);
            setFicha((prev) => (prev ? { ...prev, fotos: updated.fotos } : updated));
          } catch (err) {
            Alert.alert('No se pudo quitar la foto', errorMessage(err));
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll edges={['bottom']} style={styles.container}>
      {header}
      <Text style={styles.hint}>
        Ningún dato es obligatorio. La ficha se puede editar hasta que marques el turno como completado; después queda en el historial.
      </Text>

      <Section title="Antecedentes del cabello">
        <OptionChips label="Porosidad" options={NIVEL_LABEL} value={form.porosidad} onChange={(value) => setField('porosidad', value)} />
        <OptionChips label="Elasticidad" options={NIVEL_LABEL} value={form.elasticidad} onChange={(value) => setField('elasticidad', value)} />
        <OptionChips label="Tipo de pelo" options={TIPO_DE_PELO_LABEL} value={form.tipoDePelo} onChange={(value) => setField('tipoDePelo', value)} />
        <OptionChips label="Volumen" options={VOLUMEN_LABEL} value={form.volumenDePelo} onChange={(value) => setField('volumenDePelo', value)} />
        <TextField
          label="Canas (%)"
          placeholder="ej. 30"
          keyboardType="number-pad"
          maxLength={3}
          value={form.porcentajeCanas}
          onChangeText={(text) => setField('porcentajeCanas', text)}
        />
        <TextField
          label="Tratamientos previos"
          placeholder="ej. Alisado hace 6 meses, decoloración"
          multiline
          maxLength={1000}
          style={styles.multiline}
          value={form.tratamientosPrevios}
          onChangeText={(text) => setField('tratamientosPrevios', text)}
        />
      </Section>

      <Section title="Fórmulas aplicadas" hint="En el orden en que se aplicaron: tintura, decolorante, oxidante y tiempos.">
        {form.formulas.map((formula, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Fórmula {index + 1}</Text>
              <Pressable
                onPress={() => setFormulas((formulas) => formulas.filter((_, i) => i !== index))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Quitar fórmula ${index + 1}`}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </Pressable>
            </View>
            <TextField
              label="Descripción"
              placeholder="ej. Raíz, medios y puntas"
              maxLength={500}
              value={formula.descripcion}
              onChangeText={(text) => updateFormula(index, { descripcion: text })}
            />
            <View style={styles.pair}>
              <View style={styles.half}>
                <TextField
                  label="Oxidante (vol.)"
                  placeholder="ej. 20"
                  keyboardType="number-pad"
                  maxLength={2}
                  value={formula.oxidanteVolumen}
                  onChangeText={(text) => updateFormula(index, { oxidanteVolumen: text })}
                />
              </View>
              <View style={styles.half}>
                <TextField
                  label="Pose (min)"
                  placeholder="ej. 35"
                  keyboardType="number-pad"
                  maxLength={3}
                  value={formula.tiempoPoseMin}
                  onChangeText={(text) => updateFormula(index, { tiempoPoseMin: text })}
                />
              </View>
            </View>

            {formula.insumos.map((insumo, insumoIndex) => (
              <View key={insumoIndex} style={styles.insumo}>
                <View style={styles.cardHeader}>
                  <Text style={styles.fieldLabel}>Producto {insumoIndex + 1}</Text>
                  <Pressable
                    onPress={() => updateFormula(index, { insumos: formula.insumos.filter((_, j) => j !== insumoIndex) })}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar producto ${insumoIndex + 1}`}
                  >
                    <Ionicons name="close-circle-outline" size={20} color={colors.grey} />
                  </Pressable>
                </View>
                <TextField
                  label="Producto"
                  placeholder="ej. Tintura, decolorante"
                  maxLength={100}
                  value={insumo.producto}
                  onChangeText={(text) => updateInsumo(index, insumoIndex, { producto: text })}
                />
                <View style={styles.pair}>
                  <View style={styles.half}>
                    <TextField
                      label="Marca"
                      placeholder="ej. Koleston"
                      maxLength={100}
                      value={insumo.marca}
                      onChangeText={(text) => updateInsumo(index, insumoIndex, { marca: text })}
                    />
                  </View>
                  <View style={styles.half}>
                    <TextField
                      label="Tono"
                      placeholder="ej. 7.1"
                      maxLength={50}
                      value={insumo.tono}
                      onChangeText={(text) => updateInsumo(index, insumoIndex, { tono: text })}
                    />
                  </View>
                </View>
                <TextField
                  label="Cantidad"
                  placeholder="ej. 30"
                  keyboardType="decimal-pad"
                  maxLength={10}
                  value={insumo.cantidad}
                  onChangeText={(text) => updateInsumo(index, insumoIndex, { cantidad: text })}
                />
                <View style={styles.chips}>
                  {(Object.keys(UNIDAD_LABEL) as UnidadInsumo[]).map((unidad) => (
                    <Chip
                      key={unidad}
                      label={UNIDAD_LABEL[unidad]}
                      selected={insumo.unidad === unidad}
                      onPress={() => updateInsumo(index, insumoIndex, { unidad })}
                    />
                  ))}
                </View>
              </View>
            ))}
            {formula.insumos.length < MAX_INSUMOS && (
              <Chip
                label="+ Agregar producto"
                onPress={() => updateFormula(index, { insumos: [...formula.insumos, EMPTY_INSUMO] })}
                style={styles.addChip}
              />
            )}
          </View>
        ))}
        {form.formulas.length < MAX_FORMULAS && (
          <Button variant="secundario" onPress={() => setFormulas((formulas) => [...formulas, EMPTY_FORMULA])}>
            Agregar fórmula
          </Button>
        )}
      </Section>

      <Section title="Fotos de antes y después" hint={ficha ? undefined : 'Al agregar la primera foto se guarda la ficha.'}>
        <FichaFotos fichaId={ficha?.id ?? null} fotos={ficha?.fotos ?? []} onAdd={addPhoto} onRemove={removePhoto} busyTipo={busyTipo} />
      </Section>

      <Section title="Indicaciones para la clienta" hint="Es lo que ve la clienta en su historial, junto con las fotos.">
        <TextField
          label="Cuidados"
          placeholder="ej. Shampoo sin sulfatos por 15 días"
          multiline
          maxLength={1000}
          style={styles.multiline}
          value={form.indicacionesCliente}
          onChangeText={(text) => setField('indicacionesCliente', text)}
        />
      </Section>

      <Section title="Observaciones internas" hint="Solo las ve el salón.">
        <TextField
          label="Observaciones"
          placeholder="ej. Cuero cabelludo sensible"
          multiline
          maxLength={1000}
          style={styles.multiline}
          value={form.observacionesInternas}
          onChangeText={(text) => setField('observacionesInternas', text)}
        />
      </Section>

      {error !== '' && <FormMessage message={error} />}

      <Button onPress={handleSave} isLoading={isSaving} disabled={busyTipo !== null}>
        {ficha ? 'Guardar cambios' : 'Guardar ficha'}
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  loading: {
    paddingVertical: spacing.xl,
  },
  header: {
    gap: spacing.xs,
  },
  client: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.lg,
    color: colors.black,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  alergia: {
    fontFamily: fonts.bodySemiBold,
    color: colors.error,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
  section: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  multiline: {
    minHeight: spacing.xxl * 2,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
  },
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.md,
    color: colors.violet,
  },
  pair: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
  insumo: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  addChip: {
    alignSelf: 'flex-start',
  },
});
