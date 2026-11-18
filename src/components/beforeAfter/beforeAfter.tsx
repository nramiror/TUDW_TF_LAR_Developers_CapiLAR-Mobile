import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

interface BeforeAfterProps {
  antes: string;
  despues: string;
  // Texto de la etiqueta de "después" (ej. el nombre del color)
  despuesLabel: string;
  // Punto de color junto a la etiqueta de "después"
  despuesColor?: string;
  accessibilityLabel?: string;
}

// Paso de las flechas de accesibilidad (TalkBack: deslizar arriba/abajo)
const PASO = 0.1;

const limitar = (valor: number) => Math.min(1, Math.max(0, valor));

// Comparador antes/después: las dos fotos una encima de la otra y una barra que se arrastra de costado
// para mostrar más de una o de la otra. Con PanResponder de RN, sin librerías nuevas
export const BeforeAfter = ({ antes, despues, despuesLabel, despuesColor, accessibilityLabel }: BeforeAfterProps) => {
  const [ancho, setAncho] = useState(0);
  // Parte de la foto (0 a 1) que muestra el "antes", desde la izquierda
  const [posicion, setPosicion] = useState(0.5);
  // Dónde estaba la barra al empezar el gesto, para sumarle lo que se movió el dedo
  const inicio = useRef(0);
  // El PanResponder se crea una vez: lee el ancho actual desde una ref
  const anchoRef = useRef(0);

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Solo con un movimiento más horizontal que vertical: deslizar hacia arriba o abajo sobre la foto sigue
        // haciendo scroll en la pantalla
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        // Mientras se arrastra, el scroll de la pantalla no se queda con el gesto
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event, gesture) => {
          if (!anchoRef.current) return;
          // Dónde empezó el dedo (los hijos no reciben toques, así locationX es sobre el comparador)
          inicio.current = event.nativeEvent.locationX - gesture.dx;
          setPosicion(limitar(event.nativeEvent.locationX / anchoRef.current));
        },
        onPanResponderMove: (_, gesture) => {
          if (!anchoRef.current) return;
          setPosicion(limitar((inicio.current + gesture.dx) / anchoRef.current));
        },
      }),
    [],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    anchoRef.current = event.nativeEvent.layout.width;
    setAncho(event.nativeEvent.layout.width);
  };

  const corte = ancho * posicion;

  return (
    <View
      style={styles.container}
      onLayout={onLayout}
      {...responder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel ?? 'Comparar antes y después'}
      accessibilityHint="Deslizá para ver más de la foto de antes o de después"
      accessibilityValue={{ text: `${Math.round(posicion * 100)} % antes` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) =>
        setPosicion((prev) => limitar(prev + (event.nativeEvent.actionName === 'increment' ? PASO : -PASO)))
      }
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image source={{ uri: despues }} style={styles.fill} contentFit="cover" transition={200} />

        {/* "Antes" encima, recortado hasta la barra. La foto adentro mide lo mismo que el comparador para que no se estire */}
        <View style={[styles.clip, { width: corte }]}>
          <Image source={{ uri: antes }} style={[styles.fill, { width: ancho }]} contentFit="cover" />
        </View>

        <View style={[styles.divider, { left: corte - 1 }]} />
        <View style={[styles.handle, { left: corte - HANDLE / 2 }]}>
          <Ionicons name="chevron-back" size={14} color={colors.violet} />
          <Ionicons name="chevron-forward" size={14} color={colors.violet} />
        </View>

        <Text style={[styles.tag, styles.tagLeft]}>Antes</Text>
        <View style={[styles.tag, styles.tagRight]}>
          {despuesColor && <View style={[styles.dot, { backgroundColor: despuesColor }]} />}
          <Text style={styles.tagText} numberOfLines={1}>
            {despuesLabel}
          </Text>
        </View>
      </View>
    </View>
  );
};

const HANDLE = 36;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  clip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  divider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.white,
  },
  handle: {
    position: 'absolute',
    top: '50%',
    marginTop: -HANDLE / 2,
    width: HANDLE,
    height: HANDLE,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  // Etiquetas sobre la foto: fondo oscuro translúcido para que se lean sobre cualquier pelo
  tag: {
    position: 'absolute',
    top: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: 'rgba(17, 17, 17, 0.55)',
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tagLeft: {
    left: spacing.sm,
  },
  tagRight: {
    right: spacing.sm,
    maxWidth: '55%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tagText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.white,
  },
});
