<script setup>
import { onMounted, ref } from 'vue'
import MemberLayout from './MemberLayout.vue'
import { requestApi } from '../api.js'
import { formatGoal } from '../../shared/campaign.js'

defineProps({ user: { type: Object, required: true }, busy: Boolean, error: String })
const emit = defineEmits(['logout', 'session-expired'])
const campaigns = ref([])
const loading = ref(true)
const loadError = ref('')
async function load() {
  loading.value = true
  loadError.value = ''
  try { campaigns.value = (await requestApi('/api/campaigns')).campaigns }
  catch (failure) {
    if (failure.status === 401) emit('session-expired')
    else loadError.value = failure.message
  } finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <MemberLayout :busy="busy" :error="error" @logout="$emit('logout')">
    <main class="home-content">
      <p class="badge">TU COMUNIDAD, TU PUNTO DE PARTIDA</p>
      <div class="campaign-heading">
        <div><h1>Hola, {{ user.name }}.</h1><p class="home-lead">Aquí comienzan las ideas que quieres compartir.</p></div>
        <a class="button-link" href="#/campaigns/new">Crear campaña <span aria-hidden="true">＋</span></a>
      </div>
      <h2 class="campaign-list-title">Mis campañas</h2>
      <p v-if="loading" role="status">Cargando tus campañas…</p>
      <div v-else-if="loadError"><p class="message error" role="alert">{{ loadError }}</p><button class="outline-button" @click="load">Reintentar</button></div>
      <section v-else-if="!campaigns.length" class="placeholder-panel">
        <div class="placeholder-symbol" aria-hidden="true">↗</div>
        <h2>Tu primera idea empieza aquí.</h2>
        <p>Crea una campaña y guarda los detalles de tu proyecto como borrador.</p>
        <a class="button-link empty-action" href="#/campaigns/new">Crear mi primera campaña</a>
      </section>
      <div v-else class="campaign-grid">
        <a v-for="campaign in campaigns" :key="campaign.id" :href="'#/campaigns/' + campaign.id" class="campaign-tile">
          <img :src="campaign.imageUrl" :alt="'Imagen de ' + campaign.title" loading="lazy" />
          <div class="tile-copy"><span class="draft-badge" :class="{ 'active-badge': campaign.status === 'Activa' }">{{ campaign.status }}</span><h3>{{ campaign.title }}</h3><p>{{ campaign.category }}</p><strong>{{ formatGoal(campaign.goal_cents) }} CLP</strong><span class="tile-action">Ver resumen →</span></div>
        </a>
      </div>
      <p class="session-caption">Sesión iniciada como <strong>{{ user.email }}</strong></p>
    </main>
  </MemberLayout>
</template>
