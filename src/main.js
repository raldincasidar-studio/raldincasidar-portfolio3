import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Global stylesheet (Tailwind CSS v4 + theme tokens + custom CSS)
import './assets/styles/main.css'

const reveal = {
	mounted(element) {
		element.classList.add('reveal-on-scroll')

		if (!('IntersectionObserver' in window)) {
			element.classList.add('reveal-visible')
			return
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return
				element.classList.add('reveal-visible')
				observer.disconnect()
			},
			{ threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
		)

		observer.observe(element)
		element._revealObserver = observer
	},
	unmounted(element) {
		element._revealObserver?.disconnect()
	},
}

createApp(App).use(router).directive('reveal', reveal).mount('#app')
