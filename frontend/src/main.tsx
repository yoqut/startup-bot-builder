import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './i18n'
import './index.css'

// Telegram Mini App setup
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tg = (window as any).Telegram?.WebApp
if (tg) {
  tg.ready()
  tg.expand()
  // tg.enableClosingConfirmation() // Ask user to confirm before closing the app
  // tg.fullScreen() // Optional: make the app take the full screen height
  tg.disableVerticalSwipes()
  tg.setHeaderColor?.('#17212b')
  tg.setBackgroundColor?.('#17212b')
  tg.setBottomBarColor?.('#17212b')
  // tg.MainButton.showProgress()

  // Expose Telegram safe-area as CSS custom property so any element can use it
  const applyInsets = () => {
    const top =
      tg.contentSafeAreaInsets?.top ??
      tg.safeAreaInsets?.top ??
      0
    const bottom =
      tg.contentSafeAreaInsets?.bottom ??
      tg.safeAreaInsets?.bottom ??
      0
    document.documentElement.style.setProperty('--tg-safe-top',    `${Math.round(top)}px`)
    document.documentElement.style.setProperty('--tg-safe-bottom', `${Math.round(bottom)}px`)
  }
  applyInsets()
  tg.onEvent?.('safeAreaChanged',        applyInsets)
  tg.onEvent?.('contentSafeAreaChanged', applyInsets)
}

// Prevent Telegram from closing the app on downward swipe.
// Allow touchmove only inside elements that can actually scroll.
document.body.addEventListener('touchmove', (e) => {
  let el = e.target as HTMLElement | null
  while (el && el !== document.body) {
    const { overflow, overflowY } = window.getComputedStyle(el)
    if (/(auto|scroll)/.test(overflow + overflowY) && el.scrollHeight > el.clientHeight) {
      return // scrollable element — let the event through
    }
    el = el.parentElement
  }
  // Not inside a scrollable element — block the gesture
  if (e.cancelable) e.preventDefault()
}, { passive: false })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
