import { useState, useEffect, useCallback } from "react";
import { getMessages, sendMessage, markAsRead } from "../../api/consultationApi";

export default function LiveChat({ appointmentId, token, currentUserId, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const msgs = await getMessages(appointmentId, token);
      setMessages(msgs);
      await markAsRead(appointmentId, token);
    } catch {
      // no messages yet
    }
  }, [appointmentId, token]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try {
      setSending(true);
      await sendMessage(appointmentId, { content: newMessage, messageType: "TEXT" }, token);
      setNewMessage("");
      fetchMessages();
    } catch (err) {
      alert("Failed to send: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col h-[400px] sm:h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-purple-600 to-primary-600">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h4 className="font-semibold text-white text-sm">Live Chat</h4>
        </div>
        {onBack && (
          <button onClick={onBack} className="text-white/80 hover:text-white text-sm font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender?.id === currentUserId ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.sender?.id === currentUserId
                  ? "bg-purple-600 text-white rounded-br-md"
                  : "bg-white text-gray-800 shadow-sm rounded-bl-md border border-gray-100"
              }`}>
                {msg.sender?.id !== currentUserId && (
                  <p className="text-xs font-semibold text-purple-600 mb-1">{msg.sender?.name || "Other"}</p>
                )}
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.sender?.id === currentUserId ? "text-purple-200" : "text-gray-400"}`}>
                  {msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3 bg-white flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
        />
        <button
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition flex items-center gap-1"
        >
          {sending ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
          Send
        </button>
      </div>
    </div>
  );
}
