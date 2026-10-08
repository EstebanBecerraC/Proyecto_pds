<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import MemberLayout from './MemberLayout.vue'
import { requestApi } from '../api.js'
import { formatGoal } from '../../shared/campaign.js'

defineProps({ user: { type: Object, required: true }, busy: Boolean, error: String })
const emit = defineEmits(['logout', 'session-expired'])
const campaigns = ref([])
const pagination = ref({ page: 1, pageSize: 25, total: 0, totalPages: 0 })
const loading = ref(true)
const loadError = ref('')
let version = 0

async function load(page = pagination.value.page) {
  const current = ++version
  loading.value = true
  loadError.value = ''
  try {
    const result = await requestApi('/api/campaigns/catalog?page=' + page)
    if (current !== version) return
    campaigns.value = result.campaigns
    pagination.value = result.pagination
  } catch (failure) {
    if (current !== version) return
    if (failure.status === 401) emit('session-expired')
    else loadError.value = failure.message
  } finally { if (current === version) loading.value = false }
}
function changePage(page) {
  if (loading.value) return
  load(page)
  window.scrollTo(0, 0)
}
onMounted(() => load())
onUnmounted(() => { version++ })
</script>

<template>
  <MemberLayout :busy="busy" :error="error" @logout="$emit('logout')">
    <main class="home-content">
      <p class="badge">IDEAS QUE BUSCAN UN IMPULSO</p>
      <div class="campaign-heading">
        <div><h1>Descubre nuevos proyectos.</h1><p class="home-lead">Explora las campañas que están buscando financiamiento en CrowdStarter.</p></div>
        <a class="button-link" href="#/campaigns/new">Crear campaña <span aria-hidden="true">＋</span></a>
      </div>
      <h2 class="campaign-list-title">Campañas activas</h2>
      <p v-if="loading" role="status">Cargando campañas…</p>
      <div v-else-if="loadError"><p class="message error" role="alert">{{ loadError }}</p><button class="outline-button" @click="load()">Reintentar</button></div>
      <section v-else-if="pagination.total === 0" class="placeholder-panel">
        <div class="placeholder-symbol" aria-hidden="true">↗</div>
        <h2>Todavía no hay campañas activas</h2>
        <p>Vuelve pronto para descubrir nuevos proyectos de la comunidad.</p>
      </section>
      <template v-else>
        <p class="catalog-count" role="status">Mostrando {{ (pagination.page - 1) * pagination.pageSize + 1 }}–{{ (pagination.page - 1) * pagination.pageSize + campaigns.length }} de {{ pagination.total }} campañas activas</p>
        <div class="campaign-grid">
          <a v-for="campaign in campaigns" :key="campaign.id" :href="'#/campaigns/' + campaign.id" class="campaign-tile">
            <img :src="campaign.imageUrl" :alt="'Imagen de ' + campaign.title" loading="lazy" />
            <div class="tile-copy">
              <span class="draft-badge active-badge">Activa</span>
              <h3>{{ campaign.title }}</h3>
              <p>{{ campaign.category }}</p>
              <span class="goal-caption">Meta de financiamiento</span>
              <strong>{{ formatGoal(campaign.goal_cents) }} CLP</strong>
              <div class="funding-progress">
                <span>{{ campaign.fundingPercentage }} % financiado</span>
                <progress :value="Math.min(campaign.fundingPercentage, 100)" max="100" :aria-label="'Financiamiento de ' + campaign.title"></progress>
              </div>
              <span class="tile-action">Ver proyecto →</span>
            </div>
          </a>
        </div>
        <nav v-if="pagination.totalPages > 1" class="pagination-controls" aria-label="Paginación de campañas">
          <button class="outline-button" :disabled="pagination.page <= 1 || loading" @click="changePage(pagination.page - 1)">← Anterior</button>
          <span aria-live="polite">Página {{ pagination.page }} de {{ pagination.totalPages }}</span>
          <button class="outline-button" :disabled="pagination.page >= pagination.totalPages || loading" @click="changePage(pagination.page + 1)">Siguiente →</button>
        </nav>
      </template>
    </main>
  </MemberLayout>
</template>
