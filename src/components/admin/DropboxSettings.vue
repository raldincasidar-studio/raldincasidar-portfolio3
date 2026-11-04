<script setup>
import { onMounted, ref } from 'vue'
import { dropboxApi } from '@/api/dropbox.js'
const appKey = ref(''), secret = ref(''), status = ref({}), error = ref(''), notice = ref(''), busy = ref(false)
async function load() { try { status.value = (await dropboxApi.connection()).data; appKey.value = status.value.appKey } catch (e) { error.value = e.message } }
async function save() { busy.value = true; error.value = ''; notice.value = ''; try { await dropboxApi.configure({ appKey: appKey.value, appSecret: secret.value }); secret.value = ''; await load(); notice.value = 'Dropbox settings saved.' } catch (e) { error.value = e.message } finally { busy.value = false } }
async function connect() { busy.value = true; error.value = ''; try { const r = await dropboxApi.start(); window.location.assign(r.data.url) } catch (e) { error.value = e.message; busy.value = false } }
async function disconnect() { if (!window.confirm('Disconnect Dropbox? Files and existing public links will not be removed.')) return; busy.value = true; try { await dropboxApi.disconnect(); await load(); notice.value = 'Dropbox disconnected.' } catch (e) { error.value = e.message } finally { busy.value = false } }
onMounted(() => { load(); const value = new URLSearchParams(location.search).get('dropbox'); if (value === 'connected') notice.value = 'Dropbox connected.'; if (value === 'cancelled') notice.value = 'Dropbox connection cancelled.' })
</script>
<template>
  <div class="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
    <p class="admin-eyebrow">Integrations</p><h2 class="admin-section-title">Dropbox media</h2>
    <p class="mt-2 max-w-2xl text-sm leading-6 text-gray-500">Connect a Dropbox app to upload and select images. An app key alone cannot access files. Use App folder access and enable file metadata, content, account info and sharing read/write scopes.</p>
    <p class="mt-4 text-sm font-semibold" :class="status.connected ? 'text-emerald-600' : 'text-gray-500'">{{ status.connected ? `Connected${status.accountName ? ' · ' + status.accountName : ''}` : 'Not connected' }}</p>
    <div class="mt-5 grid gap-4 sm:grid-cols-2"><label class="admin-label">App key<input v-model.trim="appKey" class="admin-input mt-2" autocomplete="off" /></label><label class="admin-label">App secret <span class="font-normal text-gray-400">(optional; leave blank to keep)</span><input v-model="secret" class="admin-input mt-2" type="password" autocomplete="new-password" /></label></div>
    <p v-if="error" role="alert" class="mt-3 text-sm text-red-600">{{ error }}</p><p v-if="notice" class="mt-3 text-sm text-emerald-600">{{ notice }}</p>
    <div class="mt-5 flex flex-wrap gap-3"><button type="button" class="admin-button-primary" :disabled="busy" @click="save">Save configuration</button><button type="button" class="admin-button-secondary" :disabled="busy || !status.appKey" @click="connect">{{ status.connected ? 'Reconnect' : 'Connect Dropbox' }}</button><button v-if="status.connected" type="button" class="admin-button-secondary" :disabled="busy" @click="disconnect">Disconnect</button></div>
    <p class="mt-4 text-xs leading-5 text-gray-400">Disconnecting does not delete files or revoke public links. An administrator must configure the server encryption key and registered OAuth callback first.</p>
  </div>
</template>
