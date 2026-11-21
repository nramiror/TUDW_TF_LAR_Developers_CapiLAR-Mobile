import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router, useRootNavigationState } from 'expo-router';
import type { NotificationResponse } from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { registerPushTokenRequest } from '@/api/users';
import type { PushData } from '@/api/users';
import { useAuth } from '@/context/auth/useAuth';
import { colors } from '@/theme';

type NotificationsModule = typeof import('expo-notifications');

// Expo Go en Android no recibe push (desde el SDK 53): ahí ni se carga el módulo y la app anda igual sin avisos.
// Se prueba con el APK de EAS
const pushDisponible = Platform.OS === 'android' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

let notificationsPromise: Promise<NotificationsModule> | null = null;

// Se carga una sola vez: cómo se muestran con la app abierta y el canal de Android
const loadNotifications = () => {
  notificationsPromise ??= import('expo-notifications').then(async (Notifications) => {
    // Con la app abierta también se ve el aviso arriba (si no, Android lo descarta)
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    // El back no manda channelId, así que llegan al canal "default": con importancia alta aparecen arriba de la pantalla
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Turnos',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: colors.violet,
      vibrationPattern: [0, 250, 250, 250],
    });
    return Notifications;
  });
  return notificationsPromise;
};

const readData = (response: NotificationResponse): PushData | null => {
  const data = response.notification.request.content.data as Partial<PushData> | undefined;
  return data?.tipo ? { tipo: data.tipo, turnoId: Number(data.turnoId) } : null;
};

// F06/F07 push (PWA-187). Registra el token de Expo en la sesión del back (una vez por sesión: cerrar sesión lo
// borra allá) y, al tocar un aviso, abre los turnos según el rol. El ADMIN no usa la app
export const PushNotifications = () => {
  const { user, token, sessionId, isCheckingSession } = useAuth();
  const navigationReady = useRootNavigationState()?.key !== undefined;
  // Sesión para la que ya se registró el token: el access token cambia cada 15 min y no hace falta repetirlo
  const registeredFor = useRef<number | null>(null);
  // Aviso tocado que todavía no se abrió (por ejemplo, con la app cerrada, mientras se recupera la sesión)
  const [pending, setPending] = useState<PushData | null>(null);

  useEffect(() => {
    if (!pushDisponible || !token || !user || user.rol === 'ADMIN' || registeredFor.current === sessionId) return;
    registeredFor.current = sessionId;
    const register = async () => {
      const Notifications = await loadNotifications();
      // En Android 13 o más aparece el permiso del sistema; si lo niega, la app sigue igual y solo llegan los mails
      const { granted } = await Notifications.requestPermissionsAsync();
      if (!granted) return;
      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
      const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
      await registerPushTokenRequest(token, pushToken);
    };
    register().catch((err) => {
      // Sin red o sin Firebase: se reintenta en la próxima sesión
      registeredFor.current = null;
      if (__DEV__) console.warn('[push] No se pudo registrar el token:', err);
    });
  }, [token, user, sessionId]);

  useEffect(() => {
    if (!pushDisponible) return;
    let cancelled = false;
    let subscription: { remove: () => void } | undefined;
    loadNotifications()
      .then(async (Notifications) => {
        if (cancelled) return;
        subscription = Notifications.addNotificationResponseReceivedListener((response) => setPending(readData(response)));
        // Si la app estaba cerrada, el aviso que la abrió
        const last = await Notifications.getLastNotificationResponseAsync();
        if (last && !cancelled) {
          setPending(readData(last));
          await Notifications.clearLastNotificationResponseAsync();
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (!pending || isCheckingSession || !navigationReady) return;
    // Un instante después, así no lo pisa la redirección de la bienvenida al inicio del rol (app recién abierta)
    const timer = setTimeout(() => {
      setPending(null);
      // Sin sesión queda en la bienvenida: al entrar ve sus turnos igual
      if (!user || user.rol === 'ADMIN') return;
      router.navigate(user.rol === 'CLIENTE' ? '/cliente/turnos' : '/profesional');
    }, 300);
    return () => clearTimeout(timer);
  }, [pending, isCheckingSession, navigationReady, user]);

  return null;
};
