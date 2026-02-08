import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface PushNotificationState {
  expoPushToken: string | null;
  permissionGranted: boolean;
}

export function usePushNotifications(): PushNotificationState & {
  requestPermission: () => Promise<boolean>;
  scheduleDailyReminder: () => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
} {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    // Check existing permission on mount
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPermissionGranted(status === 'granted');
    });
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!Device.isDevice) {
      // Push notifications don't work on simulators
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      setPermissionGranted(false);
      return false;
    }

    setPermissionGranted(true);

    // Get push token for remote notifications
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      setExpoPushToken(tokenData.data);
    } catch {
      // Token registration may fail on some devices; local notifications still work
    }

    // Required for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily-reminder', {
        name: 'Daily Reminder',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }

    return true;
  }, []);

  const scheduleDailyReminder = useCallback(async () => {
    // Cancel existing daily reminders first
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule "Time to read!" at 4pm daily
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to Read! 📖',
        body: 'Your daily reading adventure awaits in Scholarly!',
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 16,
        minute: 0,
      },
    });
  }, []);

  const cancelAllNotifications = useCallback(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }, []);

  return {
    expoPushToken,
    permissionGranted,
    requestPermission,
    scheduleDailyReminder,
    cancelAllNotifications,
  };
}
