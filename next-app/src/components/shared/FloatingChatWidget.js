"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Users, Circle, MoreHorizontal, Check, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/timeFormat";
import { toast } from "sonner";

export default function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [activeStaff, setActiveStaff] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showStaffList, setShowStaffList] = useState(false);
  const [activeRecipient, setActiveRecipient] = useState(null);
  const [chatTab, setChatTab] = useState("group"); // "group" or "private"
  const [privateFilter, setPrivateFilter] = useState("all"); // "all" or "unread"

  // Image Upload States
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Unsend & Edit states
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);
  const [showOriginalMessageIds, setShowOriginalMessageIds] = useState(new Set());

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    // 25MB limit (26214400 bytes)
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Image file size must be 25MB or less.");
      return;
    }

    setSelectedImage(file);
    setSelectedImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
      setSelectedImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (!file) continue;

        e.preventDefault();

        // 25MB limit (26214400 bytes)
        if (file.size > 25 * 1024 * 1024) {
          toast.error("Pasted image size must be 25MB or less.");
          return;
        }

        setSelectedImage(file);
        setSelectedImagePreview(URL.createObjectURL(file));
        break; // Process the first image in clipboard
      }
    }
  };

  // Clear image on tab/recipient switch
  useEffect(() => {
    handleRemoveImage();
  }, [chatTab, activeRecipient]);

  // Clean up URL object on unmount
  useEffect(() => {
    return () => {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  // Toggle display of original message
  const toggleOriginalMessage = (msgId) => {
    setShowOriginalMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const messagesEndRef = useRef(null);
  const lastCheckedRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuId(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Auto-resize textarea input height dynamically
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 96)}px`;
    }
  }, [inputValue, chatTab, activeRecipient]);

  // Fetch recent messages and active staff
  const fetchChatData = async (isInitial = false) => {
    try {
      let url = "/api/chat";
      const params = [];
      if (lastCheckedRef.current && !isInitial) {
        params.push(`since=${encodeURIComponent(lastCheckedRef.current)}`);
      }
      if (chatTab === "private" && activeRecipient) {
        params.push(`activeRecipientId=${encodeURIComponent(activeRecipient.id)}`);
      }
      if (params.length > 0) {
        url += "?" + params.join("&");
      }

      const res = await fetch(url);
      if (!res.ok) return;
      const json = await res.json();
      if (!json.ok) return;

      const { messages: newMsgs, activeStaff: active, currentUser: user } = json.data;
      
      if (user) setCurrentUser(user);
      if (active) setActiveStaff(active);

      if (newMsgs) {
        if (isInitial) {
          // On initial load (e.g. opening the widget or mounting), replace the messages list with full history
          setMessages(newMsgs);
          if (newMsgs.length > 0) {
            const lastMsg = newMsgs[newMsgs.length - 1];
            lastCheckedRef.current = lastMsg.created_at;
          } else {
            lastCheckedRef.current = null;
          }
          setTimeout(scrollToBottom, 100);
        } else if (newMsgs.length > 0) {
          // On polling updates, append only new messages
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const filteredNew = newMsgs.filter((m) => !existingIds.has(m.id));
            
            if (filteredNew.length === 0) return prev;

            // Increment unread count if widget is closed
            if (!isOpen) {
              setUnreadCount((c) => c + filteredNew.length);
            } else {
              setTimeout(scrollToBottom, 50);
            }

            const combined = [...prev, ...filteredNew];
            return combined.slice(-100);
          });

          const lastMsg = newMsgs[newMsgs.length - 1];
          lastCheckedRef.current = lastMsg.created_at;
        }
      }
    } catch (err) {
      console.error("Failed to fetch chat data:", err);
    }
  };

  // Send or Edit message handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (editingMessageId) {
      if (!inputValue.trim() || isLoading) return;
    } else {
      if ((!inputValue.trim() && !selectedImage) || isLoading) return;
    }

    const messageText = inputValue.trim();
    setIsLoading(true);

    if (editingMessageId) {
      try {
        const res = await fetch("/api/chat", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: editingMessageId, message: messageText }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.data) {
            setMessages((prev) =>
              prev.map((m) => (m.id === editingMessageId ? { ...m, ...json.data } : m))
            );
            setEditingMessageId(null);
            setInputValue("");
          }
        }
      } catch (err) {
        console.error("Failed to edit message:", err);
      } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return;
    }

    // Build FormData
    const formData = new FormData();
    if (messageText) {
      formData.append("message", messageText);
    }
    if (activeRecipient?.id) {
      formData.append("recipientId", activeRecipient.id);
    }
    if (selectedImage) {
      formData.append("image", selectedImage);
    }

    setInputValue("");
    handleRemoveImage();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data) {
          setMessages((prev) => [...prev, json.data]);
          lastCheckedRef.current = json.data.created_at;
          setTimeout(scrollToBottom, 50);
        } else if (json.error) {
          toast.error(json.error);
        }
      } else {
        const errJson = await res.json().catch(() => null);
        toast.error(errJson?.error || "Failed to send message");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("An error occurred while sending");
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Unsend message handler
  const handleUnsendMessage = async (messageId) => {
    try {
      const res = await fetch(`/api/chat?id=${messageId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          const targetMsg = messages.find((m) => m.id === messageId);
          const isSelf = currentUser && targetMsg && targetMsg.sender_id === currentUser.id;
          if (isSelf) {
            setMessages((prev) =>
              prev.map((m) => (m.id === messageId ? { ...m, is_deleted: 1, updated_at: new Date().toISOString() } : m))
            );
          } else {
            setMessages((prev) => prev.filter((m) => m.id !== messageId));
          }
        }
      }
    } catch (err) {
      console.error("Failed to unsend message:", err);
    }
  };

  // Setup initial fetch and polling
  useEffect(() => {
    fetchChatData(true);

    // Poll every 3 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchChatData(false);
    }, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, chatTab, activeRecipient]);

  // Update local messages to read when selecting a recipient
  useEffect(() => {
    if (activeRecipient) {
      setMessages((prev) =>
        prev.map((m) =>
          m.recipient_id === currentUser?.id && m.sender_id === activeRecipient.id
            ? { ...m, is_read: 1 }
            : m
        )
      );
    }
  }, [activeRecipient, currentUser]);

  // Scroll to bottom and focus input when opening the chat or switching tabs/recipients
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      
      // Scroll immediately
      scrollToBottom();
      
      // Scroll after microtask to ensure DOM is updated
      Promise.resolve().then(() => {
        scrollToBottom();
      });

      // Shorter timeout to catch final layout
      const timer = setTimeout(() => {
        scrollToBottom();
        inputRef.current?.focus();
      }, 10);

      return () => clearTimeout(timer);
    }
  }, [isOpen, chatTab, activeRecipient]);

  // Format message time
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Check if message is editable (within 5 minutes of sending)
  const canEditMessage = (msg) => {
    if (!msg || !msg.created_at || msg.image_filename) return false;
    try {
      let normalized = msg.created_at;
      if (!normalized.includes("T")) {
        normalized = normalized.replace(" ", "T");
      }
      const sentTime = new Date(normalized.endsWith("Z") ? normalized : normalized + "Z").getTime();
      const now = Date.now();
      return (now - sentTime) < 5 * 60 * 1000;
    } catch {
      return false;
    }
  };

  // Check if staff member was active recently (within 5 minutes)
  const isUserActive = (lastActiveString) => {
    if (!lastActiveString) return false;
    try {
      let normalized = lastActiveString;
      if (!normalized.includes("T")) {
        normalized = normalized.replace(" ", "T");
      }
      const lastActive = new Date(normalized.endsWith("Z") ? normalized : normalized + "Z");
      const diffMs = Math.abs(Date.now() - lastActive.getTime());
      
      const lastActiveLocal = new Date(normalized);
      const diffMsLocal = Math.abs(Date.now() - lastActiveLocal.getTime());
      
      const minDiff = Math.min(diffMs, diffMsLocal);
      return minDiff < 5 * 60 * 1000;
    } catch {
      return false;
    }
  };

  // Get human-readable inactive relative time status
  const getOfflineText = (lastActiveString) => {
    if (!lastActiveString) return "Inactive";
    const relObj = formatRelativeTime(lastActiveString);
    if (relObj && relObj.relative) {
      if (relObj.relative === "Active Now") return "Active now";
      return `Active ${relObj.relative}`;
    }
    if (relObj && relObj.date) {
      return `Active ${relObj.date}`;
    }
    return "Offline";
  };

  // Get the last private message exchanged with a staff member
  const getLastPrivateMessage = (staffId) => {
    const filtered = messages.filter(
      (m) =>
        (m.sender_id === currentUser?.id && m.recipient_id === staffId) ||
        (m.sender_id === staffId && m.recipient_id === currentUser?.id)
    );
    if (filtered.length === 0) return "No messages yet";
    const last = filtered[filtered.length - 1];
    let msgText = "";
    if (last.is_deleted) {
      msgText = last.sender_id === currentUser?.id ? "You unsent a message" : "Message unsent";
    } else {
      const isSentByMe = last.sender_id === currentUser?.id;
      msgText = isSentByMe ? `You: ${last.message}` : last.message;
    }
    if (msgText.length > 15) {
      return msgText.substring(0, 15) + "...";
    }
    return msgText;
  };

  // Check if the last message from a staff member is unread by the current user
  const isLastMessageUnread = (staffId) => {
    const filtered = messages.filter(
      (m) =>
        (m.sender_id === currentUser?.id && m.recipient_id === staffId) ||
        (m.sender_id === staffId && m.recipient_id === currentUser?.id)
    );
    if (filtered.length === 0) return false;
    const last = filtered[filtered.length - 1];
    return last.sender_id === staffId && last.is_read === 0 && !last.is_deleted;
  };

  // Handle typing to check for user mentions
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);

    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, selectionStart);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtSymbol + 1);
      if (!textAfterAt.includes(" ")) {
        setMentionQuery(textAfterAt);
        setMentionTriggerIndex(lastAtSymbol);
        return;
      }
    }
    setMentionQuery(null);
    setMentionTriggerIndex(-1);
  };

  // Insert autocompleted mention
  const insertMention = (staff) => {
    if (mentionTriggerIndex === -1) return;
    const before = inputValue.slice(0, mentionTriggerIndex);
    const after = inputValue.slice(inputRef.current?.selectionStart || mentionTriggerIndex);
    const mentionText = `@${staff.fname} ${staff.lname} `;
    setInputValue(before + mentionText + after);
    setMentionQuery(null);
    setMentionTriggerIndex(-1);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Handle key down in input box (Submit on Enter, newline on Shift+Enter)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Parse @name mentions dynamically using staff names
  const parseMentions = (text, isSelf = false) => {
    if (!text) return "";
    
    // Build a list of all possible mentionable full names
    const names = activeStaff.map(s => `${s.fname} ${s.lname}`);
    if (currentUser) {
      names.push(currentUser.name || `${currentUser.fname || ""} ${currentUser.lname || ""}`.trim());
    }
    
    // Sort names by length descending so that longer names match first
    const sortedNames = [...new Set(names)]
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
      
    if (sortedNames.length === 0) return text;
    
    // Build a regex matching @Name
    const escapedNames = sortedNames.map(n => n.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const pattern = new RegExp(`@(${escapedNames.join('|')})`, 'g');
    
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const matchIndex = match.index;
      const mentionName = match[1];
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }
      parts.push(
        <span 
          key={matchIndex} 
          className="font-bold"
        >
          @{mentionName}
        </span>
      );
      lastIndex = pattern.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    return parts.length > 0 ? parts : text;
  };

  // Filter messages for current view
  const displayedMessages = messages.filter((msg) => {
    if (chatTab === "group") {
      return !msg.recipient_id;
    } else {
      if (!activeRecipient) return false;
      return (
        (msg.sender_id === currentUser?.id && msg.recipient_id === activeRecipient.id) ||
        (msg.sender_id === activeRecipient.id && msg.recipient_id === currentUser?.id)
      );
    }
  });

  return (
    <div className="fixed bottom-0 right-6 z-50 flex flex-col items-end font-sans">
      <style>{`
        .chat-message-list::-webkit-scrollbar {
          width: 5px;
        }
        .chat-message-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-message-list::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 4px;
          transition: background 0.2s ease;
        }
        .chat-message-list:hover::-webkit-scrollbar-thumb {
          background: #C7C7CC;
        }
        .chat-message-list::-webkit-scrollbar-thumb:hover {
          background: #8E8E93;
        }
      `}</style>

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="mb-4 flex h-[480px] w-[350px] flex-col overflow-hidden rounded-[16px] border border-[#E5E5EA] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900">
          
          {/* Header */}
          <div className="flex items-center justify-between bg-white border-b border-[#E5E5EA] px-4 py-3 text-[#1C1C1E] dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {chatTab === "private" && activeRecipient ? (
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => setActiveRecipient(null)}
                    className="p-1 hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 rounded-full text-[#8E8E93] transition-colors"
                  >
                    <i className="ph-bold ph-caret-left text-sm"></i>
                  </button>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="relative h-6 w-6 rounded-full bg-[#0A84FF]/10 flex items-center justify-center text-[10px] font-bold text-[#0A84FF] overflow-hidden shrink-0">
                      {activeRecipient.avatar_filename ? (
                        <img 
                          src={`/api/account/avatar?id=${activeRecipient.id}&t=${activeRecipient.updated_at || Date.now()}`}
                          alt=""
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        `${activeRecipient.fname[0]}${activeRecipient.lname[0]}`
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold leading-tight text-[#1C1C1E] dark:text-zinc-100 truncate">
                        {activeRecipient.fname} {activeRecipient.lname}
                      </h3>
                      <p className="text-[9px] text-[#8E8E93] leading-none truncate">{activeRecipient.role} &middot; {activeRecipient.section}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-bold leading-tight text-[#1C1C1E] dark:text-zinc-100">
                    {chatTab === "group" ? "General Group Chat" : "Private Chats"}
                  </h3>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center h-8 w-8 rounded-full text-[#8E8E93] hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Subheader tabs */}
          <div className="flex bg-[#F5F5F7] dark:bg-zinc-950 p-2 shrink-0 gap-6 px-4">
            <button
              onClick={() => {
                setChatTab("group");
                setActiveRecipient(null);
              }}
              className={cn(
                "text-sm font-bold pb-1 transition-all cursor-pointer border-b-2",
                chatTab === "group"
                  ? "text-[#0A84FF] border-[#0A84FF]"
                  : "text-[#8E8E93] border-transparent hover:text-[#1C1C1E] dark:hover:text-zinc-300"
              )}
            >
              Group Chat
            </button>
            <button
              onClick={() => {
                setChatTab("private");
              }}
              className={cn(
                "text-sm font-bold pb-1 transition-all cursor-pointer border-b-2",
                chatTab === "private"
                  ? "text-[#0A84FF] border-[#0A84FF]"
                  : "text-[#8E8E93] border-transparent hover:text-[#1C1C1E] dark:hover:text-zinc-300"
              )}
            >
              Private Chats
            </button>
          </div>

          {/* Chat Window Content Body */}
          <div className="relative flex-1 overflow-hidden bg-[#F5F5F7] dark:bg-zinc-950 flex flex-col">
            {chatTab === "private" && !activeRecipient ? (
              /* Active Staff Selection View */
              <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 p-4 overflow-hidden">
                <div className="mb-3 pb-2 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setPrivateFilter("all")}
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-wider pb-1 transition-all cursor-pointer border-b-2",
                      privateFilter === "all"
                        ? "text-[#0A84FF] border-[#0A84FF]"
                        : "text-[#8E8E93] border-transparent hover:text-[#1C1C1E] dark:hover:text-zinc-300"
                    )}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrivateFilter("unread")}
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-wider pb-1 transition-all cursor-pointer border-b-2",
                      privateFilter === "unread"
                        ? "text-[#0A84FF] border-[#0A84FF]"
                        : "text-[#8E8E93] border-transparent hover:text-[#1C1C1E] dark:hover:text-zinc-300"
                    )}
                  >
                    Unread
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 chat-message-list">
                  {activeStaff.filter(s => privateFilter === "all" ? true : isLastMessageUnread(s.id)).length === 0 ? (
                    <p className="text-xs text-gray-400 italic">
                      {privateFilter === "unread" ? "No unread messages" : "No other registered staff accounts"}
                    </p>
                  ) : (
                    activeStaff
                      .filter(s => privateFilter === "all" ? true : isLastMessageUnread(s.id))
                      .map((staff) => (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => setActiveRecipient(staff)}
                        className="w-full flex items-center justify-between text-left py-1.5 px-2 rounded-lg hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative h-8 w-8 rounded-full bg-[#0A84FF]/10 flex items-center justify-center text-xs font-bold text-[#0A84FF] overflow-hidden">
                            {staff.avatar_filename ? (
                              <img 
                                src={`/api/account/avatar?id=${staff.id}&t=${staff.updated_at || Date.now()}`}
                                alt=""
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              `${staff.fname[0]}${staff.lname[0]}`
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-[#8E8E93] dark:text-zinc-400 leading-tight">
                              {staff.fname} {staff.lname}
                            </p>
                            <p className={cn(
                              "text-xs truncate max-w-[170px] leading-tight mt-0.5",
                              isLastMessageUnread(staff.id)
                                ? "font-semibold text-[#1C1C1E] dark:text-zinc-100"
                                : "font-normal text-[#8E8E93] dark:text-zinc-400"
                            )}>
                              {getLastPrivateMessage(staff.id)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isUserActive(staff.last_active) ? (
                            <span className="text-[9px] font-semibold text-green-600">Active</span>
                          ) : (
                            <span className="text-[9px] font-medium text-gray-400">
                              {getOfflineText(staff.last_active)}
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Message List & Input for either Group or Selected Private Recipient */
              <>
                <div className="flex-1 overflow-y-auto px-4 py-3 chat-message-list flex flex-col">
                  {displayedMessages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center px-4 py-10 my-auto">
                      <MessageSquare className="h-9 w-9 mb-1.5 text-[#C7C7CC]" />
                      <p className="text-sm font-bold text-[#1C1C1E] dark:text-zinc-100">
                        {chatTab === "group" ? "No messages yet" : "No messages with " + activeRecipient.fname}
                      </p>
                      <p className="text-[12px] text-[#8E8E93] max-w-[200px] mt-0.5 leading-normal">
                        {chatTab === "group" 
                          ? "Start the conversation with other staff members on the LAN!" 
                          : "Send a private message to start the conversation with " + activeRecipient.fname + "!"}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-auto flex flex-col w-full">
                      {displayedMessages.map((msg, idx) => {
                        const isSelf = currentUser && msg.sender_id === currentUser.id;
                        
                        // Check if consecutive from same user
                        const prevMsg = displayedMessages[idx - 1];
                        const nextMsg = displayedMessages[idx + 1];

                        const isPrevConsecutive = prevMsg && prevMsg.sender_id === msg.sender_id;
                        const isNextConsecutive = nextMsg && nextMsg.sender_id === msg.sender_id;

                        const showSenderName = !isSelf && !isPrevConsecutive;
                        const showTimestamp = !isNextConsecutive;
                        // Show avatar on the left only for incoming messages, positioned at the bottom bubble of a consecutive group
                        const showAvatar = !isSelf && !isNextConsecutive;

                        if (isSelf) {
                          return (
                            <div
                              key={msg.id}
                              className={cn(
                                "flex flex-col max-w-[85%] ml-auto items-end group/msg relative",
                                isNextConsecutive ? "mb-0.5" : "mb-4"
                              )}
                            >
                              <div className="relative max-w-full w-full">
                                {msg.is_edited === 1 && !msg.is_deleted && (
                                  <div className="flex justify-end mb-0.5">
                                    <button
                                      type="button"
                                      onClick={() => toggleOriginalMessage(msg.id)}
                                      className="text-[9px] font-bold text-[#8E8E93] hover:text-[#0A84FF] transition-colors cursor-pointer mr-2 select-none"
                                    >
                                      Edited
                                    </button>
                                  </div>
                                )}
                                {showOriginalMessageIds.has(msg.id) && msg.original_message && !msg.is_deleted && (
                                  <div className="text-[9px] text-[#8E8E93] italic bg-zinc-100 dark:bg-zinc-800 rounded-[14px] px-3 py-1 mb-1 border border-zinc-200 dark:border-zinc-700 text-right w-fit ml-auto break-words [word-break:break-word] select-all">
                                    {msg.original_message}
                                  </div>
                                )}

                                <div className="flex items-center gap-1.5 justify-end w-full group relative">
                                  {/* 3-Dot Options Button on the Left of Bubble */}
                                  {!msg.is_deleted && (
                                    <div className="relative">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.nativeEvent.stopImmediatePropagation();
                                          setActiveMenuId(activeMenuId === msg.id ? null : msg.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#E5E5EA] dark:hover:bg-zinc-800 rounded-full text-[#8E8E93] transition-all cursor-pointer"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </button>
                                      
                                      {activeMenuId === msg.id && (
                                        <div className="absolute left-0 bottom-6 z-20 w-24 bg-white border border-[#E5E5EA] shadow-lg rounded-lg py-1 text-xs dark:bg-zinc-800 dark:border-zinc-700">
                                          {canEditMessage(msg) && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                e.nativeEvent.stopImmediatePropagation();
                                                setEditingMessageId(msg.id);
                                                setInputValue(msg.message);
                                                setActiveMenuId(null);
                                                setTimeout(() => {
                                                  inputRef.current?.focus();
                                                }, 50);
                                              }}
                                              className="w-full text-left px-3 py-1.5 hover:bg-[#F5F5F7] dark:hover:bg-zinc-700 font-medium text-gray-700 dark:text-zinc-200"
                                            >
                                              Edit
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.nativeEvent.stopImmediatePropagation();
                                              handleUnsendMessage(msg.id);
                                              setActiveMenuId(null);
                                            }}
                                            className="w-full text-left px-3 py-1.5 hover:bg-[#F5F5F7] dark:hover:bg-zinc-700 font-semibold text-red-600 dark:text-red-400"
                                          >
                                            Unsend
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex flex-col items-end max-w-full gap-1.5">
                                    {msg.image_filename && !msg.is_deleted && (
                                      <div className="max-w-[200px] overflow-hidden rounded-[18px] border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                                        <img
                                          src={`/api/chat/image?filename=${encodeURIComponent(msg.image_filename)}`}
                                          alt="Sent image"
                                          className="w-full h-auto object-cover max-h-[160px] rounded-[18px] hover:opacity-95 transition-opacity"
                                          onClick={() => window.open(`/api/chat/image?filename=${encodeURIComponent(msg.image_filename)}`, "_blank")}
                                        />
                                      </div>
                                    )}
                                    {!!(msg.message || msg.is_deleted) && (
                                      <div 
                                        title={`Sent: ${formatTime(msg.created_at)}${msg.is_deleted ? ` (Deleted: ${formatTime(msg.updated_at || msg.created_at)})` : msg.is_edited && msg.updated_at ? ` (Edited: ${formatTime(msg.updated_at)})` : ""}`}
                                        className={cn(
                                          "rounded-[18px] px-3.5 py-2 text-xs break-words [word-break:break-word] w-fit leading-normal",
                                          msg.is_deleted
                                            ? "bg-zinc-100 border border-zinc-200 text-zinc-400 italic dark:bg-zinc-850 dark:border-zinc-800 dark:text-zinc-500"
                                            : msg.is_edited
                                              ? "bg-[#34C759] text-white"
                                              : "bg-[#0A84FF] text-white",
                                          editingMessageId === msg.id && "opacity-75 ring-2 ring-blue-300"
                                        )}
                                      >
                                        {msg.is_deleted ? "You deleted a message" : parseMentions(msg.message, true)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={msg.id}
                            className={cn(
                              "flex flex-col max-w-[85%] mr-auto group/msg relative",
                              isNextConsecutive ? "mb-0.5" : "mb-4"
                            )}
                          >
                            {/* Sender Name */}
                            {showSenderName && (
                              <span className="mb-0.5 text-[9px] font-bold text-[#8E8E93] dark:text-zinc-400 ml-13">
                                {msg.sender_fname}
                              </span>
                            )}

                            {/* Avatar and Bubble Row */}
                            <div className="flex items-end gap-2">
                              {/* Left Aligned Avatar */}
                              {showAvatar ? (
                                <div className="h-7 w-7 rounded-full bg-[#0A84FF]/10 text-[#0A84FF] font-bold text-[9px] flex items-center justify-center shrink-0 uppercase overflow-hidden">
                                  {msg.sender_avatar ? (
                                    <img 
                                      src={`/api/account/avatar?id=${msg.sender_id}&t=${msg.sender_updated_at || ""}`}
                                      alt=""
                                      className="w-full h-full object-cover rounded-full"
                                    />
                                  ) : (
                                    `${msg.sender_fname?.[0] || ""}${msg.sender_lname?.[0] || ""}`
                                  )}
                                </div>
                              ) : (
                                <div className="w-7 h-7 shrink-0" />
                              )}

                              <div className="relative flex-1 min-w-0">
                                {msg.is_edited === 1 && !msg.is_deleted && (
                                  <div className="flex justify-start mb-0.5 ml-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleOriginalMessage(msg.id)}
                                      className="text-[9px] font-bold text-[#8E8E93] hover:text-[#0A84FF] transition-colors cursor-pointer select-none"
                                    >
                                      Edited
                                    </button>
                                  </div>
                                )}
                                {showOriginalMessageIds.has(msg.id) && msg.original_message && !msg.is_deleted && (
                                  <div className="text-[9px] text-[#8E8E93] italic bg-zinc-100 dark:bg-zinc-800 rounded-[14px] px-3 py-1 mb-1 border border-zinc-200 dark:border-zinc-700 text-left w-fit mr-auto break-words [word-break:break-word] select-all">
                                    {msg.original_message}
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-1.5 w-full relative group">
                                  {/* Message Bubble (Pillbox Shape) */}
                                  <div className="flex flex-col items-start max-w-full gap-1.5">
                                    {msg.image_filename && !msg.is_deleted && (
                                      <div className="max-w-[200px] overflow-hidden rounded-[18px] border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                                        <img
                                          src={`/api/chat/image?filename=${encodeURIComponent(msg.image_filename)}`}
                                          alt="Sent image"
                                          className="w-full h-auto object-cover max-h-[160px] rounded-[18px] hover:opacity-95 transition-opacity"
                                          onClick={() => window.open(`/api/chat/image?filename=${encodeURIComponent(msg.image_filename)}`, "_blank")}
                                        />
                                      </div>
                                    )}
                                    {!!(msg.message || msg.is_deleted) && (
                                      <div 
                                        title={`Sent: ${formatTime(msg.created_at)}${msg.is_deleted ? ` (Deleted: ${formatTime(msg.updated_at || msg.created_at)})` : msg.is_edited && msg.updated_at ? ` (Edited: ${formatTime(msg.updated_at)})` : ""}`}
                                        className={cn(
                                          "rounded-[18px] px-3.5 py-2 text-xs break-words [word-break:break-word] w-fit leading-normal",
                                          msg.is_deleted
                                            ? "bg-zinc-100 border border-zinc-200 text-zinc-400 italic dark:bg-zinc-850 dark:border-zinc-800 dark:text-zinc-500"
                                            : "bg-white border border-[#E5E5EA] text-[#1C1C1E] dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                                        )}
                                      >
                                        {msg.is_deleted ? `${msg.sender_fname} deleted a message` : parseMentions(msg.message, false)}
                                      </div>
                                    )}
                                  </div>

                                  {/* 3-Dot Options Button on the Right of Bubble */}
                                  {!msg.is_deleted && (
                                    <div className="relative shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.nativeEvent.stopImmediatePropagation();
                                          setActiveMenuId(activeMenuId === msg.id ? null : msg.id);
                                        }}
                                        className="opacity-0 group-hover/msg:opacity-100 p-1 hover:bg-[#E5E5EA] dark:hover:bg-zinc-800 rounded-full text-[#8E8E93] transition-all cursor-pointer"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </button>
                                      
                                      {activeMenuId === msg.id && (
                                        <div className="absolute right-0 bottom-6 z-20 w-24 bg-white border border-[#E5E5EA] shadow-lg rounded-lg py-1 text-xs dark:bg-zinc-800 dark:border-zinc-700">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.nativeEvent.stopImmediatePropagation();
                                              handleUnsendMessage(msg.id);
                                              setActiveMenuId(null);
                                            }}
                                            className="w-full text-left px-3 py-1.5 hover:bg-[#F5F5F7] dark:hover:bg-zinc-700 font-semibold text-red-600 dark:text-red-400"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </>
            )}
          </div>

          {/* Footer Input Bar */}
          {(chatTab === "group" || activeRecipient) && (
            <div className="border-t border-[#E5E5EA] bg-white dark:bg-zinc-900 dark:border-zinc-800 shrink-0 relative">
              {/* Mentions Dropdown Suggestion List */}
              {mentionQuery !== null && activeStaff.filter(s => `${s.fname} ${s.lname}`.toLowerCase().includes(mentionQuery.toLowerCase())).length > 0 && (
                <div className="absolute bottom-full left-2 right-2 mb-2 z-55 max-h-40 overflow-y-auto bg-white border border-[#E5E5EA] dark:bg-zinc-850 dark:border-zinc-700 rounded-lg shadow-lg p-1 text-xs">
                  {activeStaff
                    .filter(s => `${s.fname} ${s.lname}`.toLowerCase().includes(mentionQuery.toLowerCase()))
                    .map((staff) => (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => insertMention(staff)}
                        className="w-full flex items-center gap-2 p-1.5 hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 rounded-md text-left text-[#1C1C1E] dark:text-zinc-200 cursor-pointer"
                      >
                        <div className="h-5 w-5 rounded-full bg-[#0A84FF]/10 flex items-center justify-center text-[8px] font-bold text-[#0A84FF]">
                          {staff.fname[0]}{staff.lname[0]}
                        </div>
                        <span>{staff.fname} {staff.lname}</span>
                      </button>
                    ))}
                </div>
              )}
              {editingMessageId && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50 dark:bg-zinc-800 text-[10px] text-amber-800 dark:text-amber-200 border-b border-[#E5E5EA] dark:border-zinc-700">
                  <span className="flex items-center gap-1 font-semibold">
                    Edit Message
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMessageId(null);
                      setInputValue("");
                    }}
                    className="text-amber-600 hover:text-amber-800 dark:text-amber-455 dark:hover:text-amber-300 font-bold hover:underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {selectedImagePreview && (
                <div className="flex items-center justify-between px-3 py-2 bg-[#F5F5F7] dark:bg-zinc-805 border-b border-[#E5E5EA] dark:border-zinc-750">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative h-10 w-10 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0">
                      <img src={selectedImagePreview} alt="Selected preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 text-[10px]">
                      <p className="font-semibold text-gray-700 dark:text-zinc-200 truncate max-w-[180px]">
                        {selectedImage?.name}
                      </p>
                      <p className="text-gray-400">
                        {selectedImage ? (selectedImage.size / 1024 / 1024).toFixed(2) : 0} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="p-2 flex gap-1.5 items-end">
                {!editingMessageId && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 w-8 rounded-full flex items-center justify-center text-[#8E8E93] hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </>
                )}
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={editingMessageId ? "Edit your message..." : "Aa"}
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 rounded-[10px] border border-[#E5E5EA] px-3 py-1.5 text-xs bg-white focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 resize-none max-h-24 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || (!inputValue.trim() && !selectedImage)}
                  className="h-8 w-8 rounded-full bg-[#0A84FF] text-[#FFFFFF] hover:bg-[#0070E0] transition-colors shrink-0 flex items-center justify-center shadow-xs"
                >
                  {editingMessageId ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Wide Chat Tab Bar */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between h-10 w-[350px] px-4 rounded-t-lg bg-white border border-[#E5E5EA] border-b-0 text-sm font-bold text-[#1C1C1E] hover:bg-[#F5F5F7] opacity-60 hover:opacity-100 transition-all focus:outline-none dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <span className="flex items-center gap-2 text-[#0A84FF]">
            <MessageSquare className="h-4 w-4" />
            Chat
          </span>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-500 px-1.5 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
