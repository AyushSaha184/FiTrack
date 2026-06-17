import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking } from 'react-native';
import notifee, { AuthorizationStatus } from '@notifee/react-native';

// react-native-health is iOS-only — never import it at the top level on Android.
// We lazy-require it only when Platform.OS === 'ios' to avoid the native module crash.
type HealthType = typeof import('react-native-health').default;
type HealthPermissionType = (typeof import('react-native-health'))['HealthPermission'];

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

const mapAuthStatus = (status: AuthorizationStatus): PermissionStatus => {
  switch (status) {
    case AuthorizationStatus.AUTHORIZED:
    case AuthorizationStatus.PROVISIONAL:
      return 'granted';
    case AuthorizationStatus.DENIED:
      return 'denied';
    case AuthorizationStatus.NOT_DETERMINED:
      return 'undetermined';
    default:
      return 'unavailable';
  }
};

export const usePermissions = () => {
  const [notificationsStatus, setNotificationsStatus] = useState<PermissionStatus>('undetermined');
  const [healthStatus, setHealthStatus] = useState<PermissionStatus>('undetermined');
  const [locationStatus, setLocationStatus] = useState<PermissionStatus>('undetermined');

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    if (Platform.OS === 'ios') {
      const settings = await notifee.getNotificationSettings();
      setNotificationsStatus(mapAuthStatus(settings.authorizationStatus));
    }
  };

  const requestNotifications = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      const settings = await notifee.requestPermission();
      const status = mapAuthStatus(settings.authorizationStatus);
      setNotificationsStatus(status);
      return status === 'granted';
    }
    return true;
  }, []);

  const requestHealthAccess = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') {
      setHealthStatus('unavailable');
      return false;
    }

    // Lazy require — only evaluated on iOS so Android never touches AppleHealthKit
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Health = require('react-native-health').default as HealthType;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { HealthPermission } = require('react-native-health') as { HealthPermission: HealthPermissionType };

    return new Promise<boolean>((resolve) => {
      Health.isAvailable((err: any, available: boolean) => {
        if (err || !available) {
          setHealthStatus('unavailable');
          resolve(false);
          return;
        }

        const permissions = {
          permissions: {
            read: [
              HealthPermission.StepCount,
              HealthPermission.BodyMass,
              HealthPermission.Height,
            ],
            write: [] as any[],
          },
        };

        Health.initHealthKit(permissions, (error: string) => {
          if (error) {
            console.warn('[usePermissions] Health access error:', error);
            setHealthStatus('denied');
            resolve(false);
          } else {
            setHealthStatus('granted');
            resolve(true);
          }
        });
      });
    });
  }, []);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  return {
    notificationsStatus,
    healthStatus,
    locationStatus,
    requestNotifications,
    requestHealthAccess,
    openSettings,
    checkPermissions,
  };
};
