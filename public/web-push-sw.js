self.addEventListener("push", (event) => {
  const payload = event.data?.json() ?? {};

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Extasy", {
      body: payload.body ?? "Du hast eine neue Benachrichtigung.",
      icon: "/icon.png",
      tag: payload.tag ?? "extasy-notification",
      data: {
        url: payload.url ?? "/notifications",
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(
    event.notification.data?.url ?? "/notifications",
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existingClient = clients.find(
          (client) => new URL(client.url).origin === self.location.origin,
        );

        if (existingClient) {
          existingClient.navigate(targetUrl);
          return existingClient.focus();
        }

        return self.clients.openWindow(targetUrl);
      }),
  );
});
