import { createApp, h, ref } from 'vue'
import Dashboard from '../popup/Dashboard.vue'
import ScribeDetail from '../popup/ScribeDetail.vue'
import '../popup/style.css'

const params = new URLSearchParams(location.search)
const initialScribe = params.get('scribe') || ''

const Root = {
  setup() {
    const scribeId = ref<string>(initialScribe)
    const showDetail = ref<boolean>(!!initialScribe)

    function openScribe(id: string) {
      scribeId.value = id
      showDetail.value = true
      const url = new URL(location.href)
      url.searchParams.set('scribe', id)
      history.replaceState(null, '', url.toString())
    }

    function back() {
      showDetail.value = false
      const url = new URL(location.href)
      url.searchParams.delete('scribe')
      history.replaceState(null, '', url.toString())
    }

    return () => showDetail.value
      ? h(ScribeDetail, { scribeId: scribeId.value, onBack: back })
      : h(Dashboard, { onOpenScribe: openScribe })
  }
}

createApp(Root as any).mount('#app')
