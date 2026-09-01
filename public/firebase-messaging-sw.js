// Service worker do Firebase Cloud Messaging — recebe push notifications em
// background (app fechado/minimizado). Config do Firebase é pública (a mesma
// que já vai em todo bundle do app), por isso pode ficar hardcoded aqui —
// service workers estáticos não têm acesso a import.meta.env do Vite.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyC2ehj9UXUA6WzAqW8FvWwvD4nukY3sNI0',
  authDomain: 'alugapro-247a2.firebaseapp.com',
  projectId: 'alugapro-247a2',
  storageBucket: 'alugapro-247a2.firebasestorage.app',
  messagingSenderId: '792130538801',
  appId: '1:792130538801:web:1c7c33d85b51d1ab67f410',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'AlugaPro'
  const options = {
    body: payload.notification?.body ?? '',
    icon: '/favicon.png',
    badge: '/favicon.png',
  }
  self.registration.showNotification(title, options)
})
