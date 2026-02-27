/**
 * AIChatWindow 类型定义
 * 遵循反重力编码规范 - No Shit Code
 */

// 消息类型
export type MessageRole = 'ai' | 'user' | 'system';
export type MessageType = 'text' | 'image' | 'product' | 'system';

export interface Message {
  id: number;
  role: MessageRole;
  content: string;
  type: MessageType;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

// 社交消息类型
export type SocialMessageStatus = 'sent' | 'delivered' | 'read';

export interface SocialMessage {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  timestamp: Date;
  status: SocialMessageStatus;
  isMine?: boolean;
}

// 好友类型
export interface Friend {
  id: number;
  name: string;
  avatar?: string;
  online: boolean;
  lastSeen?: Date;
  unreadCount: number;
}

// 聊天标签类型
export type ChatTab = 'ai' | 'social' | 'friends';

// AI聊天状态
export interface AIChatState {
  activeTab: ChatTab;
  activeFriendId: number | null;
  isTyping: boolean;
  messages: Message[];
  inputMessage: string;
}

// 社交聊天状态
export interface SocialChatState {
  friends: Friend[];
  activeFriendId: number | null;
  messages: SocialMessage[];
  unreadTotal: number;
}

// 产品信息（用于AI推荐）
export interface Product {
  id: number;
  name: string;
  price: number;
  company: string;
  desc: string;
  longDesc: string;
  image?: string;
  category?: string;
}

// AI系统提示配置
export interface SystemPromptConfig {
  products: Product[];
  userContext?: string;
  chatHistory?: Message[];
  temperature?: number;
  maxTokens?: number;
}

// 聊天UI状态
export interface ChatUIState {
  isExpanded: boolean;
  showShareMenu: boolean;
  showEmojiPicker: boolean;
  showProductSuggestions: boolean;
  scrollPosition: number;
}

// 事件类型
export interface ChatEvents {
  'send-message': (content: string) => void;
  'switch-tab': (tab: ChatTab) => void;
  'select-friend': (friendId: number) => void;
  'toggle-expand': () => void;
  'close': () => void;
  'share': (messageId: number) => void;
  'copy': (content: string) => void;
}

// Props类型
export interface AIChatWindowProps {
  isOpen: boolean;
  initialTab?: ChatTab;
  initialFriendId?: number;
  autoExpand?: boolean;
}

// 计算属性类型
export interface ChatComputed {
  currentPrivateMessages: SocialMessage[];
  activeFriend: Friend | null;
  hasUnreadMessages: boolean;
  shouldShowTypingIndicator: boolean;
  canSendMessage: boolean;
}

// 工具函数类型
export type MessageFormatter = (message: Message | SocialMessage) => string;
export type TimestampFormatter = (date: Date) => string;
export type ProductFilter = (products: Product[], query: string) => Product[];