import { createRouter, createWebHistory } from 'vue-router'
import KlondikeView from '@/KlondikeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Klondike',
      component: KlondikeView,
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: KlondikeView,
    },
  ],
})

export default router
