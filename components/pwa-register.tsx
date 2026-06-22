'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function PWARegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/api/sw', { scope: '/' })
        .then((registration) => {
          console.log('Service Worker registered:', registration);

          // Check for updates every 5 minutes
          const interval = setInterval(() => {
            registration.update();
          }, 5 * 60 * 1000);

          // Listen for waiting service worker (new version available)
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New SW is ready, but waiting for activation
                  setUpdateAvailable(true);
                  console.log('Update available - refresh to get new version');
                }
              });
            }
          });

          return () => clearInterval(interval);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });

      // Force reload when new SW takes control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  const handleUpdate = () => {
    if (navigator.serviceWorker.controller) {
      // Tell waiting SW to skip waiting and take control
      navigator.serviceWorker.controller.postMessage({
        type: 'SKIP_WAITING',
      });
    }
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-sm z-50">
      <Card className="bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-700 shadow-lg">
        <div className="p-4 space-y-3">
          <div className="text-sm">
            <p className="font-medium text-orange-900 dark:text-orange-50">
              Nouvelle version disponible
            </p>
            <p className="text-orange-800 dark:text-orange-100 text-xs mt-1">
              Une mise à jour est prête. Rechargez pour voir les dernières modifications.
            </p>
          </div>
          <Button
            onClick={handleUpdate}
            size="sm"
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            Recharger maintenant
          </Button>
        </div>
      </Card>
    </div>
  );
}
