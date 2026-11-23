const errorBox = document.getElementById('login-error')
const params = new URLSearchParams(window.location.search)
const message = params.get('error')

if (message && errorBox) {
  errorBox.hidden = false
  errorBox.textContent = message
}
