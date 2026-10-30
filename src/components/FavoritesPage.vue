<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import MemberLayout from './MemberLayout.vue'
import { requestApi } from '../api.js'
import { formatGoal } from '../../shared/campaign.js'

defineProps({ busy: Boolean, error: String })
const emit = defineEmits(['logout', 'session-expired'])
const campaigns = ref([])
const loading = ref(true)
const loadError = ref('')
const removeError = ref('')
const removingId = ref(null)
const notice = ref('')
let version = 0
async function load() {
  const current = ++version
  loading.value = true
  loadError.value = ''
  try {
    const result = await requestApi('/api/favorites')
    if (current === version) campaigns.value = result.campaigns
  } catch (failure) {
    if (current !== version) return
    if (failure.status === 401) emit('session-expired')
    else loadError.value = failure.message
  } finally { if (current === version) loading.value = false }
}
async function remove(id) {
  if (removingId.value !== null) return
  const current = version
  removingId.value = id
  removeError.value = ''
  notice.value = ''
  try {
    await requestApi('/api/favorites/' + id, { method: 'DELETE' })
    if (current !== version) return
    campaigns.value = campaigns.value.filter(campaign => campaign.id !== id)
    notice.value = 'Campaña eliminada de tus favoritas.'
  } catch (failure) {
    if (current !== version) return
    if (failure.status === 401) emit('session-expired')
    else removeError.value = failure.message
  } finally { if (current === version) removingId.value = null }
}
onMounted(load)
onUnmounted(() => { version++ })
</script>

<template>
  <MemberLayout :busy="busy" :error="error" @logout="$emit('logout')">
    <main class="home-content">
      <p class="badge">PROYECTOS QUE TE INTERESAN</p>
      <h1>Mis favoritas</h1>
      <p class="home-lead">Guarda campañas para encontrarlas cuando quieras volver.</p>
      <p v-if="notice" class="message success" role="status">{{ notice }}</p>
      <p v-if="removeError" class="message error" role="alert">{{ removeError }}</p>
      <p v-if="loading" role="status">Cargando tus favoritas…</p>
      <div v-else-if="loadError"><p class="message error" role="alert">{{ loadError }}</p><button class="outline-button" @click="load">Reintentar</button></div>
      <section v-else-if="!campaigns.length" class="placeholder-panel">
        <h2>Aún no tienes campañas favoritas disponibles.</h2>
        <p>Explora las campañas y selecciona «Guardar en favoritas» en las que te interesen.</p>
        <a class="button-link empty-action" href="#/home">Explorar campañas</a>
      </section>
      <div v-else class="campaign-grid favorites-grid">
        <article v-for="campaign in campaigns" :key="campaign.id" class="campaign-tile" data-cy="favorite-card">
          <a :href="'#/campaigns/' + campaign.id" class="favorite-card-link">
            <img :src="campaign.imageUrl" :alt="'Imagen de ' + campaign.title" loading="lazy" />
            <div class="tile-copy"><span class="draft-badge" :class="{ 'active-badge': campaign.status === 'Activa', 'cancelled-badge': campaign.status === 'Cancelada' }">{{ campaign.status }}</span><h2>{{ campaign.title }}</h2><p>{{ campaign.category }}</p><strong>Meta: {{ formatGoal(campaign.goal_cents) }} CLP</strong><span>{{ campaign.fundingPercentage }} % financiado</span><span class="tile-action">Ver detalle →</span></div>
          </a>
          <div class="favorite-card-actions"><button class="outline-button" type="button" :disabled="removingId !== null" :aria-label="'Quitar de favoritas: ' + campaign.title" @click="remove(campaign.id)">{{ removingId === campaign.id ? 'Quitando…' : 'Quitar de favoritas' }}</button></div>
        </article>
      </div>
    </main>
  </MemberLayout>
</template>
