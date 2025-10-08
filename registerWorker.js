// Registrar Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        console.log('ServiceWorker registrado correctamente');
      })
      .catch(function(error) {
        console.log('ServiceWorker falló:', error);
      });
  });
}