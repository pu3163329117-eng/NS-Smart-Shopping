const fs = require("fs");
const zhPath = "src/locales/zh.json";
const enPath = "src/locales/en.json";

const zhUpdates = {
  market: {
    categories: {
      all: "全部发现",
      service: "数字服务",
      goods: "实物周边",
      "3d": "3D打印",
      custom: "个性定制",
    },
    title: "NS Market",
    subtitle:
      "探索无限创意的汇聚之地。从数字服务到实体好物，这里是创客们的发声场。",
    searchPlaceholder: "搜索灵感...",
    sort: {
      latest: "最新上线",
      popular: "最受欢迎",
      priceAsc: "价格最低",
      priceDesc: "价格最高",
    },
    noResults: "没有找到符合条件的商品，换个搜索词试试？",
    noResultsDesc: "尝试不同的关键词或浏览其他分类",
    resetSearch: "重置探索",
    endOfList: "已经到底啦",
  },
  about: {
    modal: {
      title: "关于 NS Matrix",
      intro: "连接创造者与消费者的次世代枢纽",
      systemTitle: "系统核心功能",
      systemIntro: "基于 ZeroClaw 的智能生态网络。",
      systemResearch: "全局智能感知层",
      systemData: "分布式数据清洗集群",
      systemStrategy: "自动化策略推演模块",
      systemExecution: "敏捷验证执行流",
      outro: "我们仍在不断进化，探寻未知的商业边界。",
      footer: "版本状态：活跃并正常运行中",
    },
  },
  publish: {
    title: "发布新项目",
    drafts: "草稿箱",
    notice: "请详细填写项目规格",
    modalLabel: "发布组件",
  },
  dataCenter: {
    header: {
      label: "数据驾驶舱",
      title: "数据中心",
      admin: "系统管理员",
      back: "返回",
    },
    tabs: {
      overview: "全景概览",
      services: "服务治理",
      orders: "订单流转",
      users: "用户生态",
      system: "系统状态",
    },
    status: {
      processing: "处理中",
      pending: "待支付",
      paid: "已付款",
      completed: "已完成",
      shipped: "已发出",
    },
    overview: {
      gmv: "总交易额 (GMV)",
      orders: "总订单数",
      users: "总用户数",
      providers: "入驻创客",
      revenueChart: "营收趋势",
    },
    services: {
      pending: "待审核服务",
      emptyPending: "暂无待审核服务",
      reject: "驳回",
      approve: "通过",
      active: "活跃服务",
      sales: "销量: {count}",
      rating: "评分: {value}",
    },
    orders: {
      title: "最新订单",
    },
    users: {
      title: "活跃实体",
      role: "角色: {role}",
      orders: "订单数: {count}",
    },
    feedback: {
      approved: "服务 {name} 已通过审核",
      rejected: "服务已驳回",
    },
    system: {
      status: "资源监控",
      dbConnections: "数据库连接: {count}",
      lastBackup: "最后备份: {value}",
      logs: "系统实时日志",
    },
  },
  help: {
    modalLabel: "帮助支持",
    title: "需要帮助？",
    subtitle: "我们随时为您提供技术与服务支持。",
    contact: {
      title: "联系客服",
      body: "我们的人工客服工作时间为 9:00 - 18:00。",
      action: "开始对话",
    },
  },
  myOrders: {
    modalLabel: "订单记录",
    title: "全部订单",
    empty: {
      title: "暂无订单",
      body: "去探索一下社区里的优质商品和创客服务吧！",
      action: "即刻探索",
    },
    meta: {
      notes: "订单备注",
      amount: "实付金额",
    },
    actions: {
      support: "联系支持",
      review: "发表评价",
    },
  },
  privacy: {
    modalLabel: "隐私政策",
    title: "数据与隐私",
    updatedAt: "最后更新于: 2026年3月",
    sections: {
      collection: {
        title: "数据采集",
        body: "我们仅采集提升您购物体验所必需的最少数据。",
      },
      usage: {
        title: "数据使用",
        body: "数据用于为您生成个性化的 AI 购物基因。",
      },
      sharing: {
        title: "数据共享",
        body: "未经您明确授权，我们不会向任何第三方披露您的个人标识。",
      },
      security: {
        title: "信息安全",
        body: "采用全球顶尖的区块链加密技术，确保每一笔交易的数据隐私。",
      },
    },
  },
  terms: {
    modalLabel: "服务条款",
    title: "用户协议",
    updatedAt: "最后更新于: 2026年3月",
    sections: {
      intro: {
        title: "总则",
        body: "欢迎使用 Smart-JA NS。访问本平台即代表您同意本协议的全部内容。",
      },
      account: {
        title: "账号管理",
        body: "您有责任妥善保管您的登录凭证，并对账号下的所有活动负责。",
      },
      crowdfunding: {
        title: "众筹规范",
        body: "众筹项目存在风险，平台将严格审核，但不对项目的最终交付承担连带责任。",
      },
      ip: {
        title: "知识产权",
        body: "创客发布的原创内容归创客所有，平台依法保护其合法权益。",
      },
    },
  },
  profile: {
    hero: {
      editProfile: "编辑档案",
      level: "极客网络等级",
      walletFocus: "专注模式",
      checkIn: "每日签到",
      openWallet: "打开钱包",
    },
    tabs: {
      personal: "数字档案",
      maker: "创客控制台",
    },
    actions: {
      heading: "交互通道",
      subtitle: "快速访问您的所有系统记录配置",
    },
    recommendations: {
      heading: "衍生灵感",
      subtitle: "基于神经网络重构的专属商品列阵",
      explore: "探索全景网络",
      creator: "发起创客计划",
    },
    maker: {
      heading: "创客枢纽",
      level: "Lv.{level} 构筑者",
    },
  },
  auth: {
    brandLabel: "数字核心网络",
    heroBody: "接通 ZeroClaw 引擎，感知实时消费数据流与智能生态圈。",
    heroFoot: "稳定连接节点，获取前沿计算红利。",
  },
  product: {
    actions: {
      returnToMarket: "返回全景市场",
    },
  },
  aiLab: {
    releaseTitle: "项目启动成功",
    releaseSubtitle: "当前进度：{stage} 已同步",
  },
  investor: {
    routes: {
      apac: "亚太节点",
      apacShare: "42%",
      na: "北美节点",
      naShare: "35%",
      eu: "欧非节点",
      euShare: "23%",
    },
  },
  PRODUCT: {
    DEFAULTTYPE: "默认类型",
    METRICS: {
      AIMATCH: "AI 匹配度",
      BUILDCONFIDENCE: "建设信心",
      DELIVERYREADINESS: "交付准备度",
    },
  },
  product: {
    defaultType: "默认类型",
    hero: {
      liveNow: "正在众筹",
    },
    metrics: {
      aiMatch: "AI 匹配度",
      aiMatchNote: "基于您的浏览历史与购物基因的神经网络匹配评分。",
      buildConfidence: "建设信心",
      buildConfidenceNote: "综合市场热度与创客历史交付记录的信用评级。",
      deliveryReadiness: "交付准备度",
      deliveryReadinessNote: "供应链响应速度与物流渠道的综合效能评估。",
    },
    crowdfunding: {
      remaining: "距离目标还差 {amount}。提前锁定，享受专属折扣。",
    },
  },
};

const enUpdates = {
  market: {
    categories: {
      all: "All Discoveries",
      service: "Digital Services",
      goods: "Physical Goods",
      "3d": "3D Printing",
      custom: "Custom Made",
    },
    title: "NS Market",
    subtitle:
      "A gathering place for boundless creativity. From digital services to physical goods, this is the voice of makers.",
    searchPlaceholder: "Search inspiration...",
    sort: {
      latest: "Latest",
      popular: "Most Popular",
      priceAsc: "Price: Low to High",
      priceDesc: "Price: High to Low",
    },
    noResults:
      "No products found matching your criteria, try another search term?",
    noResultsDesc: "Try different keywords or browse other categories",
    resetSearch: "Reset Search",
    endOfList: "You've reached the end",
  },
  about: {
    modal: {
      title: "About NS Matrix",
      intro: "Next-gen nexus connecting makers and consumers",
      systemTitle: "Core Features",
      systemIntro: "Intelligent ecosystem based on ZeroClaw.",
      systemResearch: "Global Perception",
      systemData: "Data Refining Matrix",
      systemStrategy: "Auto Strategy Evolution",
      systemExecution: "Agile Execution Flow",
      outro: "We continue evolving to explore commercial limits.",
      footer: "Status: Active and Running",
    },
  },
  publish: {
    title: "Create New Project",
    drafts: "Drafts",
    notice: "Please fill out project specs completely",
    modalLabel: "Publish Module",
  },
  dataCenter: {
    header: {
      label: "DATA COCKPIT",
      title: "Data Center",
      admin: "System Admin",
      back: "Return",
    },
    tabs: {
      overview: "Overview",
      services: "Services",
      orders: "Orders",
      users: "Ecosystem",
      system: "System",
    },
    status: {
      processing: "Processing",
      pending: "Pending",
      paid: "Paid",
      completed: "Completed",
      shipped: "Shipped",
    },
    overview: {
      gmv: "Total GMV",
      orders: "Total Orders",
      users: "Total Users",
      providers: "Active Makers",
      revenueChart: "Revenue Trend",
    },
    services: {
      pending: "Pending Services",
      emptyPending: "No pending services.",
      reject: "Reject",
      approve: "Approve",
      active: "Active Services",
      sales: "Sales: {count}",
      rating: "Rating: {value}",
    },
    orders: {
      title: "Latest Orders",
    },
    users: {
      title: "Active Entities",
      role: "Role: {role}",
      orders: "Orders: {count}",
    },
    feedback: {
      approved: "Service {name} approved",
      rejected: "Service rejected",
    },
    system: {
      status: "Resource Monitor",
      dbConnections: "DB Connections: {count}",
      lastBackup: "Last Backup: {value}",
      logs: "System Event Logs",
    },
  },
  help: {
    modalLabel: "Support",
    title: "Need Help?",
    subtitle: "We're here to provide technical and service support.",
    contact: {
      title: "Contact Agent",
      body: "Our human agents are available from 9:00 AM to 6:00 PM.",
      action: "Start Chat",
    },
  },
  myOrders: {
    modalLabel: "Order Logs",
    title: "All Orders",
    empty: {
      title: "No Orders Yet",
      body: "Explore the community for premium goods and maker services!",
      action: "Explore Now",
    },
    meta: {
      notes: "Remarks",
      amount: "Paid Amount",
    },
    actions: {
      support: "Contact Support",
      review: "Write Review",
    },
  },
  privacy: {
    modalLabel: "Privacy",
    title: "Data & Privacy",
    updatedAt: "Last updated: March 2026",
    sections: {
      collection: {
        title: "Data Collection",
        body: "We only collect minimal data necessary to enhance your shopping experience.",
      },
      usage: {
        title: "Data Usage",
        body: "Data is used to generate your personalized AI Shopping DNA.",
      },
      sharing: {
        title: "Data Sharing",
        body: "We do not disclose your personal identifiers to any third party without your explicit consent.",
      },
      security: {
        title: "Information Security",
        body: "We utilize top-tier encryption tech to ensure data privacy for every transaction.",
      },
    },
  },
  terms: {
    modalLabel: "Terms",
    title: "User Agreement",
    updatedAt: "Last updated: March 2026",
    sections: {
      intro: {
        title: "General Provisions",
        body: "Welcome to Smart-JA NS. By accessing this platform, you agree to this agreement.",
      },
      account: {
        title: "Account Management",
        body: "You are responsible for keeping your credentials safe and for all activities under your account.",
      },
      crowdfunding: {
        title: "Crowdfunding Policy",
        body: "Crowdfunding carries risks. The platform audits strictly but bears no joint liability for final delivery.",
      },
      ip: {
        title: "Intellectual Property",
        body: "Original content published by makers belongs to them. The platform protects their legitimate rights.",
      },
    },
  },
  profile: {
    hero: {
      editProfile: "Edit Profile",
      level: "Geek Network Level",
      walletFocus: "Focus Mode",
      checkIn: "Daily Check-in",
      openWallet: "Open Wallet",
    },
    tabs: {
      personal: "Digital Archive",
      maker: "Maker Console",
    },
    actions: {
      heading: "Interaction Channels",
      subtitle: "Quick access to all your system records configuration",
    },
    recommendations: {
      heading: "Derivative Inspirations",
      subtitle: "Exclusive array based on neural network reconstruction",
      explore: "Explore the Network",
      creator: "Initiate Maker Plan",
    },
    maker: {
      heading: "Maker Nexus",
      level: "Lv.{level} Architect",
    },
  },
  auth: {
    brandLabel: "DIGITAL CORE NETWORK",
    heroBody:
      "Connect with the ZeroClaw engine to perceive real-time data flow.",
    heroFoot:
      "Stable connection active. Capturing advanced computation dividends.",
  },
  product: {
    actions: {
      returnToMarket: "Return to Market Panorama",
    },
  },
  aiLab: {
    releaseTitle: "Initiation Successful",
    releaseSubtitle: "Current Phase: {stage} synchronized",
  },
  investor: {
    routes: {
      apac: "APAC Node",
      apacShare: "42%",
      na: "NA Node",
      naShare: "35%",
      eu: "EU Node",
      euShare: "23%",
    },
  },
  PRODUCT: {
    DEFAULTTYPE: "Default Type",
    METRICS: {
      AIMATCH: "AI Match",
      BUILDCONFIDENCE: "Build Confidence",
      DELIVERYREADINESS: "Delivery Readiness",
    },
  },
  product: {
    defaultType: "Default Type",
    hero: {
      liveNow: "Live Now",
    },
    metrics: {
      aiMatch: "AI Match",
      aiMatchNote:
        "Neural network match score based on your browsing history and shopping DNA.",
      buildConfidence: "Build Confidence",
      buildConfidenceNote:
        "Credit rating combining market heat and the maker's historical delivery record.",
      deliveryReadiness: "Delivery Readiness",
      deliveryReadinessNote:
        "Comprehensive assessment of supply chain responsiveness and logistics channel efficiency.",
    },
    crowdfunding: {
      remaining:
        "Only {amount} away from the goal. Lock in early for exclusive discounts.",
    },
  },
};

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(target[key], deepMerge(target[key], source[key]));
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const zhJson = JSON.parse(fs.readFileSync(zhPath, "utf8"));
const enJson = JSON.parse(fs.readFileSync(enPath, "utf8"));

const newZh = deepMerge(zhJson, zhUpdates);
const newEn = deepMerge(enJson, enUpdates);

fs.writeFileSync(zhPath, JSON.stringify(newZh, null, 2));
fs.writeFileSync(enPath, JSON.stringify(newEn, null, 2));

console.log("Dictionary updated successfully.");
