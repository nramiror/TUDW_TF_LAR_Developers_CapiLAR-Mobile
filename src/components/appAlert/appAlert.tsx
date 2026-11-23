import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button/button';
import { colors, fonts, fontSizes, gradient, radius, spacing } from '@/theme';

// Mismos botones que Alert.alert de React Native, para reemplazarlo sin tocar la lógica
export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface AlertData {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

// Cola de avisos: si un botón abre otro aviso (ej. la doble confirmación de la baja), se muestra después
let queue: AlertData[] = [];
let nextId = 1;
let notify: ((queue: AlertData[]) => void) | null = null;

const update = (next: AlertData[]) => {
  queue = next;
  notify?.(queue);
};

/**
 * Aviso o confirmación con la estética de la app (pedido de Andrea: el cuadro gris del sistema no tenía nada que ver).
 * Misma firma que Alert.alert; se puede llamar desde cualquier lado, no solo desde un componente. Lo dibuja AppAlertHost
 */
export const showAlert = (title: string, message?: string, buttons?: AlertButton[]) => {
  update([...queue, { id: nextId++, title, message, buttons: buttons?.length ? buttons : [{ text: 'Aceptar' }] }]);
};

// Sin relleno (pedido de Andrea): cancelar con borde gris, la acción con borde degradado y lo que no se deshace con borde rojo
const variantOf = (button: AlertButton) => (button.style === 'cancel' ? 'grey' : button.style === 'destructive' ? 'peligro' : 'secundario');

// Va una sola vez, en el layout raíz
export const AppAlertHost = () => {
  const [items, setItems] = useState<AlertData[]>(queue);

  useEffect(() => {
    notify = setItems;
    return () => {
      notify = null;
    };
  }, []);

  const current = items[0];
  if (!current) return null;

  // Se saca de la cola antes de correr la acción, por si la acción abre otro aviso
  const press = (button?: AlertButton) => {
    update(queue.filter((item) => item.id !== current.id));
    button?.onPress?.();
  };

  // El botón atrás de Android hace lo de "Cancelar"; si el aviso no tiene, lo cierra con su único botón
  const back = () => {
    const cancel = current.buttons.find((button) => button.style === 'cancel');
    if (cancel) press(cancel);
    else if (current.buttons.length === 1) press(current.buttons[0]);
  };

  // Dos botones van lado a lado (cancelar a la izquierda); con tres o más, uno abajo del otro.
  // Tocar afuera no cierra: igual que el aviso del sistema, hay que elegir un botón
  const enFila = current.buttons.length <= 2;

  return (
    <Modal key={current.id} visible transparent animationType="fade" onRequestClose={back} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityRole="alert" accessibilityViewIsModal>
          <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={styles.strip} />
          <View style={styles.body}>
            <Text style={styles.title}>{current.title}</Text>
            {current.message ? <Text style={styles.message}>{current.message}</Text> : null}
            <View style={[styles.buttons, enFila ? styles.row : styles.column]}>
              {current.buttons.map((button, index) => (
                <Button
                  key={`${button.text}-${index}`}
                  variant={variantOf(button)}
                  size="sm"
                  bold={button.style !== 'cancel'}
                  onPress={() => press(button)}
                  style={enFila ? styles.flex : undefined}
                >
                  {button.text}
                </Button>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  card: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  strip: {
    height: 6,
  },
  body: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.lg,
    color: colors.black,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
  buttons: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column-reverse',
  },
  flex: {
    flex: 1,
  },
});
