pid_file = "/tmp/openbao-agent.pid"

vault {
  address = "http://vault:8200"
}

auto_auth {
  method {
    type = "token_file"
    config = {
      token_file_path = "/tmp/vault-token"
    }
  }
}

template_config {
  static_secret_render_interval = "1m"
  exit_on_retry_failure         = false
}

# Render each key in secret/app as /run/secrets/<key> (Docker secrets layout).
template {
  destination = "/tmp/.app-secrets-rendered"
  contents    = "{{ with secret \"secret/data/app\" }}{{ range $k, $v := .Data.data }}{{ $v | writeToFile (printf \"/run/secrets/%s\" $k) \"\" \"\" \"0444\" }}{{ end }}{{ end }}"
}
