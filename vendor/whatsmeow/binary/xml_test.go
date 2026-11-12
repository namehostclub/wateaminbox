package binary

import (
	"strings"
	"testing"
)

func TestStringRedactsBusinessCredentials(t *testing.T) {
	node := Node{
		Tag: "iq",
		Content: []Node{
			{Tag: "access_token", Content: []byte("secret-token")},
			{Tag: "session_cookies", Content: []byte("secret-cookie")},
			{Tag: "recovery_nonce", Attrs: Attrs{"code": "secret-nonce"}},
		},
	}

	output := node.String()
	for _, secret := range []string{"secret-token", "secret-cookie", "secret-nonce"} {
		if strings.Contains(output, secret) {
			t.Fatalf("node string contains sensitive value %q: %s", secret, output)
		}
	}
	if got := strings.Count(output, "[REDACTED]"); got != 3 {
		t.Fatalf("expected three redactions, got %d: %s", got, output)
	}
}
