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

@TEMPLATE@
template {
  destination = "/tmp/.rendered-@MARKER@"
  contents    = "{{ with secret \"secret/data/@SECRET_PATH@\" }}{{ range $k, $v := .Data.data }}{{ $v | writeToFile (printf \"@DIRECTORY@/%s\" $k) \"\" \"\" \"0644\" }}{{ end }}{{ end }}"
}
