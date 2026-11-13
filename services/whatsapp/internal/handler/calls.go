package handler

import (
	"fmt"
	"log"
	"time"

	sharednats "github.com/ygncode-lab/whatsapp-web/services/shared/nats"
	natsClient "github.com/ygncode-lab/whatsapp-web/services/whatsapp/internal/nats"
	"go.mau.fi/whatsmeow/types/events"
)

// handleCallOffer handles incoming call offer events from WhatsApp.
func (h *Handler) handleCallOffer(evt *events.CallOffer) {
	if evt == nil {
		return
	}
	callerJID := evt.From.ToNonAD()
	chatJID := callerJID
	isGroup := false
	groupID := ""

	if !evt.GroupJID.IsEmpty() {
		isGroup = true
		chatJID = evt.GroupJID.ToNonAD()
		groupID = chatJID.String()
	}

	log.Printf("Incoming WhatsApp call offer from %s (CallID: %s)", callerJID.String(), evt.CallID)

	callEvent := &sharednats.CallEventPayload{
		CallID:    evt.CallID,
		Status:    "incoming",
		Timestamp: evt.Timestamp.Format(time.RFC3339),
		IsVideo:   false,
	}

	msgEvent := natsClient.MessageEvent{
		MessageID:     fmt.Sprintf("call_%s", evt.CallID),
		From:          callerJID.String(),
		To:            chatJID.String(),
		FromMe:        false,
		Type:          "text",
		Status:        "delivered",
		Content:       "📞 Incoming WhatsApp voice call",
		Timestamp:     evt.Timestamp,
		IsGroup:       isGroup,
		GroupID:       groupID,
		IsSystemEvent: true,
		CallEvent:     callEvent,
	}

	if h.publishMessage != nil {
		if err := h.publishMessage(msgEvent); err != nil {
			log.Printf("Failed to publish incoming call offer event: %v", err)
		}
	}
}

// handleCallTerminate handles call termination events (missed, canceled, ended).
func (h *Handler) handleCallTerminate(evt *events.CallTerminate) {
	if evt == nil {
		return
	}
	callerJID := evt.From.ToNonAD()
	chatJID := callerJID
	isGroup := false
	groupID := ""

	if !evt.GroupJID.IsEmpty() {
		isGroup = true
		chatJID = evt.GroupJID.ToNonAD()
		groupID = chatJID.String()
	}

	reason := evt.Reason
	if reason == "" {
		reason = "missed"
	}

	log.Printf("WhatsApp call terminated from %s (CallID: %s, Reason: %s)", callerJID.String(), evt.CallID, reason)

	callEvent := &sharednats.CallEventPayload{
		CallID:    evt.CallID,
		Status:    "missed",
		Reason:    reason,
		Timestamp: evt.Timestamp.Format(time.RFC3339),
	}

	msgEvent := natsClient.MessageEvent{
		MessageID:     fmt.Sprintf("call_term_%s", evt.CallID),
		From:          callerJID.String(),
		To:            chatJID.String(),
		FromMe:        false,
		Type:          "text",
		Status:        "delivered",
		Content:       "📞 Missed WhatsApp voice call",
		Timestamp:     evt.Timestamp,
		IsGroup:       isGroup,
		GroupID:       groupID,
		IsSystemEvent: true,
		CallEvent:     callEvent,
	}

	if h.publishMessage != nil {
		if err := h.publishMessage(msgEvent); err != nil {
			log.Printf("Failed to publish call terminate event: %v", err)
		}
	}
}

// handleCallReject handles call rejection events.
func (h *Handler) handleCallReject(evt *events.CallReject) {
	if evt == nil {
		return
	}
	callerJID := evt.From.ToNonAD()
	chatJID := callerJID
	isGroup := false
	groupID := ""

	if !evt.GroupJID.IsEmpty() {
		isGroup = true
		chatJID = evt.GroupJID.ToNonAD()
		groupID = chatJID.String()
	}

	log.Printf("WhatsApp call rejected from %s (CallID: %s)", callerJID.String(), evt.CallID)

	callEvent := &sharednats.CallEventPayload{
		CallID:    evt.CallID,
		Status:    "declined",
		Reason:    "rejected",
		Timestamp: evt.Timestamp.Format(time.RFC3339),
	}

	msgEvent := natsClient.MessageEvent{
		MessageID:     fmt.Sprintf("call_decl_%s", evt.CallID),
		From:          callerJID.String(),
		To:            chatJID.String(),
		FromMe:        false,
		Type:          "text",
		Status:        "delivered",
		Content:       "📞 Declined WhatsApp voice call",
		Timestamp:     evt.Timestamp,
		IsGroup:       isGroup,
		GroupID:       groupID,
		IsSystemEvent: true,
		CallEvent:     callEvent,
	}

	if h.publishMessage != nil {
		if err := h.publishMessage(msgEvent); err != nil {
			log.Printf("Failed to publish call reject event: %v", err)
		}
	}
}

