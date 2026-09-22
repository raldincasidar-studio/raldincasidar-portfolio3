import { ref } from 'vue'
import { getHomeContent } from '@/api/publicContent.js'

export function usePublicContent() {
  const works = ref([])
  const labs = ref([])
  const isLoading = ref(true)
  const error = ref(null)
  async function load() {
    isLoading.value = true; error.value = null
    try { const data = await getHomeContent(); works.value = data.works; labs.value = data.labs; return data }
    catch (err) { error.value = err; throw err }
    finally { isLoading.value = false }
  }
  return { works, labs, isLoading, error, load }
}
