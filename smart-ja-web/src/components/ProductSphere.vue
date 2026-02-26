<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import { useCart } from '../store/cart';
import { useFavorites } from '../store/favorites';
import { useToast } from '../composables/useToast';

const props = defineProps({
  products: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['close']);
const { addToCart } = useCart();
const { toggleFavorite, isFavorite } = useFavorites();
const { show: showToast } = useToast();

const container = ref(null);
const selectedProduct = ref(null);
const showDetail = ref(false);
const searchQuery = ref('');
const activeCategory = ref('all');

// Three.js variables
let scene, camera, renderer, controls, raycaster;
let mouse = new THREE.Vector2();
let particles = []; // The groups containing product meshes
let lines = null;
let coreMesh = null;
let starSystem = null;
let animationId;
let time = 0;

// Data preparation
const extendedProducts = ref([]);

// Extract unique categories
const categories = computed(() => {
  const cats = new Set(props.products.map(p => p.company || 'Other'));
  return ['all', ...Array.from(cats)];
});

const initData = () => {
  if (!props.products || props.products.length === 0) return;

  const count = 100;
  for (let i = 0; i < count; i++) {
    const original = props.products[i % props.products.length];
    if (original) {
      extendedProducts.value.push({
        ...original,
        uniqueId: i,
        displayPrice: original.price
      });
    }
  }
};

const initThree = () => {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02020a); // Darker blue-black
  scene.fog = new THREE.FogExp2(0x02020a, 0.001);

  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.set(0, 100, 600);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.value.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.3;
  controls.maxDistance = 1200;
  controls.minDistance = 100;

  // Raycaster
  raycaster = new THREE.Raycaster();

  // Objects
  createStarfield();
  createCore();
  createParticles();
  createConnections();

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  const pointLight = new THREE.PointLight(0x0088ff, 2, 1000);
  pointLight.position.set(0, 0, 0);
  scene.add(pointLight);

  // Event Listeners
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
};

const createStarfield = () => {
  const geometry = new THREE.BufferGeometry();
  const count = 8000; // Increased count
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count); // Varying sizes
  
  const color1 = new THREE.Color(0x44aaff);
  const color2 = new THREE.Color(0xffaaee); // Purple/Pink mix
  const color3 = new THREE.Color(0xffffff);

  for(let i = 0; i < count * 3; i+=3) {
    const r = 2000 * Math.cbrt(Math.random()); // Even distribution in sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i] = r * Math.sin(phi) * Math.cos(theta);
    positions[i+1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i+2] = r * Math.cos(phi);
    
    // Mix colors
    const choice = Math.random();
    let mixedColor;
    if (choice < 0.33) mixedColor = color1;
    else if (choice < 0.66) mixedColor = color2;
    else mixedColor = color3;
    
    colors[i] = mixedColor.r;
    colors[i+1] = mixedColor.g;
    colors[i+2] = mixedColor.b;
    
    sizes[i/3] = Math.random() * 4;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  // Custom shader material for twinkling stars could be better, but PointsMaterial is faster to implement
  const material = new THREE.PointsMaterial({
    size: 4,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    map: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png')
  });
  
  starSystem = new THREE.Points(geometry, material);
  scene.add(starSystem);
};

const createCore = () => {
  // Glowing Core
  const geometry = new THREE.IcosahedronGeometry(40, 2);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00aaff,
    wireframe: true,
    transparent: true,
    opacity: 0.3
  });
  coreMesh = new THREE.Mesh(geometry, material);
  scene.add(coreMesh);
  
  // Inner Glow Sprite
  const spriteMaterial = new THREE.SpriteMaterial({
    map: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/glow.png'), // Using standard glow texture if available, or just a radial gradient
    color: 0x0044ff,
    transparent: true,
    blending: THREE.AdditiveBlending
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(200, 200, 1);
  scene.add(sprite);
};

const createParticles = () => {
  const loader = new THREE.TextureLoader();
  const textureMap = new Map();
  props.products.forEach(p => {
    if (!textureMap.has(p.id)) {
      textureMap.set(p.id, loader.load(p.img));
    }
  });

  const count = extendedProducts.value.length;
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * i;

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    const sphereRadius = 400; 

    const group = new THREE.Group();
    const product = extendedProducts.value[i];
    const map = textureMap.get(product.id);
    
    // Image Disc
    const geometry = new THREE.CircleGeometry(20, 32);
    const material = new THREE.MeshBasicMaterial({ map: map, side: THREE.DoubleSide });
    const disc = new THREE.Mesh(geometry, material);
    
    // Glowing Ring
    const ringGeo = new THREE.RingGeometry(20, 22, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x44aaff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);

    group.add(disc);
    group.add(ring);
    
    group.position.set(x * sphereRadius, y * sphereRadius, z * sphereRadius);
    group.lookAt(0, 0, 0);
    
    group.userData = { 
      product: product,
      originalPos: group.position.clone(),
      targetScale: 1,
      id: i
    };
    
    scene.add(group);
    particles.push(group);
  }
};

const createConnections = () => {
  // Create lines between nearby particles
  // This is a static "constellation" effect based on initial positions
  const material = new THREE.LineBasicMaterial({
    color: 0x225588,
    transparent: true,
    opacity: 0.2
  });

  const geometry = new THREE.BufferGeometry();
  const positions = [];
  
  // Connect each particle to its 2 closest neighbors
  for (let i = 0; i < particles.length; i++) {
    const p1 = particles[i];
    let closest = [];
    
    for (let j = 0; j < particles.length; j++) {
      if (i === j) continue;
      const p2 = particles[j];
      const dist = p1.position.distanceTo(p2.position);
      closest.push({ idx: j, dist });
    }
    
    closest.sort((a, b) => a.dist - b.dist);
    
    // Connect to top 2
    for (let k = 0; k < 2; k++) {
      if (closest[k].dist < 150) { // Max connection distance
        const p2 = particles[closest[k].idx];
        positions.push(p1.position.x, p1.position.y, p1.position.z);
        positions.push(p2.position.x, p2.position.y, p2.position.z);
      }
    }
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  lines = new THREE.LineSegments(geometry, material);
  scene.add(lines);
};

const animate = () => {
  animationId = requestAnimationFrame(animate);
  time += 0.005;
  controls.update();
  
  // Rotate starfield slowly
  if (starSystem) {
    starSystem.rotation.y += 0.0003;
  }
  
  // Pulse core
  if (coreMesh) {
    coreMesh.rotation.y -= 0.01;
    coreMesh.rotation.x -= 0.005;
    const scale = 1 + Math.sin(time * 2) * 0.1;
    coreMesh.scale.set(scale, scale, scale);
  }

  // Mouse Interaction
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(particles, true);

  // Reset scales
  particles.forEach(p => {
    // Check filter
    const matchesSearch = !searchQuery.value || p.userData.product.name.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesCategory = activeCategory.value === 'all' || p.userData.product.company === activeCategory.value;
    const isVisible = matchesSearch && matchesCategory;

    // Fade out/in based on visibility
    const targetScale = isVisible ? 1 : 0;
    
    // Hover effect (only if visible)
    if (isVisible) {
      p.userData.targetScale = 1;
    } else {
      p.userData.targetScale = 0;
    }
    
    p.visible = p.scale.x > 0.01;
  });

  let hovered = false;
  if (intersects.length > 0) {
    let object = intersects[0].object;
    while(object.parent && object.parent !== scene) object = object.parent;
    
    if (particles.includes(object) && object.visible) {
      object.userData.targetScale = 2.0;
      document.body.style.cursor = 'pointer';
      hovered = true;
    }
  }

  if (!hovered) document.body.style.cursor = 'default';

  // Update particles
  particles.forEach(p => {
    // Smooth scale
    const current = p.scale.x;
    const target = p.userData.targetScale;
    const diff = target - current;
    if (Math.abs(diff) > 0.001) {
      const newScale = current + diff * 0.1;
      p.scale.set(newScale, newScale, newScale);
    }
    
    // Always face camera
    p.lookAt(camera.position);

    // Spin effect on hover
    if (p.userData.targetScale > 1.5) {
      p.children.forEach(child => {
        child.rotation.z += 0.05;
      });
    } else {
      // Smoothly reset rotation
      p.children.forEach(child => {
        if (Math.abs(child.rotation.z) > 0.01) {
          child.rotation.z *= 0.9;
        } else {
          child.rotation.z = 0;
        }
      });
    }
  });
  
  renderer.render(scene, camera);
};

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

const onMouseMove = (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
};

const onClick = (event) => {
  if (showDetail.value) return; // Prevent clicks when modal is open

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(particles, true);

  if (intersects.length > 0) {
    let object = intersects[0].object;
    while(object.parent && object.parent !== scene) object = object.parent;

    if (particles.includes(object) && object.visible) {
      controls.autoRotate = false;
      
      // Fly to animation
      const targetPos = object.position.clone().multiplyScalar(0.8); // Stop slightly before the object
      const cameraPos = object.position.clone().add(object.position.clone().normalize().multiplyScalar(100)); // Position camera in front

      gsap.to(controls.target, {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z,
        duration: 1,
        ease: "power2.out"
      });

      gsap.to(camera.position, {
        x: cameraPos.x,
        y: cameraPos.y,
        z: cameraPos.z,
        duration: 1,
        ease: "power2.out",
        onUpdate: () => controls.update(),
        onComplete: () => {
          selectedProduct.value = object.userData.product;
          showDetail.value = true;
        }
      });
    }
  }
};

const resetView = () => {
  gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.5 });
  gsap.to(camera.position, { x: 0, y: 100, z: 600, duration: 1.5 });
  controls.autoRotate = true;
  searchQuery.value = '';
  activeCategory.value = 'all';
};

const handleCardMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -5;
  const rotateY = ((x - centerX) / centerX) * 5;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
};

const handleCardMouseLeave = (e) => {
  e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};

const handleDetailClose = () => {
  showDetail.value = false;
  selectedProduct.value = null;
  controls.autoRotate = true;
  // Zoom back out slightly
  gsap.to(camera.position, {
    x: camera.position.x * 1.2,
    y: camera.position.y * 1.2,
    z: camera.position.z * 1.2,
    duration: 1
  });
};

const handleAddToCart = () => {
  if (selectedProduct.value) {
    addToCart(selectedProduct.value);
    showToast('已加入购物车', 'success');
  }
};

const handleToggleFavorite = () => {
  if (selectedProduct.value) {
    const added = toggleFavorite(selectedProduct.value);
    showToast(added ? '已加入收藏' : '已取消收藏', added ? 'success' : 'info');
  }
};

const handleClose = () => emit('close');

onMounted(() => {
  initData();
  initThree();
  animate();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
  if (container.value && renderer.domElement) {
    container.value.removeChild(renderer.domElement);
  }
  cancelAnimationFrame(animationId);
  renderer.dispose();
  scene.clear();
});
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black">
    <!-- 3D Container -->
    <div ref="container" class="w-full h-full cursor-move"></div>

    <!-- UI Overlay - Top Bar -->
    <div class="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10">
      <div class="flex flex-col gap-4">
        <div>
          <h2 class="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 pointer-events-auto drop-shadow-lg">NS Universe</h2>
          <p class="text-blue-200 pointer-events-auto drop-shadow-md text-sm mt-1">探索学生商业生态系统</p>
        </div>
        
        <!-- Search & Filter Controls -->
        <div class="pointer-events-auto flex flex-col gap-3">
          <div class="relative">
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="搜索产品..." 
              class="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:bg-white/20 w-64 transition-all"
            >
            <svg class="w-4 h-4 text-gray-400 absolute right-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          
          <div class="flex flex-wrap gap-2 max-w-md">
            <button 
              v-for="cat in categories" 
              :key="cat"
              @click="activeCategory = cat"
              :class="[
                'px-3 py-1 rounded-full text-xs font-medium transition-all backdrop-blur-md border',
                activeCategory === cat 
                  ? 'bg-blue-500 border-blue-400 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              ]"
            >
              {{ cat === 'all' ? '全部' : cat }}
            </button>
          </div>
        </div>
      </div>

      <div class="flex gap-4 pointer-events-auto">
         <button @click="resetView" class="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-all border border-white/20" title="重置视角">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button @click="handleClose" class="bg-red-500/20 hover:bg-red-500/40 text-white p-3 rounded-full backdrop-blur-md transition-all border border-red-500/30">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Product Detail Modal -->
    <transition name="fade">
      <div v-if="showDetail" class="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" @click.self="handleDetailClose">
        <div class="bg-slate-900/90 border border-white/10 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row overflow-hidden animate-scale-in text-white relative">
          
           <!-- Background Glow -->
           <div class="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

          <!-- Media Section -->
          <div class="w-full md:w-1/2 bg-black/20 p-6 flex flex-col gap-4 relative z-10">
            <img :src="selectedProduct.img" class="w-full h-64 object-cover rounded-xl shadow-lg border border-white/10" />
            <div 
              class="w-full h-48 bg-black/40 rounded-xl flex items-center justify-center relative overflow-hidden group cursor-pointer border border-white/5 transition-transform duration-200 ease-out will-change-transform"
              @mousemove="handleCardMouseMove"
              @mouseleave="handleCardMouseLeave"
            >
              <img :src="selectedProduct.img" class="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm group-hover:opacity-40 transition-opacity" />
              <div class="relative z-10 flex flex-col items-center text-white">
                 <svg class="w-12 h-12 mb-2 group-hover:scale-110 transition-transform text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>
                 <span class="text-sm font-medium tracking-wide">观看全息演示</span>
              </div>
            </div>
          </div>

          <!-- Info Section -->
          <div class="w-full md:w-1/2 p-8 flex flex-col relative z-10">
            <button @click="handleDetailClose" class="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <span class="text-blue-400 font-semibold tracking-wide uppercase text-sm mb-2">{{ selectedProduct.company }}</span>
            <h3 class="text-3xl font-bold text-white mb-4">{{ selectedProduct.name }}</h3>
            
            <div class="prose prose-invert mb-6 text-gray-300 leading-relaxed">
              <p>{{ selectedProduct.longDesc || selectedProduct.desc }}</p>
            </div>

            <div class="mt-auto pt-6 border-t border-white/10">
              <div class="flex items-center justify-between mb-6">
                 <span class="text-3xl font-bold text-white">¥{{ selectedProduct.price }}</span>
                 <span class="text-green-400 text-sm font-medium flex items-center bg-green-400/10 px-3 py-1 rounded-full">
                    <span class="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                    有货
                 </span>
              </div>
              
              <div class="flex gap-4">
                <button @click="handleAddToCart" class="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95">
                  立即购买
                </button>
                <button @click="handleToggleFavorite" class="px-6 py-4 rounded-xl border border-white/20 text-white font-bold hover:bg-white/10 transition-all" :class="{ 'text-red-500 border-red-500 bg-red-500/10': isFavorite(selectedProduct.id) }">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.animate-scale-in {
  animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
