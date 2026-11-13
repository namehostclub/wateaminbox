package handler

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	natsClient "github.com/ygncode-lab/whatsapp-web/services/whatsapp/internal/nats"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
)

func TestHandleCallOffer(t *testing.T) {
	var publishedEvents []natsClient.MessageEvent
	h := &Handler{
		config: Config{
			CompanyID:    "test-company",
			ConnectionID: "test-connection",
		},
		publishMessage: func(evt natsClient.MessageEvent) error {
			publishedEvents = append(publishedEvents, evt)
			return nil
		},
	}

	callerJID := types.NewJID("15551234567", types.DefaultUserServer)
	now := time.Now()

	offer := &events.CallOffer{
		BasicCallMeta: types.BasicCallMeta{
			From:        callerJID,
			Timestamp:   now,
			CallCreator: callerJID,
			CallID:      "test-call-id-123",
		},
	}

	h.handleCallOffer(offer)

	require.Len(t, publishedEvents, 1)
	evt := publishedEvents[0]
	assert.Equal(t, "call_test-call-id-123", evt.MessageID)
	assert.Equal(t, callerJID.String(), evt.From)
	assert.True(t, evt.IsSystemEvent)
	require.NotNil(t, evt.CallEvent)
	assert.Equal(t, "test-call-id-123", evt.CallEvent.CallID)
	assert.Equal(t, "incoming", evt.CallEvent.Status)
	assert.Contains(t, evt.Content, "Incoming WhatsApp")
}

func TestHandleCallTerminate(t *testing.T) {
	var publishedEvents []natsClient.MessageEvent
	h := &Handler{
		config: Config{
			CompanyID:    "test-company",
			ConnectionID: "test-connection",
		},
		publishMessage: func(evt natsClient.MessageEvent) error {
			publishedEvents = append(publishedEvents, evt)
			return nil
		},
	}

	callerJID := types.NewJID("15551234567", types.DefaultUserServer)
	now := time.Now()

	term := &events.CallTerminate{
		BasicCallMeta: types.BasicCallMeta{
			From:        callerJID,
			Timestamp:   now,
			CallCreator: callerJID,
			CallID:      "test-call-id-123",
		},
		Reason: "timeout",
	}

	h.handleCallTerminate(term)

	require.Len(t, publishedEvents, 1)
	evt := publishedEvents[0]
	assert.Equal(t, "call_term_test-call-id-123", evt.MessageID)
	assert.Equal(t, callerJID.String(), evt.From)
	assert.True(t, evt.IsSystemEvent)
	require.NotNil(t, evt.CallEvent)
	assert.Equal(t, "test-call-id-123", evt.CallEvent.CallID)
	assert.Equal(t, "missed", evt.CallEvent.Status)
	assert.Equal(t, "timeout", evt.CallEvent.Reason)
	assert.Contains(t, evt.Content, "Missed WhatsApp")
}

