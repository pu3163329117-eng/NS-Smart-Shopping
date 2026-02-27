/**
 * AI聊天组合式函数
 * 提取自AIChatWindow.vue的AI聊天逻辑
 */

import { ref, computed, watch } from 'vue';
import type { Message, Product, SystemPromptConfig } from '../types/chat.types';
import { callDeepseekAPI } from '../../../services/aiService';

/**
 * AI聊天状态管理
 */
export function useAIChat(products: Product[]) {
  // 状态
  const messages = ref<Message[]>([
    {
      id: 1,
      role: 'ai',
      content: '你好！我是 NS Smart Shopping 的 AI 智能导购。我可以为你推荐商品，或者解答关于我们学生公司的任何问题。请问有什么可以帮你的吗？',
      type: 'text'
    }
  ]);
  
  const inputMessage = ref('');
  const isTyping = ref(false);
  const isLoading = ref(false);

  /**
   * 生成系统提示
   */
  const generateSystemPrompt = (): string => {
    const productContext = products.map(p => 
      `- 商品名：${p.name}\n  价格：¥${p.price}\n  公司：${p.company}\n  描述：${p.desc}\n  详细介绍：${p.longDesc}`
    ).join('\n\n');

    return `你是一个名为"NS Smart Shopping 智能导购"的 AI 助手。你的任务是帮助用户了解和购买"学生模拟公司"平台上的商品。
  
以下是当前上架的商品列表：
${productContext}

请遵循以下规则：

1. 友好、热情、乐于助人，像一个真正的导购员
2. 根据用户的问题推荐合适的商品
3. 提供详细的产品信息和购买建议
4. 如果用户的问题与商品无关，可以友好地引导回购物话题
5. 使用简洁明了的中文回答
6. 可以适当使用表情符号增加亲和力 😊

当前对话历史：
${messages.value.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

请根据以上信息回答用户的问题。`;
  };

  /**
   * 发送消息给AI
   */
  const sendMessage = async (): Promise<void> => {
    const content = inputMessage.value.trim();
    if (!content || isTyping.value || isLoading.value) return;

    try {
      // 添加用户消息
      const userMessage: Message = {
        id: Date.now(),
        role: 'user',
        content,
        type: 'text'
      };
      messages.value.push(userMessage);
      inputMessage.value = '';
      isLoading.value = true;

      // 生成系统提示
      const systemPrompt = generateSystemPrompt();

      // 调用DeepSeek API
      isTyping.value = true;
      
      const aiResponse = await callDeepseekAPI([
        { role: 'system', content: systemPrompt },
        ...messages.value.slice(-10).map(msg => ({
          role: msg.role === 'ai' ? 'assistant' : 'user',
          content: msg.content
        }))
      ]);

      // 添加AI回复
      const aiMessage: Message = {
        id: Date.now() + 1,
        role: 'ai',
        content: aiResponse,
        type: 'text'
      };
      messages.value.push(aiMessage);

    } catch (error) {
      console.error('AI聊天错误:', error);
      
      // 添加错误消息
      const errorMessage: Message = {
        id: Date.now(),
        role: 'ai',
        content: '抱歉，我暂时无法处理你的请求。请稍后再试，或者联系客服人员。',
        type: 'text'
      };
      messages.value.push(errorMessage);
      
    } finally {
      isTyping.value = false;
      isLoading.value = false;
    }
  };

  /**
   * 快速回复建议
   */
  const quickReplies = computed(() => [
    '推荐一些适合学生的商品',
    '有什么优惠活动吗？',
    '如何成为创客？',
    '介绍一下你们的公司',
    '帮我找编程学习工具'
  ]);

  /**
   * 根据关键词推荐商品
   */
  const suggestProducts = (keyword: string): Product[] => {
    if (!keyword.trim()) return [];
    
    const lowerKeyword = keyword.toLowerCase();
    return products.filter(product => 
      product.name.toLowerCase().includes(lowerKeyword) ||
      product.desc.toLowerCase().includes(lowerKeyword) ||
      product.longDesc.toLowerCase().includes(lowerKeyword) ||
      product.category?.toLowerCase().includes(lowerKeyword)
    ).slice(0, 3); // 最多推荐3个
  };

  /**
   * 格式化产品推荐消息
   */
  const formatProductRecommendation = (product: Product): string => {
    return `🎯 **${product.name}**\n💰 价格: ¥${product.price}\n🏢 公司: ${product.company}\n📝 描述: ${product.desc}\n\n${product.longDesc}\n\n👉 点击查看详情或购买`;
  };

  /**
   * 清空聊天记录
   */
  const clearChat = (): void => {
    messages.value = [
      {
        id: Date.now(),
        role: 'ai',
        content: '聊天记录已清空！我可以为你推荐商品，或者解答关于我们学生公司的任何问题。请问有什么可以帮你的吗？',
        type: 'text'
      }
    ];
  };

  /**
   * 复制消息内容
   */
  const copyMessage = async (content: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(content);
      // 这里可以添加复制成功的提示
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  /**
   * 分享消息
   */
  const shareMessage = async (content: string): Promise<void> => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'NS Smart Shopping AI推荐',
          text: content,
          url: window.location.href
        });
      } catch (error) {
        console.error('分享失败:', error);
      }
    } else {
      // 备用方案：复制到剪贴板
      await copyMessage(content);
    }
  };

  // 计算属性
  const canSendMessage = computed(() => {
    return inputMessage.value.trim().length > 0 && !isTyping.value && !isLoading.value;
  });

  const lastMessage = computed(() => {
    return messages.value[messages.value.length - 1];
  });

  const messageCount = computed(() => messages.value.length);

  // 监听输入变化，提供实时建议
  watch(inputMessage, (newValue) => {
    if (newValue.trim().length > 2) {
      // 可以在这里添加实时建议逻辑
      console.log('输入变化:', newValue);
    }
  });

  return {
    // 状态
    messages,
    inputMessage,
    isTyping,
    isLoading,
    
    // 计算属性
    quickReplies,
    canSendMessage,
    lastMessage,
    messageCount,
    
    // 方法
    sendMessage,
    suggestProducts,
    formatProductRecommendation,
    clearChat,
    copyMessage,
    shareMessage,
    generateSystemPrompt
  };
}

/**
 * AI聊天配置管理
 */
export function useAIChatConfig() {
  const config = ref({
    temperature: 0.7,
    maxTokens: 1000,
    model: 'deepseek-chat',
    enableProductSuggestions: true,
    enableQuickReplies: true,
    saveChatHistory: true,
    autoScroll: true
  });

  const updateConfig = (updates: Partial<typeof config.value>) => {
    config.value = { ...config.value, ...updates };
  };

  const resetConfig = () => {
    config.value = {
      temperature: 0.7,
      maxTokens: 1000,
      model: 'deepseek-chat',
      enableProductSuggestions: true,
      enableQuickReplies: true,
      saveChatHistory: true,
      autoScroll: true
    };
  };

  return {
    config,
    updateConfig,
    resetConfig
  };
}