import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { createArticuloRequest, createMarcaRequest, getMarcasRequest, idRepetido, porMarca, sinIdRepetido } from '@/api/articulos';
import type { ArticuloData, Marca, MarcaData } from '@/api/articulos';
import { ApiError } from '@/api/client';
import { ArticuloForm } from '@/components/articuloForm/articuloForm';
import { Button } from '@/components/button/button';
import { Screen } from '@/components/screen/screen';
import { useAuth } from '@/context/auth/useAuth';
import { spacing } from '@/theme';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

// F11, desde la pestaña Stock: el profesional carga un artículo con el formulario completo (por ejemplo, si llega un
// pedido). Editarlo o darlo de baja sigue siendo del ADMIN, desde la web
export default function ArticuloNuevo() {
  const { token } = useAuth();
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  // El id del repetido (409), para abrirlo en vez de crear otro
  const [repetidoId, setRepetidoId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    getMarcasRequest(token)
      .then(setMarcas)
      .catch((err) => setError(errorMessage(err)));
  }, [token]);

  if (!token) return <Redirect href="/" />;

  const crearMarca = async (data: MarcaData) => {
    const nueva = await createMarcaRequest(token, data);
    setMarcas((prev) => [...prev, nueva].sort(porMarca));
    return nueva;
  };

  const crear = async (data: ArticuloData) => {
    setIsSaving(true);
    setError('');
    setRepetidoId(null);
    try {
      const creado = await createArticuloRequest(token, data);
      Alert.alert('Artículo creado', `${creado.nombre} ya está en el stock.`);
      router.replace({ pathname: '/articulo/[articuloId]', params: { articuloId: creado.id } });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setRepetidoId(idRepetido(err.message));
        setError(sinIdRepetido(err.message));
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen scroll edges={['bottom']} style={styles.container}>
      <ArticuloForm
        marcas={marcas}
        onCrearMarca={crearMarca}
        onSubmit={crear}
        onCancel={() => router.back()}
        isLoading={isSaving}
        error={error}
        errorAction={
          repetidoId !== null && (
            <Button variant="secundario" onPress={() => router.replace({ pathname: '/articulo/[articuloId]', params: { articuloId: repetidoId } })}>
              Ver el que ya existe
            </Button>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
});
