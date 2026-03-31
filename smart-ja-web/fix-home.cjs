const fs = require('fs');
let c = fs.readFileSync('src/views/Home.vue', 'utf8');

c = c.replace(
    '>\n            Future Commerce For Youth Innovation\n          <',
    '>\n            {{ $t(\'home.heroKicker\') }}\n          <'
);
c = c.replace(
    '>\n            A clean stage for products, programs, and investor attention.\n          <',
    '>\n            {{ $t(\'home.heroTitle\') }}\n          <'
);
c = c.replace(
    '>\n              Business logic is now live. The homepage shifts into presentation mode: massive typography, controlled contrast, and a cinematic product reveal driven by real featured services.\n            <',
    '>\n              {{ $t(\'home.heroDesc\') }}\n            <'
);
c = c.replace(
    '>\n                进入商城\n              <',
    '>\n                {{ $t(\'home.enterMarket\') }}\n              <'
);
c = c.replace(
    '>\n                查看爆品\n              <',
    '>\n                {{ $t(\'home.viewFeatured\') }}\n              <'
);
c = c.replace(
    '>\n                探索 NS 宇宙\n              <',
    '>\n                {{ $t(\'home.exploreUniverse\') }}\n              <'
);
c = c.replace('>Featured Drop<', '>{{ $t(\'home.featuredDrop\') }}<');
c = c.replace(
    '>\n              Open story\n            <',
    '>\n              {{ $t(\'home.openStory\') }}\n            <'
);
c = c.replace(
    '>\n              0{{ index + 1 }} / Flagship Sequence\n            <',
    '>\n              0{{ index + 1 }} / {{ $t(\'home.flagshipSequence\') }}\n            <'
);

fs.writeFileSync('src/views/Home.vue', c);

let zh = JSON.parse(fs.readFileSync('src/locales/zh.json'));
let en = JSON.parse(fs.readFileSync('src/locales/en.json'));

zh.home = {
    heroKicker: '青年创新的未来商业',
    heroTitle: '为产品、计划与资本关注打造的纯净舞台。',
    heroDesc: '商业逻辑全量上线，首页进入展示模式：极简排版、震撼对比，以及由真实商城数据驱动的电影级产品爆光。',
    enterMarket: '进入商城',
    viewFeatured: '查看爆品',
    exploreUniverse: '探索 NS 宇宙',
    featuredDrop: '爆单掉落',
    openStory: '展开产品故事',
    flagshipSequence: '旗舰序列'
};

en.home = {
    heroKicker: 'Future Commerce For Youth Innovation',
    heroTitle: 'A clean stage for products, programs, and investor attention.',
    heroDesc: 'Business logic is now live. The homepage shifts into presentation mode: massive typography, controlled contrast, and a cinematic product reveal driven by real featured services.',
    enterMarket: 'Enter Market',
    viewFeatured: 'View Featured',
    exploreUniverse: 'Explore Universe',
    featuredDrop: 'Featured Drop',
    openStory: 'Open Story',
    flagshipSequence: 'Flagship Sequence'
};

fs.writeFileSync('src/locales/zh.json', JSON.stringify(zh, null, 2));
fs.writeFileSync('src/locales/en.json', JSON.stringify(en, null, 2));

console.log('Success!');
