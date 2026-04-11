import fs from 'fs';

const filePath = 'src/components/Navbar.vue';
const content = fs.readFileSync(filePath, 'utf8');

// Find the profile button section and insert "My Orders" button after it
const profileBtnClose = content.indexOf("$t('nav.openProfile')");
if (profileBtnClose === -1) {
  console.error('Could not find openProfile string');
  process.exit(1);
}

// Find the closing </button> right after the profile section
const closingTag = '</button>';
const insertionIdx = content.indexOf(closingTag, profileBtnClose) + closingTag.length;

const ordersBtn = `
            <button
              v-if="auth.isAuthenticated"
              type="button"
              class="block w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
              @click="go(() => router.push('/orders'))"
            >
              我的订单
            </button>`;

const updated = content.slice(0, insertionIdx) + ordersBtn + content.slice(insertionIdx);
fs.writeFileSync(filePath, updated, 'utf8');
console.log('Successfully added orders nav link');
