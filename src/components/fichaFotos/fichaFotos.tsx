import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_FOTOS_POR_MOMENTO, fichaPhotoPath } from '@/api/fichas';
import type { FotoFicha, MomentoFoto } from '@/api/fichas';
import { AuthImage } from '@/components/authImage/authImage';
import { Button } from '@/components/button/button';
import { OptionsSheet } from '@/components/optionsSheet/optionsSheet';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';
import type { ImageSource } from '@/utils/pickImage';

const THUMB = 88;

const MOMENTOS: { tipo: MomentoFoto; label: string }[] = [
  { tipo: 'ANTES', label: 'Antes' },
  { tipo: 'DESPUES', label: 'Después' },
];

interface FichaFotosProps {
  // null mientras la ficha no existe (la primera foto la crea)
  fichaId: number | null;
  fotos: FotoFicha[];
  // Sin onAdd ni onRemove se ve solo de lectura (ficha cerrada, de otro profesional o vista de la clienta)
  onAdd?: (tipo: MomentoFoto, source: ImageSource) => void;
  onRemove?: (foto: FotoFicha) => void;
  // Momento con una foto subiendo: su botón de agregar espera
  busyTipo?: MomentoFoto | null;
}

// F08: fotos de antes y después de una ficha (hasta 5 de cada una). Al tocar una se ve en grande
export const FichaFotos = ({ fichaId, fotos, onAdd, onRemove, busyTipo = null }: FichaFotosProps) => {
  const insets = useSafeAreaInsets();
  const [addingTipo, setAddingTipo] = useState<MomentoFoto | null>(null);
  const [viewing, setViewing] = useState<FotoFicha | null>(null);
  const editable = onAdd !== undefined;

  const grupos = MOMENTOS.map((momento) => ({ ...momento, fotos: fotos.filter((foto) => foto.tipo === momento.tipo) })).filter(
    (grupo) => editable || grupo.fotos.length > 0,
  );

  if (grupos.length === 0) return <Text style={styles.empty}>Sin fotos</Text>;

  return (
    <View style={styles.container}>
      {grupos.map((grupo) => (
        <View key={grupo.tipo} style={styles.group}>
          <Text style={styles.label}>
            {grupo.label}
            {editable ? ` (${grupo.fotos.length} de ${MAX_FOTOS_POR_MOMENTO})` : ''}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {fichaId !== null &&
              grupo.fotos.map((foto) => (
                <Pressable key={foto.id} onPress={() => setViewing(foto)} accessibilityRole="imagebutton" accessibilityLabel={`Ver foto de ${grupo.label.toLowerCase()}`}>
                  <AuthImage path={fichaPhotoPath(fichaId, foto.id)} style={styles.thumb} />
                </Pressable>
              ))}
            {editable && grupo.fotos.length < MAX_FOTOS_POR_MOMENTO && (
              <Pressable
                onPress={() => setAddingTipo(grupo.tipo)}
                disabled={busyTipo !== null}
                style={({ pressed }) => [styles.thumb, styles.add, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Agregar foto de ${grupo.label.toLowerCase()}`}
              >
                {busyTipo === grupo.tipo ? (
                  <ActivityIndicator color={colors.violet} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={26} color={colors.violet} />
                    <Text style={styles.addText}>Agregar</Text>
                  </>
                )}
              </Pressable>
            )}
          </ScrollView>
        </View>
      ))}

      <OptionsSheet
        visible={addingTipo !== null}
        title={addingTipo === 'ANTES' ? 'Foto de antes' : 'Foto de después'}
        options={[
          { label: 'Sacar foto', icon: 'camera-outline', onPress: () => addingTipo && onAdd?.(addingTipo, 'camera') },
          { label: 'Elegir de la galería', icon: 'images-outline', onPress: () => addingTipo && onAdd?.(addingTipo, 'library') },
        ]}
        onClose={() => setAddingTipo(null)}
      />

      <Modal visible={viewing !== null} animationType="fade" onRequestClose={() => setViewing(null)} statusBarTranslucent>
        <View style={[styles.viewer, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable onPress={() => setViewing(null)} hitSlop={12} style={styles.close} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Ionicons name="close" size={30} color={colors.white} />
          </Pressable>
          {viewing && fichaId !== null && (
            <AuthImage path={fichaPhotoPath(fichaId, viewing.id)} style={styles.full} contentFit="contain" />
          )}
          {viewing && onRemove && (
            <Button
              variant="grey"
              onPress={() => {
                onRemove(viewing);
                setViewing(null);
              }}
            >
              Quitar foto
            </Button>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  group: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  row: {
    gap: spacing.sm,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.md,
  },
  add: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.violet,
    backgroundColor: colors.white,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  addText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.xs,
    color: colors.violet,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  viewer: {
    flex: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.black,
  },
  close: {
    alignSelf: 'flex-end',
  },
  full: {
    flex: 1,
  },
});
