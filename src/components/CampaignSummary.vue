<script setup>
import { ref, watch } from 'vue'
import { requestApi } from '../api.js'
import { formatDeadline, formatGoal } from '../../shared/campaign.js'

const props = defineProps({ campaignId: { type: String, required: true } })
const emit = defineEmits(['session-expired'])
const campaign = ref(null)
const loading = ref(true)
const error = ref('')
const activating = ref(false)
const activationError = ref('')
let version = 0
async function load() {
  const current = ++version
  loading.value = true
  error.value = ''
  activationError.value = ''
  campaign.value = null
  try {
    const result = await requestApi('/api/campaigns/' + props.campaignId)
    if (current === version) campaign.value = result.campaign
  } catch (failure) {
    if (current !== version) return
    if (failure.status === 401) emit('session-expired')
    else error.value = failure.message
  } finally { if (current === version) loading.value = false }
}
async function activate() {
  if (activating.value || campaign.value?.status !== 'Borrador') return
  const current = version
  activating.value = true
  activationError.value = ''
  try {
    const result = await requestApi('/api/campaigns/' + props.campaignId + '/activate', { method: 'POST' })
    if (current === version) campaign.value = result.campaign
  } catch (failure) {
    if (current !== version) return
    if (failure.status === 401) emit('session-expired')
    else activationError.value = failure.message
  } finally { activating.value = false }
}
watch(() => props.campaignId, load, { immediate: true })
</script>

<template>
  <main class="home-content">
    <a class="back-link" href="#/home">← Volver a mis campañas</a>
    <p v-if="loading" role="status">Cargando campaña…</p>
    <div v-else-if="error"><p class="message error" role="alert">{{ error }}</p><button class="outline-button" @click="load">Reintentar</button></div>
    <article v-else-if="campaign" class="campaign-summary">
      <p class="badge">RESUMEN DE TU CAMPAÑA</p>
      <span class="draft-badge" :class="{ 'active-badge': campaign.status === 'Activa' }" role="status">{{ campaign.status }}</span>
      <h1>{{ campaign.title }}</h1>
      <p v-if="campaign.status === 'Borrador'" class="home-lead">Tu campaña está guardada como borrador.</p>
      <p v-else class="home-lead">Tu campaña está activa.</p>
      <p v-if="activationError" class="message error" role="alert">{{ activationError }}</p>
      <button v-if="campaign.status === 'Borrador'" class="button-link" type="button" :disabled="activating" @click="activate">{{ activating ? 'Activando…' : 'Activar campaña' }}</button>
      <img :src="campaign.imageUrl" :alt="'Imagen de ' + campaign.title" class="summary-image" />
      <dl class="campaign-facts">
        <div><dt>Categoría</dt><dd>{{ campaign.category }}</dd></div>
        <div><dt>Meta de financiamiento</dt><dd>{{ formatGoal(campaign.goal_cents) }} CLP</dd></div>
        <div><dt>Fecha límite</dt><dd>{{ formatDeadline(campaign.deadline) }}</dd></div>
      </dl>
      <section class="campaign-description"><h2>Acerca del proyecto</h2><p>{{ campaign.description }}</p></section>
      <a class="button-link" href="#/home">Volver a mis campañas</a>
    </article>
  </main>
</template>
