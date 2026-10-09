<script setup>
import { onUnmounted, ref, watch } from 'vue'
import CampaignForm from './CampaignForm.vue'
import { requestApi } from '../api.js'

const props = defineProps({ campaignId: { type: String, required: true }, userId: { type: Number, required: true } })
const emit = defineEmits(['saved', 'session-expired'])
const campaign = ref(null)
const loading = ref(true)
const error = ref('')
let version = 0

async function load() {
  const current = ++version
  loading.value = true
  campaign.value = null
  error.value = ''
  try {
    const result = await requestApi('/api/campaigns/' + props.campaignId)
    if (current !== version) return
    if (result.campaign.owner_id !== props.userId) {
      error.value = 'Solo el creador puede editar esta campaña.'
    } else if (result.campaign.status !== 'Borrador') {
      error.value = 'Solo se pueden editar campañas en Borrador.'
    } else {
      campaign.value = result.campaign
    }
  } catch (failure) {
    if (current !== version) return
    if (failure.status === 401) emit('session-expired')
    else error.value = failure.message
  } finally { if (current === version) loading.value = false }
}

watch(() => props.campaignId, load, { immediate: true })
onUnmounted(() => { version++ })
</script>

<template>
  <main v-if="loading || error" class="home-content campaign-content">
    <a class="back-link" href="#/my-campaigns">← Volver a mis campañas</a>
    <h1>Editar campaña</h1>
    <p v-if="loading" role="status">Cargando campaña…</p>
    <template v-else>
      <p class="message error" role="alert">{{ error }}</p>
      <button class="outline-button" type="button" @click="load">Reintentar</button>
    </template>
  </main>
  <CampaignForm v-else-if="campaign" :key="campaign.id" :campaign="campaign" @saved="emit('saved', $event)" @session-expired="emit('session-expired')" />
</template>
