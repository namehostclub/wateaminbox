import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import {
  Archive,
  ArrowLeft,
  Camera,
  Check,
  CheckCheck,
  Circle,
  Clock,
  FileText,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Pause,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  Play,
  RotateCcw,
  Send,
  Square,
  Trash2,
  User,
} from "lucide-react-native";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api, MessageItem } from "../../src/lib/api";
import { useAuthStore } from "../../src/stores/auth";

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id as string;
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useAuthStore();

  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };
  const [activeSound, setActiveSound] = useState<{
    id: string;
    sound: Audio.Sound;
    isPlaying: boolean;
  } | null>(null);

  // Fetch Conversation Details
  const { data: conversationData } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      const res = await api.getConversations({ limit: 1 });
      // In practice this gets conversation or we can pull from list cache
      const cached = queryClient
        .getQueryData<any>(["conversations", activeWorkspace?.id])
        ?.find((c: any) => c.id === conversationId);
      return cached || null;
    },
  });

  // Fetch Messages
  const {
    data: messagesData,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const res = await api.getMessages(conversationId, 100);
      return res.messages || [];
    },
    enabled: !!conversationId,
    refetchInterval: 5000, // Poll every 5s if WebSocket is idle
  });

  // Automatically trigger Reverse Read Sync on screen mount and focus
  useEffect(() => {
    if (!conversationId) return;

    api.markAsRead(conversationId).then(() => {
      // Invalidate queries so unread counters immediately update on mobile & web
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }).catch(() => {
      // Ignore background sync errors
    });
  }, [conversationId, queryClient]);

  const handleCallPress = () => {
    const rawNumber =
      (conversationData as any)?.phoneNumber ||
      ((conversationData as any)?.jid
        ? (conversationData as any).jid.split("@")[0].replace(/:\d+$/, "")
        : "");
    const cleanNumber = rawNumber ? rawNumber.replace(/[^0-9+]/g, "") : "";
    if (!cleanNumber) {
      Alert.alert(
        "No Phone Number",
        "This contact does not have a direct phone number available to call.",
      );
      return;
    }

    const digitsOnly = cleanNumber.replace(/\+/g, "");

    Alert.alert(
      `Call ${conversationData?.displayName || "Contact"}`,
      cleanNumber,
      [
        {
          text: "Call on WhatsApp",
          onPress: () => {
            Linking.openURL(`whatsapp://send?phone=${digitsOnly}`).catch(() => {
              Linking.openURL(`https://wa.me/${digitsOnly}`);
            });
          },
        },
        {
          text: "Dial Phone Number",
          onPress: () => {
            Linking.openURL(`tel:${cleanNumber}`);
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
    );
  };

  // Configure Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleText} numberOfLines={1}>
            {conversationData?.displayName || "Chat"}
          </Text>
          <Text style={styles.headerSubtext}>
            {conversationData?.status ? `Status: ${conversationData.status}` : "Active"}
          </Text>
        </View>
      ),
      headerRight: () => (
        <View style={styles.headerRightContainer}>
          {!(conversationData as any)?.isGroup && (
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleCallPress}
              accessibilityLabel="Call contact"
            >
              <Phone size={18} color="#00a884" />
            </TouchableOpacity>
          )}
          {conversationData?.status === "resolved" ? (
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => reopenMutation.mutate()}
            >
              <RotateCcw size={18} color="#00a884" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => resolveMutation.mutate()}
            >
              <Archive size={18} color="#8696a0" />
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [navigation, conversationData]);

  // Send Message Mutation
  const sendMutation = useMutation({
    mutationFn: async ({
      content,
      type,
      mediaUrl,
    }: {
      content: string;
      type?: string;
      mediaUrl?: string;
    }) => {
      return await api.sendMessage(conversationId, content, type || "text", mediaUrl);
    },
    onSuccess: () => {
      setInputText("");
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err: any) => {
      Alert.alert("Failed to send", err.message || "Message delivery failed");
    },
  });

  // Resolve / Reopen Mutations
  const resolveMutation = useMutation({
    mutationFn: async () => {
      await api.resolveConversation(conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
    },
  });

  const reopenMutation = useMutation({
    mutationFn: async () => {
      await api.reopenConversation(conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
    },
  });

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMutation.mutate({ content: inputText.trim(), type: "text" });
  };

  // Image Attachment Picker
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const filename = asset.fileName || "photo.jpg";
        const mimeType = asset.mimeType || "image/jpeg";

        // Upload media to server
        const uploaded = await api.uploadMedia(asset.uri, mimeType, filename);
        sendMutation.mutate({
          content: "Image",
          type: "image",
          mediaUrl: uploaded.mediaUrl,
        });
      }
    } catch (err: any) {
      Alert.alert("Attachment Error", err.message || "Failed to attach image");
    }
  };

  // Voice Note Recording
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Microphone access is needed for voice notes.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      durationTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      Alert.alert("Recording Error", err.message || "Failed to start recording");
    }
  };

  const cancelRecording = async () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      setRecording(null);
    } catch {
      // ignore
    }
  };

  const stopRecordingAndSend = async () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    setRecordingDuration(0);
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        // Upload audio file and send as audio message
        const uploaded = await api.uploadMedia(uri, "audio/m4a", "voice-note.m4a");
        sendMutation.mutate({
          content: "Voice note",
          type: "audio",
          mediaUrl: uploaded.mediaUrl,
        });
      }
    } catch (err: any) {
      Alert.alert("Voice Note Error", err.message || "Failed to send voice note");
    }
  };

  // Audio Playback
  const handleToggleAudio = async (msgId: string, audioUrl?: string) => {
    if (!audioUrl) return;

    if (activeSound?.id === msgId) {
      if (activeSound.isPlaying) {
        await activeSound.sound.pauseAsync();
        setActiveSound({ ...activeSound, isPlaying: false });
      } else {
        await activeSound.sound.playAsync();
        setActiveSound({ ...activeSound, isPlaying: true });
      }
      return;
    }

    if (activeSound) {
      await activeSound.sound.unloadAsync();
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: true },
      (status) => {
        if (status.isLoaded && status.didJustFinish) {
          setActiveSound(null);
        }
      },
    );

    setActiveSound({ id: msgId, sound, isPlaying: true });
  };

  useEffect(() => {
    return () => {
      if (activeSound) {
        activeSound.sound.unloadAsync();
      }
    };
  }, [activeSound]);

  const renderStatusTicks = (status: string) => {
    switch (status) {
      case "read":
        return <CheckCheck size={14} color="#53bdeb" style={styles.statusTick} />;
      case "delivered":
        return <CheckCheck size={14} color="#8696a0" style={styles.statusTick} />;
      case "sent":
        return <Check size={14} color="#8696a0" style={styles.statusTick} />;
      default:
        return <Clock size={12} color="#8696a0" style={styles.statusTick} />;
    }
  };

  const renderMessageBubble = ({ item }: { item: MessageItem }) => {
    const isMe = item.fromMe;
    const isImage = item.messageType === "image" && item.mediaUrl;
    const isAudio = item.messageType === "audio" && item.mediaUrl;

    const timeStr = new Date(item.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Handle System Call Events (Incoming / Missed WhatsApp Calls)
    const isCallEvent =
      item.content?.includes("📞") ||
      (item as any).metadata?.isSystemEvent ||
      Boolean((item as any).metadata?.callEvent);

    if (isCallEvent) {
      const isMissed =
        item.content?.toLowerCase().includes("missed") ||
        (item as any).metadata?.callEvent?.status === "missed";
      return (
        <View style={styles.systemCallEventRow}>
          <View style={styles.systemCallEventCard}>
            <View
              style={[
                styles.systemCallIconBox,
                isMissed
                  ? styles.systemCallIconMissed
                  : styles.systemCallIconIncoming,
              ]}
            >
              {isMissed ? (
                <PhoneMissed size={16} color="#ef4444" />
              ) : (
                <PhoneIncoming size={16} color="#10b981" />
              )}
            </View>
            <View style={styles.systemCallTextBox}>
              <Text style={styles.systemCallTitle}>
                {item.content || "WhatsApp Voice Call"}
              </Text>
              <Text style={styles.systemCallTime}>{timeStr}</Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.bubbleWrapper,
          isMe ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft,
        ]}
      >
        <View
          style={[
            styles.bubbleContainer,
            isMe ? styles.bubbleRight : styles.bubbleLeft,
          ]}
        >
          {/* Sender Name in Group */}
          {!isMe && item.senderName && (
            <Text style={styles.senderNameText}>{item.senderName}</Text>
          )}

          {/* Media: Image */}
          {isImage && (
            <Image
              source={{ uri: item.mediaUrl }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}

          {/* Media: Audio / Voice Note */}
          {isAudio && (
            <View style={styles.audioPlayerRow}>
              <TouchableOpacity
                style={styles.audioPlayButton}
                onPress={() => handleToggleAudio(item.id, item.mediaUrl)}
              >
                {activeSound?.id === item.id && activeSound.isPlaying ? (
                  <Pause size={18} color="#ffffff" />
                ) : (
                  <Play size={18} color="#ffffff" />
                )}
              </TouchableOpacity>
              <View style={styles.audioWaveform}>
                <View style={styles.audioBar} />
                <View style={[styles.audioBar, { height: 16 }]} />
                <View style={[styles.audioBar, { height: 24 }]} />
                <View style={[styles.audioBar, { height: 14 }]} />
                <View style={[styles.audioBar, { height: 20 }]} />
                <View style={[styles.audioBar, { height: 10 }]} />
              </View>
            </View>
          )}

          {/* Text Message */}
          {item.content && (!isImage || item.content !== "Image") && (
            <Text style={styles.messageText}>{item.content}</Text>
          )}

          {/* Timestamp & Status Meta */}
          <View style={styles.metaRow}>
            <Text style={styles.timestampText}>{timeStr}</Text>
            {isMe && renderStatusTicks(item.status)}
          </View>
        </View>
      </View>
    );
  };

  // Sort messages newest first for inverted FlatList
  const sortedMessages = [...(messagesData || [])].reverse();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      style={styles.container}
    >
      {/* Messages Timeline */}
      {messagesLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00a884" />
        </View>
      ) : (
        <FlatList
          data={sortedMessages}
          keyExtractor={(item) => item.id || item.messageId}
          renderItem={renderMessageBubble}
          inverted={true}
          contentContainerStyle={styles.timelineContent}
        />
      )}

      {/* Message Composer Bar */}
      {isRecording ? (
        <View style={styles.recordingBar}>
          <TouchableOpacity
            style={styles.trashRecordButton}
            onPress={cancelRecording}
            accessibilityLabel="Cancel recording"
          >
            <Trash2 size={20} color="#ef4444" />
          </TouchableOpacity>

          <View style={styles.recordingTimerBox}>
            <View style={styles.recordingPulsingDot} />
            <Text style={styles.recordingTimerText}>
              {formatDuration(recordingDuration)}
            </Text>
            <Text style={styles.recordingHintText}>Recording audio...</Text>
          </View>

          <TouchableOpacity
            style={styles.sendRecordButton}
            onPress={stopRecordingAndSend}
            accessibilityLabel="Send voice note"
          >
            <Send size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.composerBar}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handlePickImage}
          >
            <Paperclip size={22} color="#8696a0" />
          </TouchableOpacity>

          <TextInput
            style={styles.composerInput}
            placeholder="Type a message..."
            placeholderTextColor="#8696a0"
            value={inputText}
            onChangeText={setInputText}
            multiline={true}
            maxLength={4000}
          />

          {inputText.trim() ? (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSend}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Send size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.micButton}
              onPress={startRecording}
            >
              <Mic size={22} color="#8696a0" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b141a",
  },
  headerTitleContainer: {
    justifyContent: "center",
  },
  headerTitleText: {
    color: "#e9edef",
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtext: {
    color: "#8696a0",
    fontSize: 12,
  },
  headerRightContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerActionButton: {
    padding: 6,
    marginLeft: 8,
  },
  timelineContent: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  bubbleWrapper: {
    marginVertical: 4,
    flexDirection: "row",
  },
  bubbleWrapperRight: {
    justifyContent: "flex-end",
  },
  bubbleWrapperLeft: {
    justifyContent: "flex-start",
  },
  bubbleContainer: {
    maxWidth: "80%",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 80,
  },
  bubbleRight: {
    backgroundColor: "#005c4b",
    borderTopRightRadius: 2,
  },
  bubbleLeft: {
    backgroundColor: "#202c33",
    borderTopLeftRadius: 2,
  },
  senderNameText: {
    color: "#00a884",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  },
  messageText: {
    color: "#e9edef",
    fontSize: 15,
    lineHeight: 20,
  },
  messageImage: {
    width: 240,
    height: 180,
    borderRadius: 6,
    marginBottom: 6,
  },
  audioPlayerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  audioPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#00a884",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  audioWaveform: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
    gap: 4,
  },
  audioBar: {
    width: 3,
    height: 18,
    backgroundColor: "#8696a0",
    borderRadius: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 2,
  },
  timestampText: {
    color: "#8696a0",
    fontSize: 11,
  },
  statusTick: {
    marginLeft: 4,
  },
  composerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#1f2c34",
    borderTopWidth: 1,
    borderTopColor: "#222d34",
  },
  attachButton: {
    padding: 8,
  },
  composerInput: {
    flex: 1,
    backgroundColor: "#2a3942",
    borderRadius: 20,
    color: "#e9edef",
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    marginHorizontal: 6,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#00a884",
    justifyContent: "center",
    alignItems: "center",
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  micButtonRecording: {
    backgroundColor: "#ef4444",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  systemCallEventRow: {
    width: "100%",
    alignItems: "center",
    marginVertical: 8,
  },
  systemCallEventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#182229",
    borderWidth: 1,
    borderColor: "#222d34",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "85%",
  },
  systemCallIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  systemCallIconMissed: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  systemCallIconIncoming: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  systemCallTextBox: {
    flex: 1,
  },
  systemCallTitle: {
    color: "#e9edef",
    fontSize: 13,
    fontWeight: "600",
  },
  systemCallTime: {
    color: "#8696a0",
    fontSize: 11,
    marginTop: 2,
  },
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#1f2c34",
    borderTopWidth: 1,
    borderTopColor: "#222d34",
  },
  trashRecordButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  recordingTimerBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
    gap: 8,
  },
  recordingPulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
  },
  recordingTimerText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "bold",
  },
  recordingHintText: {
    color: "#8696a0",
    fontSize: 12,
  },
  sendRecordButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#00a884",
    justifyContent: "center",
    alignItems: "center",
  },
});

