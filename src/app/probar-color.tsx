import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { CameraType } from 'expo-image-picker';
import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { CARTA_DE_COLORES, esColoracion, INTENSIDAD_POR_DEFECTO, previewHairColorRequest, SELFIE_LIMITS } from '@/api/hairColor';
import type { ColorCarta, VistaPreviaColor } from '@/api/hairColor';
import { getServicesRequest } from '@/api/services';
import { Button } from '@/components/button/button';
import { Chip } from '@/components/chip/chip';
import { FormMessage } from '@/components/formMessage/formMessage';
import { OptionsSheet } from '@/components/optionsSheet/optionsSheet';
import { Screen } from '@/components/screen/screen';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';
import { pickImage } from '@/utils/pickImage';
import type { ImageSource } from '@/utils/pickImage';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

// En la web es un slider de 0 a 100; en el celu alcanza con tres opciones (y no suma una librería)
const INTENSIDADES = [
  { label: 'Suave', value: 50 },
  { label: 'Media', value: INTENSIDAD_POR_DEFECTO },
  { label: 'Intensa', value: 100 },
];

// "2026-10-28T20:30:00.000Z" -> "17:30" en la hora del celular
const formatHora = (iso: string) => {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// Paso numerado, como en la web
const Step = ({ number, title, children }: { number: number; title: string; children: ReactNode }) => (
  <View style={styles.card}>
    <View style={styles.stepHeader}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

interface Resultado extends VistaPreviaColor {
  color: ColorCarta;
}

// TP3, API 1 (YouCam): la clienta saca o elige una selfie, elige un color de la carta y ve cómo le quedaría.
// El back la manda a YouCam y no la guarda. Desde el resultado puede ir a reservar una coloración
export default function ProbarColor() {
  const { token } = useAuth();

  // URI local de la selfie ya achicada: es lo que se manda y lo que se muestra
  const [selfie, setSelfie] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [color, setColor] = useState<ColorCarta | null>(null);
  const [intensidad, setIntensidad] = useState(INTENSIDAD_POR_DEFECTO);
  const [acepta, setAcepta] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isGoingToBook, setIsGoingToBook] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  // Corta el doble toque antes de que se dibuje el botón cargando (cada prueba real gasta 1 unit de YouCam)
  const applying = useRef(false);

  if (!token) return <Redirect href="/" />;

  const chooseSelfie = async (source: ImageSource) => {
    const uri = await pickImage(source, { cameraType: CameraType.front }, SELFIE_LIMITS);
    if (!uri) return;
    setSelfie(uri);
    setResultado(null);
    setError('');
  };

  // Solo con el botón: nunca se llama sola
  const apply = async () => {
    if (!selfie || !color || !acepta || applying.current) return;
    applying.current = true;
    setIsApplying(true);
    setError('');
    try {
      const vistaPrevia = await previewHairColorRequest(token, selfie, color.hex, intensidad);
      setResultado({ ...vistaPrevia, color });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      applying.current = false;
      setIsApplying(false);
    }
  };

  // Al servicio de coloración si el salón tiene uno; si no, al catálogo
  const bookColoring = async () => {
    setIsGoingToBook(true);
    try {
      const servicio = (await getServicesRequest()).find((item) => esColoracion(item.tipo));
      if (servicio) router.push({ pathname: '/reservar/[servicioId]', params: { servicioId: servicio.id } });
      else router.dismissTo('/cliente');
    } catch {
      router.dismissTo('/cliente');
    } finally {
      setIsGoingToBook(false);
    }
  };

  const canApply = Boolean(selfie && color && acepta);

  return (
    <Screen scroll edges={['bottom']} style={styles.container}>
      <Text style={styles.intro}>Subí una selfie, elegí un color de nuestra carta y mirá cómo te quedaría antes de reservar.</Text>

      <Step number={1} title="Tu selfie">
        <View style={styles.selfieRow}>
          <View style={styles.selfieBox}>
            {selfie ? (
              <Image source={{ uri: selfie }} style={styles.fill} contentFit="cover" accessibilityLabel="Tu selfie" />
            ) : (
              <Ionicons name="person-outline" size={40} color={colors.greyLight} />
            )}
          </View>
          <View style={styles.selfieInfo}>
            <Text style={styles.hint}>De frente, con buena luz y el pelo visible. Mejor sin gorro ni el pelo atado.</Text>
            <Button variant="secundario" onPress={() => setIsSheetOpen(true)} disabled={isApplying}>
              {selfie ? 'Cambiar foto' : 'Subir foto'}
            </Button>
          </View>
        </View>
      </Step>

      <Step number={2} title="Color">
        <View style={styles.grid} accessibilityRole="radiogroup">
          {CARTA_DE_COLORES.map((item) => {
            const selected = item.hex === color?.hex;
            return (
              <View key={item.hex} style={styles.cell}>
                <Pressable
                  onPress={() => setColor(item)}
                  style={[styles.swatch, selected && styles.swatchSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={item.nombre}
                >
                  <View style={[styles.circle, { backgroundColor: item.hex }]} />
                  <Text style={[styles.swatchLabel, selected && styles.swatchLabelSelected]} numberOfLines={2}>
                    {item.nombre}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <Text style={styles.label}>Intensidad</Text>
        <View style={styles.row}>
          {INTENSIDADES.map((item) => (
            <Chip key={item.value} label={item.label} selected={item.value === intensidad} onPress={() => setIntensidad(item.value)} />
          ))}
        </View>
      </Step>

      <Pressable
        onPress={() => setAcepta((value) => !value)}
        style={styles.consent}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acepta }}
      >
        <Ionicons name={acepta ? 'checkbox' : 'square-outline'} size={22} color={colors.violet} />
        <Text style={styles.consentText}>
          Acepto que mi foto se envíe a un servicio externo solo para generar la prueba. CapiLAR no la guarda.
        </Text>
      </Pressable>

      {error !== '' && <FormMessage message={error} />}

      <Button onPress={apply} isLoading={isApplying} disabled={!canApply}>
        Ver cómo me queda
      </Button>
      {isApplying && <Text style={[styles.hint, styles.center]}>Aplicando el color... puede tardar unos segundos.</Text>}

      {resultado && selfie && (
        <View style={styles.card}>
          <View style={styles.stepHeader}>
            <Text style={styles.sectionTitle}>Así te quedaría</Text>
            {resultado.simulado && <Text style={styles.badge}>Modo prueba</Text>}
          </View>

          <View style={styles.compare}>
            <View style={styles.figure}>
              <Image source={{ uri: selfie }} style={styles.photo} contentFit="cover" accessibilityLabel="Tu selfie antes" />
              <Text style={styles.caption}>Antes</Text>
            </View>
            <View style={styles.figure}>
              <Image
                source={{ uri: resultado.url }}
                style={styles.photo}
                contentFit="cover"
                transition={200}
                accessibilityLabel={`Tu selfie con ${resultado.color.nombre}`}
              />
              <View style={styles.captionRow}>
                <View style={[styles.dot, { backgroundColor: resultado.color.hex }]} />
                <Text style={styles.caption}>{resultado.color.nombre}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.hint}>
            Es una simulación: el resultado real depende de tu cabello. La imagen está disponible por 2 horas (hasta las{' '}
            {formatHora(resultado.venceEn)}).
          </Text>

          <Button onPress={bookColoring} isLoading={isGoingToBook}>
            Reservar coloración
          </Button>
        </View>
      )}

      <OptionsSheet
        visible={isSheetOpen}
        title="Tu selfie"
        options={[
          { label: 'Sacar una selfie', icon: 'camera-outline', onPress: () => chooseSelfie('camera') },
          { label: 'Elegir de la galería', icon: 'images-outline', onPress: () => chooseSelfie('library') },
        ]}
        onClose={() => setIsSheetOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  intro: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.grey,
    lineHeight: 22,
  },
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.white,
  },
  sectionTitle: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.lg,
    color: colors.black,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
  center: {
    textAlign: 'center',
  },
  selfieRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  selfieBox: {
    width: 110,
    aspectRatio: 3 / 4,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  selfieInfo: {
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  // 4 colores por fila; el margen negativo compensa el padding de las celdas de los costados
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    rowGap: spacing.sm,
  },
  cell: {
    width: '25%',
    paddingHorizontal: spacing.xs,
  },
  swatch: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: colors.violet,
    backgroundColor: colors.surface,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.white,
    elevation: 2,
  },
  swatchLabel: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.grey,
  },
  swatchLabelSelected: {
    fontFamily: fonts.bodySemiBold,
    color: colors.black,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  consent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.violet,
    backgroundColor: colors.surface,
  },
  consentText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.black,
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.warning,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
    color: colors.warning,
  },
  compare: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  figure: {
    flex: 1,
    gap: spacing.xs,
  },
  photo: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  caption: {
    textAlign: 'center',
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
    color: colors.grey,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
