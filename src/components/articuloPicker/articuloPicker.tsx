import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  coincideBusqueda,
  createArticuloRequest,
  createMarcaRequest,
  formatEnvases,
  formatMarca,
  formatPeso,
  getArticulosRequest,
  getMarcasRequest,
  idRepetido,
  porMarca,
  sinIdRepetido,
} from '@/api/articulos';
import type { Articulo, ArticuloData, Marca, MarcaData } from '@/api/articulos';
import { ApiError } from '@/api/client';
import { ArticuloForm } from '@/components/articuloForm/articuloForm';
import { Button } from '@/components/button/button';
import { FormMessage } from '@/components/formMessage/formMessage';
import { TextField } from '@/components/textField/textField';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

interface ArticuloPickerProps {
  visible: boolean;
  onSelect: (articulo: Articulo) => void;
  onClose: () => void;
}

// F11, desde la ficha técnica: elegir un producto del stock para un insumo. Solo los de uso en el salón (SALON o AMBOS),
// que son los que el back acepta en una ficha. La lista se pide al abrir, así el stock está al día.
// Si el producto no está, se crea ahí mismo (alta rápida, como en la web) y queda elegido
export const ArticuloPicker = ({ visible, onSelect, onClose }: ArticuloPickerProps) => {
  const { token } = useAuth();
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [intento, setIntento] = useState(0);
  // Alta rápida: el formulario reemplaza a la lista, con lo buscado como nombre
  const [creando, setCreando] = useState<string | null>(null);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorAlta, setErrorAlta] = useState('');
  // El repetido del 409, solo si se puede usar en una ficha (está en esta lista: SALON o AMBOS)
  const [existente, setExistente] = useState<Articulo | null>(null);

  useEffect(() => {
    if (!visible || !token) return;
    let cancelled = false;
    setBusqueda('');
    setCreando(null);
    setIsLoading(true);
    setError('');
    getArticulosRequest(token, 'SALON')
      .then((result) => !cancelled && setArticulos(result))
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [visible, token, intento]);

  const abrirAlta = () => {
    setCreando(busqueda.trim());
    setErrorAlta('');
    setExistente(null);
    if (!token) return;
    getMarcasRequest(token)
      .then(setMarcas)
      .catch((err) => setErrorAlta(errorMessage(err)));
  };

  const crearMarca = async (data: MarcaData) => {
    const nueva = await createMarcaRequest(token ?? '', data);
    setMarcas((prev) => [...prev, nueva].sort(porMarca));
    return nueva;
  };

  const crear = async (data: ArticuloData) => {
    if (!token) return;
    setIsSaving(true);
    setErrorAlta('');
    setExistente(null);
    try {
      const creado = await createArticuloRequest(token, data);
      setArticulos((prev) => [...prev, creado]);
      onSelect(creado);
      Alert.alert('Artículo creado', `${creado.nombre} ya está en el stock.`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const id = idRepetido(err.message);
        setExistente(articulos.find((articulo) => articulo.id === id) ?? null);
        setErrorAlta(sinIdRepetido(err.message));
      } else {
        setErrorAlta(errorMessage(err));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const visibles = useMemo(() => articulos.filter((articulo) => coincideBusqueda(articulo, busqueda)), [articulos, busqueda]);

  const empty = isLoading ? (
    <ActivityIndicator color={colors.violet} style={styles.loading} accessibilityLabel="Cargando productos" />
  ) : error ? (
    <View style={styles.gap}>
      <FormMessage message={error} />
      <Button variant="secundario" onPress={() => setIntento((n) => n + 1)}>
        Reintentar
      </Button>
    </View>
  ) : (
    <Text style={styles.detail}>
      {articulos.length === 0
        ? 'Todavía no hay productos de uso en el salón. Escribí el nombre en el buscador para crearlo.'
        : 'No encontramos productos con esa búsqueda.'}
    </Text>
  );

  // Siempre que haya texto, aunque haya resultados: buscando "tintura" aparece la 7.1, pero se puede crear la 8.0
  const crearItem =
    busqueda.trim() && !isLoading && !error ? (
      <Pressable
        onPress={abrirAlta}
        style={({ pressed }) => [styles.crear, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Crear artículo ${busqueda.trim()}`}
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.violet} />
        <Text style={styles.crearText}>Crear artículo: «{busqueda.trim()}»</Text>
      </Pressable>
    ) : null;

  if (creando !== null) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={() => !isSaving && setCreando(null)}>
        <SafeAreaView style={styles.safe}>
          <View style={[styles.header, styles.headerAlta]}>
            <Pressable onPress={() => setCreando(null)} disabled={isSaving} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver a la lista">
              <Ionicons name="arrow-back" size={24} color={colors.black} />
            </Pressable>
            <Text style={[styles.title, styles.flex]}>Nuevo artículo</Text>
          </View>
          <KeyboardAvoidingView style={styles.flex} behavior="padding">
            <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
              <ArticuloForm
                rapido
                nombreInicial={creando}
                marcas={marcas}
                onCrearMarca={crearMarca}
                onSubmit={crear}
                onCancel={() => setCreando(null)}
                isLoading={isSaving}
                error={errorAlta}
                errorAction={
                  existente && (
                    <Button variant="secundario" onPress={() => onSelect(existente)}>
                      {`Usar el que ya existe: ${existente.nombre}${existente.tonalidad ? ` · ${existente.tonalidad}` : ''} (${formatMarca(existente.marca)})`}
                    </Button>
                  )
                }
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Elegir del stock</Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Ionicons name="close" size={24} color={colors.black} />
          </Pressable>
        </View>
        <View style={styles.search}>
          <TextField
            label="Buscar"
            placeholder="Nombre, marca, tono o código"
            value={busqueda}
            onChangeText={setBusqueda}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
        <FlatList
          data={error ? [] : visibles}
          keyExtractor={(articulo) => String(articulo.id)}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item)}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${item.nombre}, ${formatEnvases(item.stock)}`}
            >
              <Text style={styles.nombre}>{item.nombre}</Text>
              <Text style={styles.detail}>
                {formatMarca(item.marca)}
                {item.tonalidad ? ` · Tono ${item.tonalidad}` : ''}
              </Text>
              <Text style={[styles.detail, (item.bajoStock || Number(item.stock) <= 0) && styles.warning]}>
                {formatEnvases(item.stock)} de {formatPeso(item.pesoInicial, item.tipoPeso)}
                {item.bajoStock ? ' · Bajo stock' : ''}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={empty}
          ListFooterComponent={crearItem}
          ListFooterComponentStyle={visibles.length > 0 ? styles.footer : undefined}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.lg,
    color: colors.black,
  },
  search: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  item: {
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  nombre: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  warning: {
    color: colors.warning,
  },
  crear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.violet,
  },
  crearText: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.violet,
  },
  headerAlta: {
    justifyContent: 'flex-start',
    gap: spacing.sm,
  },
  footer: {
    marginTop: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  separator: {
    height: spacing.sm,
  },
  loading: {
    paddingVertical: spacing.xl,
  },
  gap: {
    gap: spacing.md,
  },
});
