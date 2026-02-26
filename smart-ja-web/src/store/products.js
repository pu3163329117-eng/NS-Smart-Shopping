import { reactive, computed, watch } from 'vue';

const STORAGE_KEY = 'ns_products_data';

const defaultProducts = [
    {
      id: 4,
      name: '霸芒留声玩偶',
      desc: '以可爱萌系芒果造型为载体，传递湖南文化的情感陪伴型文创产品。',
      company: '湘芒芒',
      price: 29.9,
      longDesc: '本产品是湘芒芒的“霸芒留声玩偶”，以可爱萌系芒果造型为载体，通过方言留声与互动功能传递湖南文化的情感陪伴型文创产品。开发优先级上，首先确保15-20cm主流尺寸、柔软亲肤材质、中低价格带的基础体验；其次，深度融合卡通化设计与湖南文化元素，打磨方言留声（侧重童声与成人声）、蓝牙音乐、触摸感应等核心功能；最后，根据市场反馈迭代优化，逐步引入如可拆洗外套、特色声音包、AI互动等升级功能或衍生形态（如背包挂件），并通过文化分享与情感送礼场景强化产品独特价值，实现文化传承与市场吸引力的双赢。',
      img: '/images/mango-doll.svg'
    },
    {
      id: 1,
      name: 'EcoFuture Notebook',
      desc: '植入种子的笔记本，写完埋入土里，长出希望。',
      company: '绿意未来',
      price: 29.9,
      longDesc: 'EcoFuture 笔记本不仅仅是一个记录想法的地方，它是生命的载体。每一页纸张中都精心嵌入了各类花草种子。当你写满一本笔记，只需将它埋入土中，浇水施肥，几周后，你的文字将化作一片生机勃勃的花园。我们相信，创意的终点不应是废纸篓，而是新生命的起点。适合送给热爱环保、充满梦想的孩子。',
      img: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=2000&auto=format&fit=crop'
    },
    {
      id: 2,
      name: 'TechKid Kit',
      desc: '专为 8 岁儿童设计的模块化编程套件。',
      company: 'TechKid 智趣',
      price: 199.0,
      longDesc: 'TechKid 编程套件专为 6-12 岁儿童量身定制，无需任何代码基础。通过磁吸式模块拼接，孩子们可以轻松搭建智能小车、机械臂甚至简单的气象站。配套的图形化编程 APP，让逻辑思维训练像搭积木一样简单有趣。这不仅是一个玩具，更是通往未来科技世界的金钥匙，培养孩子解决问题的核心能力。',
      img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2000&auto=format&fit=crop'
    },
    {
      id: 3,
      name: 'ArtSpace Hoodie',
      desc: 'AI 辅助设计的限量版卫衣，每一件都独一无二。',
      company: '艺创空间',
      price: 89.0,
      longDesc: 'ArtSpace 卫衣打破了传统设计的界限。每一件卫衣的图案都由我们的学生设计师与 AI 算法共同创作，融合了梵高的星空与赛博朋克的霓虹。采用 100% 有机棉，穿着舒适透气。穿上它，你就是行走的艺术品，展现独一无二的个性主张。支持定制，让 AI 将你的梦境绘制成衣。',
      img: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=2000&auto=format&fit=crop'
    }
  ];

// Load from local storage or use defaults
let initialState = { products: defaultProducts };
try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        initialState = JSON.parse(stored);
    }
} catch (e) {
    console.error('Failed to parse products from local storage:', e);
    localStorage.removeItem(STORAGE_KEY);
}

// Ensure defaults exist if storage was empty or partial
if (!initialState.products || initialState.products.length === 0) {
    initialState.products = defaultProducts;
}

const state = reactive(initialState);

// Watch for changes and save to local storage
watch(() => state.products, (newVal) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ products: newVal }));
}, { deep: true });

export const useProducts = () => {
  const updateProductImage = (id, newImgUrl) => {
    const product = state.products.find(p => p.id === id);
    if (product) {
      product.img = newImgUrl;
    }
  };

  const updateProductPrice = (id, newPrice) => {
    const product = state.products.find(p => p.id === id);
    if (product) {
      product.price = parseFloat(newPrice);
    }
  };

  const deleteProduct = (id) => {
    const index = state.products.findIndex(p => p.id === id);
    if (index !== -1) {
      state.products.splice(index, 1);
    }
  };

  const addProduct = (product) => {
    state.products.unshift(product);
  };
  
  const updateProduct = (id, updates) => {
    const product = state.products.find(p => p.id === id);
    if (product) {
      Object.assign(product, updates);
    }
  };

  return {
    products: computed(() => state.products || []),
    getAllProducts: () => state.products,
    getProductById: (id) => state.products.find(p => p.id === id),
    updateProductImage,
    updateProductPrice,
    deleteProduct,
    addProduct,
    updateProduct
  };
};
