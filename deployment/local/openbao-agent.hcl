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

# Render each key in secret/sys/app as /run/secrets/<key> (Docker secrets layout).
template {
  destination = "/tmp/.app-secrets-rendered"
  contents    = "{{ with secret \"secret/data/sys/app\" }}{{ range $k, $v := .Data.data }}{{ $v | writeToFile (printf \"/run/secrets/%s\" $k) \"\" \"\" \"0444\" }}{{ end }}{{ end }}"
}

# Render each key in secret/sys/db as /run/db-secrets/<key> (tmpfs shared with db only).
template {
  destination = "/tmp/.db-secrets-rendered"
  contents    = "{{ with secret \"secret/data/sys/db\" }}{{ range $k, $v := .Data.data }}{{ $v | writeToFile (printf \"/run/db-secrets/%s\" $k) \"\" \"\" \"0444\" }}{{ end }}{{ end }}"
}
