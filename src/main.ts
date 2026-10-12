import { mount } from 'svelte'
import '@fontsource/cinzel/400.css'
import '@fontsource/cinzel/700.css'
import '@fontsource/crimson-text/400.css'
import '@fontsource/crimson-text/600.css'
import '@fontsource/crimson-text/700.css'
import './app.css'
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
