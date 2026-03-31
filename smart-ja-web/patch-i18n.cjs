const fs = require('fs');

const zhPatch = {
  paymentModal: {
    modalLabel: "支付方式",
    payNow: "立即支付",
    processing: "正在处理中...",
    title: "收银台"
  },
  product: {
    defaultDescription: "暂无描述",
    defaultDetails: "暂无详细信息",
    defaultProvider: "匿名创客",
    defaultTitle: "未知概念产品",
    errorMessage: "加载商品信息失败",
    specs: { funding: "众筹进度" },
    story: {
      conceptEyebrow: "设计灵感",
      conceptTitle: "从构想到现实",
      conceptBody: "每一个伟大的产品都始于一个不切实际的想法。通过深度计算与迭代，这个概念逐渐成型。",
      crowdfundingEyebrow: "众筹生态",
      crowdfundingTitle: "共创者网络",
      systemEyebrow: "系统协同",
      systemTitle: "ZeroClaw 接入状态",
      systemBody: "底层逻辑已打通，各个模块高效运转，从设计到开模一气呵成。",
      systemNote: "系统流转已验证",
      funded: "已筹集"
    },
    toast: {
      addedToCart: "已加入愿望单",
      removedFavorite: "已取消心愿单收藏",
      savedFavorite: "已开启心愿单"
    }
  },
  profile: {
    activity: {
      modalLabel: "活动记录",
      title: "近期活动概览",
      join: "参与活动",
      availability: "活跃度",
      items: {
        designSprint: { title: "设计冲刺", description: "短周期密集原型验证", tag: "Design" },
        heritage: { title: "非遗焕新", description: "用科技赋予传统新生", tag: "Culture" },
        newCreator: { title: "新创客扶持", description: "为首次发布者提供流量倾斜", tag: "Creator", date: "2026-04-01" }
      }
    }
  },
  search: {
    fallback: {
      aiLearning: "AI 机器视觉开发套件", camera: "复古 CCD 潮玩相机", print3d: "碳纤维 3D 打印无人机架", smartHome: "智能全息中控"
    },
    historyDefaults: { earbuds: "骨传导耳机", keyboard: "客制化透明键盘" },
    suffix: { accessories: "配件", review: "测评", secondHand: "二手" },
    types: { article: "专栏", category: "分类", market: "市场" }
  },
  sellerModal: {
    title: "卖家入驻申请",
    tabs: { enterprise: "企业入驻", personal: "个人入驻" },
    hero: {
      enterpriseTitle: "企业级赋能", enterpriseDescription: "获取全量数据接口与 API 权限，高效连接柔性供应链。",
      personalTitle: "个人创客矩阵", personalDescription: "0阈值开启您的商业验证，专注于创造力本身。"
    },
    fields: {
      category: "主营类目", enterpriseId: "统一社会信用代码", enterpriseName: "企业名称",
      personalId: "身份证号", personalName: "真实姓名", phone: "联系电话", shopName: "店铺/工作室名称"
    },
    placeholders: {
      id: "请输入证件号码", name: "请输入您的真实姓名", phone: "请输入联系方式", shopName: "起一个响亮的名字"
    },
    categories: {
      agriculture: "智慧农业", design: "设计与打样", handmade: "手工与艺术", other: "其他", secondHand: "闲置循环"
    },
    agreement: {
      prefix: "我已阅读并同意", merchant: "《平台商家入驻协议》", and: "与", deposit: "《保证金规则》"
    },
    actions: { submit: "提交入驻申请" },
    feedback: {
      agreeRequired: "请先同意入驻协议", incomplete: "请填写完整的申请信息", submitted: "申请已提交，系统正在极速审核"
    }
  },
  serviceModal: {
    title: "服务与支持", faqTitle: "常见问题",
    tabs: { contact: "联系客服", help: "帮助中心" },
    chat: { placeholder: "请描述您遇到的问题...", welcome: "您好，智能客服随时为您解答。" },
    faq: {
      address: { question: "如何修改收货地址？", answer: "买家可以在订单发货前，在订单详情页申请修改。部分定制订单无法修改。" },
      points: { question: "信誉积分有什么用？", answer: "信誉积分可用于兑换特殊流量包、折扣券或解锁更高权限的 AI 测试模块。" },
      refund: { question: "如何申请退换货？", answer: "在确认收货后的 7 天无理由期内，若商品未损坏，可随时在订单管理发起售后。" },
      shipping: { question: "发货时间大概是多久？", answer: "非定制商品通常48小时内从仓库发出。预售或 3D 打印代工订单按页面要求执行。" }
    },
    hotline: { title: "客服热线", hours: "工作日 09:00 - 18:00", call: "拨打热线 400-000-0000" }
  },
  settings: {
    title: "系统设置", empty: "这里空空如也",
    actions: { logout: "退出系统节点", switchAccount: "切换账号" },
    grid: { address: "地址管理", identity: "实名认证", payment: "支付设置", security: "账户安全" },
    page: { about: "关于系统", complain: "违规举报", feedback: "意见反馈", general: "通用设置", identity: "实名信息", notification: "通知管理", payment: "支付方式", permission: "应用权限", privacy: "隐私政策", security: "账户安全" },
    identity: { description: "为了您的资金与交易安全，按国家要求需进行实名核验。", verified: "已认证通过" },
    payment: { add: "添加支付方式", alipay: "支付宝", title: "支付配置", wechat: "微信支付" },
    security: { title: "密码修改", oldPassword: "旧密码", newPassword: "新密码", confirmPassword: "确认新密码", submit: "更新安全凭证" },
    feedback: { title: "系统观测反馈", placeholder: "分享您对系统的任何奇思妙想或是发现的漏洞...", submit: "提交反馈包", cacheCleared: "系统缓存已清空", comingSoon: "该模块即将上线，敬请期待...", feedbackRequired: "这是必填信息", feedbackSubmitted: "感谢您的反馈，已进入我们的逻辑清洗流中。", fillRequired: "请完整填写字段", passwordMismatch: "两次输入的密码不一致", passwordUpdated: "安全凭证更新成功" },
    about: { checkUpdate: "检查系统更新", feature: "新特性一览", policy: "服务规范", version: "发布版本" }
  },
  walletModal: {
    title: "资金流转枢纽",
    tabs: { balance: "资产余额", coupons: "卡券包", points: "算力积分" },
    balance: { label: "可流转余额 (¥)", transactions: "近期清算明细" },
    actions: { topUp: "充值", topUpPrompt: "请输入充值网关金额", withdraw: "提现" },
    points: { label: "可用信誉算力", history: "积分流转记录", exchangeRate: "10 算力可抵扣 1 元手续费" },
    coupons: { useNow: "立 即 启 用", used: "已核销", amountLabel: "减额", noMinimum: "无门槛", fullReduction: { name: "满减特惠", description: "单笔满100元可用" }, newUser: { name: "新入网优惠", description: "仅适用于首次交互订单" }, shipping: { name: "免邮额度", description: "仅抵扣境内物流费" } },
    fallbackPoints: { checkIn: "每日节点激活", purchase: "算力消费抵扣", redeem: "系统兑换" },
    fallbackTransactions: { purchase: "项目算力支出", sale: "服务结算回收", topUp: "链上充值" },
    feedback: { invalidAmount: "检测到异常金额参数", unknownError: "通信异常，请重试", withdrawSubmitted: "提现流已发起，系统预计于 2 分钟内响应" }
  }
};

const enPatch = {
  paymentModal: {
    modalLabel: "Payment Center",
    payNow: "P A Y   N O W",
    processing: "Processing Node...",
    title: "Checkout Gateway"
  },
  product: {
    defaultDescription: "No description available",
    defaultDetails: "No details available",
    defaultProvider: "Anonymous Maker",
    defaultTitle: "Unknown Conceptual Unit",
    errorMessage: "Failed to download item metadata",
    specs: { funding: "Funding Milestone" },
    story: {
      conceptEyebrow: "DESIGN INSPIRATION", conceptTitle: "From Thought to Atom", conceptBody: "Every significant iteration starts with an unpractical thought. Through deep modeling, this concept is shifting into reality.",
      crowdfundingEyebrow: "CROWDFUND NETWORK", crowdfundingTitle: "Co-creator Hub",
      systemEyebrow: "SYSTEM SYNERGY", systemTitle: "ZeroClaw Linkage Status", systemBody: "The underlying subroutines are fully connected. Operations from design render to factory tooling are functioning smoothly.",
      systemNote: "Workflow Loop Validated", funded: "Milestone Pledged"
    },
    toast: {
      addedToCart: "Module acquired to wishlist", removedFavorite: "Removed from focus array", savedFavorite: "Saved to focus array"
    }
  },
  profile: {
    activity: {
      modalLabel: "Activity Logs", title: "Recent Engagement", join: "Engage Protocol", availability: "Availability",
      items: {
        designSprint: { title: "Design Sprint", description: "Intense rapid prototyping validation", tag: "Design" },
        heritage: { title: "Culture Revival", description: "Applying futurism to tradition", tag: "Culture" },
        newCreator: { title: "New Maker Sandbox", description: "Traffic amplification for first launches", tag: "Creator", date: "2026-04-01" }
      }
    }
  },
  search: {
    fallback: { aiLearning: "AI Vision Core Kit", camera: "Vintage CCD Rig", print3d: "Carbon Fiber Drone Chassis", smartHome: "Holographic Nexus" },
    historyDefaults: { earbuds: "Bone-Conduction Node", keyboard: "Transparent Key-Array" },
    suffix: { accessories: "Accessories", review: "Audit", secondHand: "Pre-Owned" },
    types: { article: "Log", category: "Class", market: "Market" }
  },
  sellerModal: {
    title: "Apply For Seller Protocol",
    tabs: { enterprise: "Enterprise", personal: "Individual" },
    hero: {
      enterpriseTitle: "Enterprise Framework", enterpriseDescription: "Obtain total data API access and integrate flexible supply conduits.",
      personalTitle: "Personal Matrix", personalDescription: "Bypass barriers and initiate zero-threshold business validations."
    },
    fields: {
      category: "Main Discipline", enterpriseId: "Corporate Registration Code", enterpriseName: "Enterprise Alias",
      personalId: "Identity Code", personalName: "Legal Name", phone: "Comm. Number", shopName: "Studio Designation"
    },
    placeholders: {
      id: "Enter identity digits", name: "Enter real name", phone: "Enter communication endpoint", shopName: "Designate a firm name"
    },
    categories: {
      agriculture: "Smart Agriculture", design: "Design & Topology", handmade: "Crafting", other: "Miscellaneous", secondHand: "Resource Recovery"
    },
    agreement: {
      prefix: "I consent to the", merchant: "[Merchant Protocol]", and: "and", deposit: "[Contingency Array]"
    },
    actions: { submit: "Commit Application" },
    feedback: {
      agreeRequired: "Consent to the platform protocol is mandatory.", incomplete: "Incomplete application parameters detected.", submitted: "Application transmitted to the audit stream."
    }
  },
  serviceModal: {
    title: "Support Systems", faqTitle: "Knowledge Base",
    tabs: { contact: "Comm. Agent", help: "Help Terminal" },
    chat: { placeholder: "Detail your anomaly...", welcome: "Greetings, AI assistant initialized." },
    faq: {
      address: { question: "How to alter dispatch address?", answer: "Alteration requests can be submitted in 'Order Node' before physical tracking initiation. Excludes pre-customized modules." },
      points: { question: "What is computation capability?", answer: "Computation capability (points) can bypass transaction fees or unleash high-end AI simulations." },
      refund: { question: "Return policy?", answer: "A 7-day unconditional recall period is active upon receipt validation, provided the module is undamaged." },
      shipping: { question: "Dispatch SLA?", answer: "Standard hardware usually dispatches under 48 hours. Custom 3D prints adhere to individual protocol parameters." }
    },
    hotline: { title: "Voice Comm. Array", hours: "Uptime: Weekdays 09:00 - 18:00", call: "Dial Node 400-000-0000" }
  },
  settings: {
    title: "Core Settings", empty: "Void Detected",
    actions: { logout: "Sever Connection", switchAccount: "Toggle Identity" },
    grid: { address: "Address Topology", identity: "Identity Auth", payment: "Payment Matrix", security: "Account Firewall" },
    page: { about: "System Info", complain: "Report Anomaly", feedback: "Diagnostics", general: "General", identity: "Validation", notification: "Alerts", payment: "Checkout Gates", permission: "App Permissions", privacy: "Privacy Scope", security: "Firewall" },
    identity: { description: "Identity authentication is required to safeguard transaction streams.", verified: "Integrity Verified" },
    payment: { add: "Mount Gate", alipay: "Alipay", title: "Payment Array", wechat: "WeChat Gateway" },
    security: { title: "Cipher Modification", oldPassword: "Legacy Cipher", newPassword: "New Cipher", confirmPassword: "Confirm New Cipher", submit: "Flash New Credentials" },
    feedback: { title: "Observation Logs", placeholder: "Input any logic flaws or creative sparks...", submit: "Transmit Packet", cacheCleared: "Memory banks flushed.", comingSoon: "Module in assembly...", feedbackRequired: "Data packet incomplete", feedbackSubmitted: "Transmission absorbed by the logic loop. Gratitude.", fillRequired: "Please populate all fields.", passwordMismatch: "Ciphers do not match.", passwordUpdated: "Cipher successfully overridden." },
    about: { checkUpdate: "Ping Servers for Update", feature: "Patch Notes", policy: "Terms of Use", version: "Build Iteration" }
  },
  walletModal: {
    title: "Financial Matrix",
    tabs: { balance: "Liquid Assets", coupons: "Incentive Arrays", points: "Computation Credits" },
    balance: { label: "Circulatable Value (¥)", transactions: "Recent Event Logs" },
    actions: { topUp: "Inject Capital", topUpPrompt: "Input gateway value", withdraw: "Extract Value" },
    points: { label: "Computation Credits", history: "Point Tracking Log", exchangeRate: "10 CC = 1 USD fee waiver equivalent" },
    coupons: { useNow: "ENGAGE", used: "Consumed", amountLabel: "Rebate", noMinimum: "Unrestricted", fullReduction: { name: "Volume Threshold", description: "Valid for loads >= 100" }, newUser: { name: "Fresh Node Entry", description: "Restricted to first network interaction" }, shipping: { name: "Logistics Waiver", description: "Domestic routes only" } },
    fallbackPoints: { checkIn: "Daily Uplink Bonus", purchase: "Computation Depletion", redeem: "Network Conversion" },
    fallbackTransactions: { purchase: "Capital Expenditure", sale: "Settlement Injection", topUp: "Node Top-Up" },
    feedback: { invalidAmount: "Anomalous integer detected.", unknownError: "Packet loss. Retry.", withdrawSubmitted: "Extraction protocol active. Expected fulfillment: 2 minutes." }
  }
};

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && !Array.isArray(source[key])) {
      target[key] = target[key] || {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const zhJson = require('./src/locales/zh.json');
const enJson = require('./src/locales/en.json');

deepMerge(zhJson, zhPatch);
deepMerge(enJson, enPatch);

fs.writeFileSync('./src/locales/zh.json', JSON.stringify(zhJson, null, 2));
fs.writeFileSync('./src/locales/en.json', JSON.stringify(enJson, null, 2));

console.log('Successfully patched all missing i18n keys for Modals/Pages!');
