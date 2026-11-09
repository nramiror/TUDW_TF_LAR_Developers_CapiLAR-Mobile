import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatMarca, getArticulosRequest } from '@/api/articulos';
import type { Articulo } from '@/api/articulos';
import { ApiError } from '@/api/client';
import {
  MAX_FORMULAS,
  MAX_INSUMOS,
  NIVEL_LABEL,
  TIPO_DE_PELO_LABEL,
  UNIDAD_LABEL,
  VOLUMEN_LABEL,
  ZONAS_FORMULA,
  costoDeInsumo,
  createFichaRequest,
  deleteFichaPhotoRequest,
  getFichaRequest,
  totalDeProductos,
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
import { parseTratamientos, serializeTratamientos } from '@/api/tratamientos';
import { formatPrice } from '@/api/services';
import { formatFechaLarga } from '@/api/turnos';
import { ArticuloPicker } from '@/components/articuloPicker/articuloPicker';
import { Button } from '@/components/button/button';
import { Chip } from '@/components/chip/chip';
import { FichaFotos } from '@/components/fichaFotos/fichaFotos';
import { FichaView, formatInsumo } from '@/components/fichaView/fichaView';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Screen } from '@/components/screen/screen';
import { TextField } from '@/components/textField/textField';
import { TotalProductos } from '@/components/totalProductos/totalProductos';
import {
  TratamientosField,
  filaVacia,
  fromTratamientoDraft,
  newTratamiento,
  toTratamientoDraft,
  validarTratamiento,
} from '@/components/tratamientosField/tratamientosField';
import type { TratamientoDraft } from '@/components/tratamientosField/tratamientosField';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';
import { pickImage } from '@/utils/pickImage';
import type { ImageSource } from '@/utils/pickImage';

// Lo que se edita: los números van como texto mientras se escriben
interface InsumoForm {
  // F11: producto del stock. Con él, producto, marca, tono y unidad son los del artículo (no se editan)
  articuloId: number | null;
  // Insumo escrito a mano en una ficha anterior: se conserva tal cual (no descuenta stock). Los nuevos salen
  // solo del stock, como en la web, así descuentan y suman al costo del turno
  comoTexto: boolean;
  producto: string;
  marca: string;
  tono: string;
  cantidad: string;
  unidad: UnidadInsumo | null;
}

interface FormulaForm {
  // La zona elegida de la lista o, con zonaOtra, lo que se escribió a mano. "" = sin indicar
  descripcion: string;
  zonaOtra: boolean;
  // Ya no se carga: el oxidante es un insumo más del stock. Se guarda el de las fichas viejas para reenviarlo
  // sin cambios (PATCH reemplaza todas las fórmulas y si no va, se pierde)
  oxidanteVolumen: number | null;
  tiempoPoseMin: string;
  insumos: InsumoForm[];
}

interface FichaForm {
  porosidad: NivelCapilar | null;
  elasticidad: NivelCapilar | null;
  porcentajeCanas: string;
  tipoDePelo: TipoDePelo | null;
  volumenDePelo: VolumenDePelo | null;
  // Filas "Tratamiento | Frecuencia | MM/AAAA" y lo que no tiene ese formato (fichas viejas, texto libre)
  tratamientos: TratamientoDraft[];
  notasTratamientos: string;
  observacionesInternas: string;
  indicacionesCliente: string;
  formulas: FormulaForm[];
}

const EMPTY_INSUMO: InsumoForm = { articuloId: null, comoTexto: false, producto: '', marca: '', tono: '', cantidad: '', unidad: null };
const EMPTY_FORMULA: FormulaForm = { descripcion: '', zonaOtra: false, oxidanteVolumen: null, tiempoPoseMin: '', insumos: [EMPTY_INSUMO] };

// Mismo límite que el back para tratamientosPrevios
const MAX_TEXTO = 1000;

const numberText = (value: number | string | null) => (value === null || value === '' ? '' : String(Number(value)));

const toForm = (ficha: Ficha | null): FichaForm => {
  const tratamientos = parseTratamientos(ficha?.tratamientosPrevios ?? null);
  return {
    porosidad: ficha?.porosidad ?? null,
    elasticidad: ficha?.elasticidad ?? null,
    porcentajeCanas: numberText(ficha?.porcentajeCanas ?? null),
    tipoDePelo: ficha?.tipoDePelo ?? null,
    volumenDePelo: ficha?.volumenDePelo ?? null,
    tratamientos: tratamientos.filas.map(toTratamientoDraft),
    notasTratamientos: tratamientos.notas,
    observacionesInternas: ficha?.observacionesInternas ?? '',
    indicacionesCliente: ficha?.indicacionesCliente ?? '',
    formulas: (ficha?.formulas ?? []).map((formula) => ({
      descripcion: formula.descripcion ?? '',
      // Un texto viejo que no está en la lista queda en "Otra", para no perderlo
      zonaOtra: Boolean(formula.descripcion) && !ZONAS_FORMULA.includes(formula.descripcion ?? ''),
      oxidanteVolumen: formula.oxidanteVolumen,
      tiempoPoseMin: numberText(formula.tiempoPoseMin),
      insumos: formula.insumos.map((insumo) => ({
        articuloId: insumo.articuloId ?? null,
        comoTexto: !insumo.articuloId,
        producto: insumo.producto,
        marca: insumo.marca ?? '',
        tono: insumo.tono ?? '',
        cantidad: numberText(insumo.cantidad),
        unidad: insumo.unidad,
      })),
    })),
  };
};

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
    const { oxidanteVolumen } = formula;
    const tiempoPoseMin = parseEntero(formula.tiempoPoseMin, 1, 240);
    if (tiempoPoseMin === undefined) return { error: `Fórmula ${n}: el tiempo de pose va de 1 a 240 minutos.` };

    const insumos: FormulaInsumo[] = [];
    for (const [j, insumo] of formula.insumos.entries()) {
      // Uno nuevo al que todavía no se le eligió producto del stock: no se manda
      if (insumo.articuloId === null && !insumo.comoTexto) continue;
      const cantidadText = insumo.cantidad.trim().replace(',', '.');
      if (cantidadText && (!/^\d+(\.\d{1,2})?$/.test(cantidadText) || Number(cantidadText) <= 0)) {
        return { error: `Fórmula ${n}, insumo ${j + 1}: la cantidad tiene que ser mayor a 0, con hasta 2 decimales.` };
      }
      // Del stock: la cantidad es lo que se descuenta al completar el turno, así que es obligatoria.
      // Producto, marca, tono y unidad los vuelve a poner el back desde el artículo
      if (insumo.articuloId !== null) {
        if (!cantidadText) return { error: `Fórmula ${n}, insumo ${j + 1}: con un producto del stock, la cantidad es obligatoria.` };
        insumos.push({
          articuloId: insumo.articuloId,
          producto: insumo.producto,
          marca: insumo.marca || null,
          tono: insumo.tono || null,
          cantidad: Number(cantidadText),
          unidad: insumo.unidad,
        });
        continue;
      }
      // Escrito a mano antes: se reenvía igual (PATCH reemplaza las fórmulas y si no va, se borra)
      insumos.push({
        producto: insumo.producto,
        marca: insumo.marca || null,
        tono: insumo.tono || null,
        cantidad: cantidadText ? Number(cantidadText) : null,
        unidad: insumo.unidad,
      });
    }

    const descripcion = formula.descripcion.trim() || null;
    if (!descripcion && oxidanteVolumen === null && tiempoPoseMin === null && insumos.length === 0) continue;
    formulas.push({ descripcion, oxidanteVolumen, tiempoPoseMin, insumos });
  }

  const tratamientosPrevios = serializeTratamientos({
    filas: form.tratamientos.filter((fila) => !filaVacia(fila)).map(fromTratamientoDraft),
    notas: form.notasTratamientos,
  });
  if (tratamientosPrevios.length > MAX_TEXTO) {
    return { error: 'Los tratamientos previos son demasiado largos: sacá alguna fila o acortá los otros datos.' };
  }

  return {
    data: {
      porosidad: form.porosidad,
      elasticidad: form.elasticidad,
      porcentajeCanas,
      tipoDePelo: form.tipoDePelo,
      volumenDePelo: form.volumenDePelo,
      tratamientosPrevios: tratamientosPrevios || null,
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
  // Error de cada fila de tratamientos previos, por su posición
  const [erroresTratamientos, setErroresTratamientos] = useState<(string | undefined)[]>([]);
  const [busyTipo, setBusyTipo] = useState<MomentoFoto | null>(null);
  // Insumo para el que se está eligiendo un producto del stock
  const [pickerFor, setPickerFor] = useState<{ formula: number; insumo: number } | null>(null);
  // Artículos del salón, para el costo de cada producto. Si no cargan, la ficha anda igual sin costos
  const [articulos, setArticulos] = useState<Articulo[]>([]);

  useEffect(() => {
    if (!token) return;
    getArticulosRequest(token, 'SALON')
      .then(setArticulos)
      .catch(() => setArticulos([]));
  }, [token]);

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

  // Producto, marca, tono y unidad pasan a ser los del artículo; la cantidad que se había escrito se mantiene
  const elegirArticulo = (articulo: Articulo) => {
    if (!pickerFor) return;
    updateInsumo(pickerFor.formula, pickerFor.insumo, {
      articuloId: articulo.id,
      comoTexto: false,
      producto: articulo.nombre,
      marca: formatMarca(articulo.marca),
      tono: articulo.tonalidad ?? '',
      unidad: articulo.tipoPeso,
    });
    setPickerFor(null);
  };

  // Crea la ficha o guarda los cambios. Devuelve la ficha guardada, o null si hubo un error
  const save = async () => {
    const errores = form.tratamientos.map((fila) => (filaVacia(fila) ? undefined : validarTratamiento(fila)));
    setErroresTratamientos(errores);
    if (errores.some(Boolean)) {
      setError('Revisá los tratamientos previos.');
      return null;
    }
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

  // Lo que cuesta lo usado de un producto del stock, con el precio de hoy (se guarda al completar el turno)
  const costoDeFila = (insumo: InsumoForm) => {
    const articulo = articulos.find((a) => a.id === insumo.articuloId);
    const cantidad = Number(insumo.cantidad.replace(',', '.')) || 0;
    return articulo && cantidad > 0 ? formatPrice(costoDeInsumo(articulo, cantidad)) : null;
  };

  // La ficha que se edita está abierta: el total es estimado y los productos de texto no suman
  const totalProductos = totalDeProductos(
    form.formulas
      .flatMap((formula) => formula.insumos)
      .filter((insumo) => insumo.articuloId !== null || insumo.comoTexto)
      .map((insumo) => ({ articuloId: insumo.articuloId, cantidad: insumo.cantidad.replace(',', '.') })),
    articulos,
  );

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
      </Section>

      <Section title="Tratamientos previos" hint="Qué se hizo antes en el pelo, cada cuánto y cuándo fue la última vez.">
        <TratamientosField
          filas={form.tratamientos}
          onChange={(filas) => {
            setField('tratamientos', filas);
            setErroresTratamientos([]);
          }}
          errores={erroresTratamientos}
        />
        <Chip
          label="+ Agregar tratamiento"
          onPress={() => setField('tratamientos', [...form.tratamientos, newTratamiento()])}
          style={styles.addChip}
        />
        <TextField
          label="Otros datos (opcional)"
          placeholder="ej. Cuero cabelludo sensible"
          multiline
          maxLength={MAX_TEXTO}
          style={styles.multiline}
          value={form.notasTratamientos}
          onChangeText={(text) => setField('notasTratamientos', text)}
        />
      </Section>

      <Section
        title="Fórmulas aplicadas"
        hint="En el orden en que se aplicaron. Cada fórmula son los productos que se mezclan, oxidante incluido: elegilos del stock."
      >
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
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Zona</Text>
              <View style={styles.chips}>
                <Chip
                  label="Sin indicar"
                  selected={!formula.zonaOtra && !formula.descripcion}
                  onPress={() => updateFormula(index, { zonaOtra: false, descripcion: '' })}
                />
                {ZONAS_FORMULA.map((zona) => (
                  <Chip
                    key={zona}
                    label={zona}
                    selected={!formula.zonaOtra && formula.descripcion === zona}
                    onPress={() => updateFormula(index, { zonaOtra: false, descripcion: zona })}
                  />
                ))}
                <Chip
                  label="Otra"
                  selected={formula.zonaOtra}
                  onPress={() => !formula.zonaOtra && updateFormula(index, { zonaOtra: true, descripcion: '' })}
                />
              </View>
            </View>
            {formula.zonaOtra && (
              <TextField
                label="¿Qué zona?"
                placeholder="ej. Contorno"
                maxLength={500}
                value={formula.descripcion}
                onChangeText={(text) => updateFormula(index, { descripcion: text })}
              />
            )}
            <TextField
              label="Pose (min)"
              placeholder="ej. 35"
              keyboardType="number-pad"
              maxLength={3}
              value={formula.tiempoPoseMin}
              onChangeText={(text) => updateFormula(index, { tiempoPoseMin: text })}
            />
            {formula.oxidanteVolumen !== null && (
              <Text style={styles.hint}>
                Oxidante {formula.oxidanteVolumen} vol
              </Text>
            )}

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
                {insumo.articuloId !== null ? (
                  <>
                    <View style={styles.stockBox}>
                      <Ionicons name="cube-outline" size={20} color={colors.violet} />
                      <View style={styles.flex}>
                        <Text style={styles.stockNombre}>{insumo.producto}</Text>
                        <Text style={styles.detail}>
                          {[insumo.marca, insumo.tono && `Tono ${insumo.tono}`, costoDeFila(insumo)].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                    </View>
                    <TextField
                      label={`Cantidad (${insumo.unidad ? UNIDAD_LABEL[insumo.unidad] : ''})`}
                      placeholder="ej. 30"
                      keyboardType="decimal-pad"
                      maxLength={10}
                      value={insumo.cantidad}
                      onChangeText={(text) => updateInsumo(index, insumoIndex, { cantidad: text })}
                      hint="Se descuenta del stock al completar el turno."
                    />
                    <Chip
                      label="Cambiar producto"
                      onPress={() => setPickerFor({ formula: index, insumo: insumoIndex })}
                      style={styles.addChip}
                    />
                  </>
                ) : insumo.comoTexto ? (
                  <>
                    <Text style={styles.insumoTexto}>{formatInsumo({ ...insumo, cantidad: insumo.cantidad || null })}</Text>
                    <Text style={styles.hint}>Cargado como texto: no descuenta stock.</Text>
                    <Chip
                      label="Cambiar por uno del stock"
                      onPress={() => setPickerFor({ formula: index, insumo: insumoIndex })}
                      style={styles.addChip}
                    />
                  </>
                ) : (
                  <Chip
                    label="Elegir del stock"
                    onPress={() => setPickerFor({ formula: index, insumo: insumoIndex })}
                    style={styles.addChip}
                  />
                )}
              </View>
            ))}
            {formula.insumos.length < MAX_INSUMOS && (
              <Chip
                label="+ Agregar producto"
                onPress={() => {
                  updateFormula(index, { insumos: [...formula.insumos, EMPTY_INSUMO] });
                  setPickerFor({ formula: index, insumo: formula.insumos.length });
                }}
                style={styles.addChip}
              />
            )}
          </View>
        ))}
        <TotalProductos {...totalProductos} />
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

      <ArticuloPicker visible={pickerFor !== null} onSelect={elegirArticulo} onClose={() => setPickerFor(null)} />
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
  insumo: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  addChip: {
    alignSelf: 'flex-start',
  },
  stockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.violet,
    backgroundColor: colors.white,
  },
  insumoTexto: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  stockNombre: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  flex: {
    flex: 1,
  },
});
