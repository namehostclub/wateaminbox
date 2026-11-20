package handler

import (
	"fmt"
	"log"
	"time"

	sharednats "github.com/ygncode-lab/whatsapp-web/services/shared/nats"
	natsClient "github.com/ygncode-lab/whatsapp-web/services/whatsapp/internal/nats"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
)

// resolveCallJIDs canonicalizes caller and chat JIDs. WhatsApp frequently sends
// calls using the caller's internal LID. Resolving the LID to the canonical phone
// number JID prevents calls from being partitioned into separate "WhatsApp user (ID ...)" contacts.
func (h *Handler) resolveCallJIDs(meta *types.BasicCallMeta) (types.JID, types.JID, bool, string) {
	primaryCaller := meta.From
	if !meta.CallCreator.IsEmpty() {
		primaryCaller = meta.CallCreator
	}
	callerJID := h.resolvePreferredJID(primaryCaller, meta.CallCreatorAlt)
	chatJID := callerJID
	isGroup := false
	groupID := ""

	if !meta.GroupJID.IsEmpty() {
		isGroup = true
		chatJID = meta.GroupJID.ToNonAD()
		groupID = chatJID.String()
	}

	return callerJID, chatJID, isGroup, groupID
}

// handleCallOffer handles incoming call offer events from WhatsApp.
func (h *Handler) handleCallOffer(evt *events.CallOffer) {
	if evt == nil {
		return
	}
	callerJID, chatJID, isGroup, groupID := h.resolveCallJIDs(&evt.BasicCallMeta)

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

// handleCallAccept handles call acceptance events when a call is answered/picked up on WhatsApp.
func (h *Handler) handleCallAccept(evt *events.CallAccept) {
	if evt == nil {
		return
	}
	callerJID, chatJID, isGroup, groupID := h.resolveCallJIDs(&evt.BasicCallMeta)

	log.Printf("WhatsApp call accepted by our account from %s (CallID: %s)", callerJID.String(), evt.CallID)

	h.answeredCalls.Store(evt.CallID, true)

	callEvent := &sharednats.CallEventPayload{
		CallID:    evt.CallID,
		Status:    "answered",
		Timestamp: evt.Timestamp.Format(time.RFC3339),
		IsVideo:   false,
	}

	msgEvent := natsClient.MessageEvent{
		MessageID:     fmt.Sprintf("call_%s", evt.CallID),
		From:          callerJID.String(),
		To:            chatJID.String(),
		FromMe:        false,
		Type:          "text",
		Status:        "read",
		Content:       "📞 Answered WhatsApp voice call",
		Timestamp:     evt.Timestamp,
		IsGroup:       isGroup,
		GroupID:       groupID,
		IsSystemEvent: true,
		CallEvent:     callEvent,
	}

	if h.publishMessage != nil {
		if err := h.publishMessage(msgEvent); err != nil {
			log.Printf("Failed to publish call accept event: %v", err)
		}
	}
}

// handleCallTerminate handles call termination events (missed, canceled, ended).
func (h *Handler) handleCallTerminate(evt *events.CallTerminate) {
	if evt == nil {
		return
	}
	callerJID, chatJID, isGroup, groupID := h.resolveCallJIDs(&evt.BasicCallMeta)

	wasAnswered := false
	if _, ok := h.answeredCalls.LoadAndDelete(evt.CallID); ok {
		wasAnswered = true
	}

	status := "missed"
	content := "📞 Missed WhatsApp voice call"
	msgStatus := "delivered"

	if wasAnswered {
		status = "answered"
		content = "📞 Answered WhatsApp voice call"
		msgStatus = "read"
	}

	reason := evt.Reason
	if reason == "" {
		if wasAnswered {
			reason = "completed"
		} else {
			reason = "missed"
		}
	}

	log.Printf("WhatsApp call terminated from %s (CallID: %s, Reason: %s, WasAnswered: %v)", callerJID.String(), evt.CallID, reason, wasAnswered)

	callEvent := &sharednats.CallEventPayload{
		CallID:    evt.CallID,
		Status:    status,
		Reason:    reason,
		Timestamp: evt.Timestamp.Format(time.RFC3339),
	}

	// Use unified message ID call_<CallID> so the backend updates the call record in-place
	// instead of creating duplicate stacked messages for the same call lifecycle.
	msgEvent := natsClient.MessageEvent{
		MessageID:     fmt.Sprintf("call_%s", evt.CallID),
		From:          callerJID.String(),
		To:            chatJID.String(),
		FromMe:        false,
		Type:          "text",
		Status:        msgStatus,
		Content:       content,
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
	callerJID, chatJID, isGroup, groupID := h.resolveCallJIDs(&evt.BasicCallMeta)

	h.answeredCalls.Delete(evt.CallID)

	log.Printf("WhatsApp call rejected from %s (CallID: %s)", callerJID.String(), evt.CallID)

	callEvent := &sharednats.CallEventPayload{
		CallID:    evt.CallID,
		Status:    "declined",
		Reason:    "rejected",
		Timestamp: evt.Timestamp.Format(time.RFC3339),
	}

	msgEvent := natsClient.MessageEvent{
		MessageID:     fmt.Sprintf("call_%s", evt.CallID),
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
