import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button/button';
import { TextField } from '@/components/textField/textField';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

// Mismo límite que el back (CancelarTurnoDto / RechazarTurnoDto)
const MAX_MOTIVO = 500;

interface ReasonModalProps {
  visible: boolean;
  title: string;
  // Qué pasa con el motivo (quién lo ve)
  description: string;
  confirmLabel: string;
  // El motivo se puede dejar vacío (por ejemplo, al suspender una serie)
  optional?: boolean;
  isLoading?: boolean;
  onConfirm: (motivo: string) => void;
  onClose: () => void;
}

// Pide un motivo antes de una acción (rechazar o cancelar un turno: obligatorio; suspender una serie: opcional).
// En Android, Alert no tiene campo de texto: por eso un modal propio
export const ReasonModal = ({ visible, title, description, confirmLabel, optional = false, isLoading = false, onConfirm, onClose }: ReasonModalProps) => {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  // Cada vez que se abre, arranca vacío
  useEffect(() => {
    if (visible) {
      setMotivo('');
      setError('');
    }
  }, [visible]);

  const confirm = () => {
    const value = motivo.trim();
    if (!value && !optional) return setError('Contanos el motivo');
    if (value.length > MAX_MOTIVO) return setError(`Máximo ${MAX_MOTIVO} caracteres`);
    onConfirm(value);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.backdrop} behavior="padding">
        <Pressable style={StyleSheet.absoluteFill} onPress={isLoading ? undefined : onClose} accessibilityLabel="Cerrar" />
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          <TextField
            label={optional ? 'Motivo (opcional)' : 'Motivo'}
            value={motivo}
            onChangeText={(text) => {
              setMotivo(text);
              setError('');
            }}
            error={error}
            multiline
            maxLength={MAX_MOTIVO}
            style={styles.input}
            autoFocus
          />
          <View style={styles.actions}>
            <Button onPress={confirm} isLoading={isLoading}>
              {confirmLabel}
            </Button>
            <Button variant="grey" onPress={onClose} disabled={isLoading}>
              Volver
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  dialog: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  title: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.lg,
    color: colors.black,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
  input: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingVertical: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
});
