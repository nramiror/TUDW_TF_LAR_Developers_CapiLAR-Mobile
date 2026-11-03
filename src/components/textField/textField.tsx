import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  // Mensaje de validación debajo del campo (borde rojo)
  error?: string;
  // Texto de ayuda gris debajo del campo, cuando no hay error
  hint?: string;
  // Contraseña: oculta el texto y muestra el ojito para verla
  password?: boolean;
}

// Campo de formulario con etiqueta, error y ayuda (como FormField en la web)
export const TextField = forwardRef<TextInput, TextFieldProps>(({ label, error, hint, password = false, style, ...props }, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isHidden, setIsHidden] = useState(true);

  const borderColor = error ? colors.error : isFocused ? colors.violet : colors.border;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, { borderColor }]}>
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={colors.greyLight}
          secureTextEntry={password && isHidden}
          autoCapitalize={password ? 'none' : props.autoCapitalize}
          autoCorrect={password ? false : props.autoCorrect}
          accessibilityLabel={label}
          {...props}
          onFocus={(event) => {
            setIsFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            props.onBlur?.(event);
          }}
        />
        {password && (
          <Pressable
            onPress={() => setIsHidden((hidden) => !hidden)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isHidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
          >
            <Ionicons name={isHidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.grey} />
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    minHeight: 48,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.error,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.grey,
  },
});
