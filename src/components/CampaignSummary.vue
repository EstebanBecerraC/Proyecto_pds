<script setup>
import { onUnmounted, ref, watch } from 'vue'
import { requestApi } from '../api.js'
import { formatDeadline, formatGoal } from '../../shared/campaign.js'

const props = defineProps({ campaignId: { type: String, required: true }, userId: { type: Number, required: true } })
const emit = defineEmits(['session-expired', 'removed'])
const campaign = ref(null)
const loading = ref(true)
const error = ref('')
const actionBusy = ref(false)
const actionError = ref('')
const actionNotice = ref('')
const confirmingDelete = ref(false)
const confirmingCancel = ref(false)
let version = 0
async function load() {
  const current = ++version
  loading.value = true
  error.value = ''
  actionError.value = ''
  actionNotice.value = ''
  confirmingDelete.value = false
  confirmingCancel.value = false
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
  if (actionBusy.value || campaign.value?.status !== 'Borrador') return
  const current = version
  actionBusy.value = true
  actionError.value = ''
  try {
    const result = await requestApi('/api/campaigns/' + props.campaignId + '/activate', { method: 'POST' })
    if (current === version) campaign.value = result.campaign
  } catch (failure) {
    if (current !== version) return
    if (failure.status === 401) emit('session-expired')
    else actionError.value = failure.message
  } finally { actionBusy.value = false }
}
async function cancelCampaign() {
  if (actionBusy.value || campaign.value?.status !== 'Activa') return
  const current = version
  actionBusy.value = true
  actionError.value = ''
  actionNotice.value = ''
  try {
    const result = await requestApi('/api/campaigns/' + props.campaignId + '/cancel', { method: 'POST' })
    if (current !== version) return
    campaign.value = result.campaign
    confirmingCancel.value = false
    actionNotice.value = 'La campaña fue cancelada y ya no acepta nuevos aportes.'
  } catch (failure) {
    if (current !== version) return
    if (failure.status === 401) emit('session-expired')
    else actionError.value = failure.message
  } finally { actionBusy.value = false }
}
async function deleteDraft() {
  if (actionBusy.value || campaign.value?.status !== 'Borrador' || campaign.value?.raised_cents !== 0) return
  const current = version
  actionBusy.value = true
  actionError.value = ''
  try {
    await requestApi('/api/campaigns/' + props.campaignId, { method: 'DELETE' })
    if (current === version) emit('removed')
  } catch (failure) {
    if (current !== version) return
    if (failure.status === 401) emit('session-expired')
    else actionError.value = failure.message
  } finally { actionBusy.value = false }
}
watch(() => props.campaignId, load, { immediate: true })
onUnmounted(() => { version++ })
</script>

<template>
  <main class="home-content">
    <a class="back-link" :href="campaign?.owner_id === userId ? '#/my-campaigns' : '#/home'">← Volver</a>
    <p v-if="loading" role="status">Cargando campaña…</p>
    <div v-else-if="error"><p class="message error" role="alert">{{ error }}</p><button class="outline-button" @click="load">Reintentar</button></div>
    <article v-else-if="campaign" class="campaign-summary">
      <p class="badge">RESUMEN DE LA CAMPAÑA</p>
      <span class="draft-badge" :class="{ 'active-badge': campaign.status === 'Activa', 'cancelled-badge': campaign.status === 'Cancelada' }" role="status">{{ campaign.status }}</span>
      <h1>{{ campaign.title }}</h1>
      <p v-if="campaign.status === 'Borrador'" class="home-lead">Tu campaña está guardada como borrador.</p>
      <p v-else-if="campaign.status === 'Activa'" class="home-lead">Esta campaña está activa.</p>
      <p v-else class="home-lead">Esta campaña fue cancelada y ya no recibe aportes.</p>
      <p v-if="actionError" class="message error" role="alert">{{ actionError }}</p>
      <p v-if="actionNotice" class="message success" role="status">{{ actionNotice }}</p>
      <div v-if="campaign.owner_id === userId" class="campaign-management-actions">
        <button v-if="campaign.status === 'Borrador'" class="button-link" type="button" :disabled="actionBusy" @click="activate">{{ actionBusy ? 'Procesando…' : 'Activar campaña' }}</button>
        <button v-if="campaign.status === 'Borrador' && campaign.raised_cents === 0" class="danger-button" type="button" :disabled="actionBusy" @click="confirmingDelete = true; confirmingCancel = false">Eliminar campaña</button>
        <button v-if="campaign.status === 'Activa'" class="danger-button" type="button" :disabled="actionBusy" @click="confirmingCancel = true; confirmingDelete = false">Cancelar Campaña</button>
      </div>
      <section v-if="confirmingCancel" class="delete-confirmation" role="alertdialog" aria-labelledby="cancel-title" aria-describedby="cancel-description">
        <h2 id="cancel-title">¿Cancelar esta campaña?</h2>
        <p id="cancel-description">La campaña dejará de aparecer en el catálogo público y no podrá recibir nuevos aportes.</p>
        <div class="confirmation-actions">
          <button class="danger-button" type="button" :disabled="actionBusy" @click="cancelCampaign">{{ actionBusy ? 'Cancelando…' : 'Sí, cancelar campaña' }}</button>
          <button class="outline-button" type="button" :disabled="actionBusy" @click="confirmingCancel = false">Volver</button>
        </div>
      </section>
      <section v-if="confirmingDelete" class="delete-confirmation" role="alertdialog" aria-labelledby="delete-title" aria-describedby="delete-description">
        <h2 id="delete-title">¿Eliminar esta campaña?</h2>
        <p id="delete-description">Esta acción es permanente. El borrador y su imagen desaparecerán de la plataforma.</p>
        <div class="confirmation-actions">
          <button class="danger-button" type="button" :disabled="actionBusy" @click="deleteDraft">{{ actionBusy ? 'Eliminando…' : 'Sí, eliminar permanentemente' }}</button>
          <button class="outline-button" type="button" :disabled="actionBusy" @click="confirmingDelete = false">Volver</button>
        </div>
      </section>
      <img :src="campaign.imageUrl" :alt="'Imagen de ' + campaign.title" class="summary-image" />
      <dl class="campaign-facts">
        <div><dt>Categoría</dt><dd>{{ campaign.category }}</dd></div>
        <div><dt>Meta de financiamiento</dt><dd>{{ formatGoal(campaign.goal_cents) }} CLP</dd></div>
        <div><dt>Fecha límite</dt><dd>{{ formatDeadline(campaign.deadline) }}</dd></div>
      </dl>
      <section class="campaign-description"><h2>Acerca del proyecto</h2><p>{{ campaign.description }}</p></section>
      <a class="button-link" :href="campaign.owner_id === userId ? '#/my-campaigns' : '#/home'">{{ campaign.owner_id === userId ? 'Volver a mis campañas' : 'Volver al catálogo' }}</a>
    </article>
  </main>
</template>
