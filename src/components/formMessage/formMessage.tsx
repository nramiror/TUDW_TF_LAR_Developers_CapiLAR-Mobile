import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

interface FormMessageProps {
  message: string;
  type?: 'error' | 'success';
}

// Mensaje general de un formulario (por ejemplo, el error que devuelve el back)
export const FormMessage = ({ message, type = 'error' }: FormMessageProps) => {
  const color = type === 'error' ? colors.error : colors.success;

  return (
    <View style={[styles.box, { borderColor: color }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Ionicons name={type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={20} color={color} />
      <Text style={[styles.text, { color }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    backgroundColor: colors.white,
  },
  text: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
  },
});
