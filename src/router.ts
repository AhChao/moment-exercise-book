import { createRouter, createWebHashHistory } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** Full-screen routes hide the bottom tab bar. */
    hideTabbar?: boolean
  }
}

export const router = createRouter({
  history: createWebHashHistory(),
  // Scroll position is owned by useScrollMemory (App.vue).
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/chapter/:chapterId', name: 'chapter', component: () => import('@/views/ChapterView.vue') },
    { path: '/exercise/:exerciseId', name: 'exercise', component: () => import('@/views/ExerciseView.vue') },
    {
      path: '/exercise/:exerciseId/shoot/:shot',
      name: 'shoot',
      component: () => import('@/views/CaptureView.vue'),
      meta: { hideTabbar: true },
    },
    { path: '/album', name: 'album', component: () => import('@/views/AlbumView.vue') },
    {
      path: '/photo/:photoId',
      name: 'photo',
      component: () => import('@/views/PhotoView.vue'),
      meta: { hideTabbar: true },
    },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
    { path: '/:pathMatch(.*)*', name: 'notfound', component: () => import('@/views/home/NotFoundView.vue') },
  ],
})

export default router
