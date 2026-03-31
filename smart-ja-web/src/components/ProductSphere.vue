<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import { useCart } from '../store/cart';
import { useFavorites } from '../store/favorites';
import { useToast } from '../composables/useToast';
import { useI18n } from 'vue-i18n';

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
const { t } = useI18n();

const container = ref(null);
const selectedProduct = ref(null);
const showDetail = ref(false);
const searchQuery = ref('');
const activeCategory = ref('all');
const isIntroPlaying = ref(true);

// Three.js variables
let scene, camera, renderer, controls, raycaster;
let mouse = new THREE.Vector2();
let productNodes = []; 
let brandLines = null;
let planet, shipGroup, trail = [];
let isDragging = false;
let draggedNode = null;
let plane = new THREE.Plane();
let pOffset = new THREE.Vector3();
let pIntersect = new THREE.Vector3();
let mouseDownPos = { x: 0, y: 0 };
let animationId;
let clock = new THREE.Clock();

const extendedProducts = ref([]);

const categories = computed(() => {
  const cats = new Set(props.products.map(p => p.company || 'Other'));
  return ['all', ...Array.from(cats)];
});

const initData = () => {
  if (!props.products || props.products.length === 0) return;
  
  // Fill the universe with products, repeating if necessary to get a full "constellation"
  const totalSlots = 40;
  for (let i = 0; i < totalSlots; i++) {
    const p = props.products[i % props.products.length];
    extendedProducts.value.push({
      ...p,
      uniqueId: i,
    });
  }
};

const initThree = () => {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 3000);
  camera.position.set(400, 300, 1200);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enabled = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.2;

  raycaster = new THREE.Raycaster();

  // 1. Planet (White Model)
  const planetGeo = new THREE.IcosahedronGeometry(120, 4);
  planet = new THREE.LineSegments(new THREE.EdgesGeometry(planetGeo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 }));
  scene.add(planet);
  
  // 2. Starship
  createStarshipSystem();
  
  // 3. Product Nodes & Constellations
  createProductNodes();
  createBrandConnections();

  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('mouseup', onMouseUp);
  renderer.domElement.addEventListener('click', onClick);
  
  playIntro();
};

const createStarshipSystem = () => {
  shipGroup = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
  const fireMat = new THREE.MeshBasicMaterial({ color: 0x44ccff, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
  
  // M-Ship Style (Milan)
  const cockpit = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ConeGeometry(8, 25, 4)), mat);
  cockpit.rotation.x = Math.PI / 2;
  shipGroup.add(cockpit);
  
  const wings = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(70, 2, 20)), mat);
  wings.position.z = -10;
  shipGroup.add(wings);
  
  // Engines & Fire
  const engines = [];
  [[-20, 0, -15], [20, 0, -15], [-10, -4, -18], [10, -4, -18]].forEach(pos => {
    const eng = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(6, 6, 12)), mat);
    eng.position.set(...pos);
    shipGroup.add(eng);

    // JET FIRE (Oriented Backward)
    const fire = new THREE.Mesh(new THREE.ConeGeometry(3, 20, 8), fireMat);
    fire.rotation.x = -Math.PI / 2; // Point away from front
    fire.position.z = -12;
    eng.add(fire);
    engines.push(fire);
  });
  
  shipGroup.userData.engines = engines;
  shipGroup.scale.setScalar(1.5);
  shipGroup.position.set(1500, 1000, 500);
  shipGroup.lookAt(-1000, -800, -200);
  scene.add(shipGroup);
};

const createProductNodes = () => {
  const count = extendedProducts.value.length;
  const phi = Math.PI * (3 - Math.sqrt(5)); 
  const loader = new THREE.TextureLoader();

  // Pre-load textures for products (unique ones)
  const textureCache = new Map();
  props.products.forEach(p => {
    if (p.img) textureCache.set(p.id, loader.load(p.img));
  });

  extendedProducts.value.forEach((product, i) => {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * i;

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    const orbitRadius = 480 + Math.random() * 60; 

    const group = new THREE.Group();
    
    // 1. External Frame (White Model)
    const nodeGeo = new THREE.IcosahedronGeometry(18, 0);
    const nodeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    group.add(new THREE.LineSegments(new THREE.EdgesGeometry(nodeGeo), nodeMat));
    
    // 2. Product Image Surface (Inside/On top of frame)
    if (textureCache.has(product.id)) {
      const imgGeo = new THREE.CircleGeometry(12, 32);
      const imgMat = new THREE.MeshBasicMaterial({ 
        map: textureCache.get(product.id),
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });
      const imgMesh = new THREE.Mesh(imgGeo, imgMat);
      group.add(imgMesh);
    }
    
    // 3. Name Label (Subtle persistent info)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256; canvas.height = 128;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(product.name.substring(0, 12).toUpperCase(), 128, 90);
    
    const texture = new THREE.CanvasTexture(canvas);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.5 }));
    label.scale.set(40, 20, 1);
    label.position.y = 28;
    group.add(label);

    group.position.set(x * orbitRadius, y * orbitRadius, z * orbitRadius);
    group.userData = { product, originalPos: group.position.clone(), isNode: true, initialOpacity: 0.3 };
    group.visible = false; 
    
    scene.add(group);
    productNodes.push(group);
  });
};

const createBrandConnections = () => {
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0, // Animted in later
    blending: THREE.AdditiveBlending
  });

  const geometry = new THREE.BufferGeometry();
  const points = [];

  // Group nodes by company
  const groups = new Map();
  productNodes.forEach(node => {
    const brand = node.userData.product.company || 'Other';
    if (!groups.has(brand)) groups.set(brand, []);
    groups.get(brand).push(node);
  });

  // Create lines between nodes in each brand cluster (Nearest Neighbors only)
  groups.forEach((nodes) => {
    if (nodes.length < 2) return;
    
    nodes.forEach(nodeA => {
      // Find 2 closest neighbors in same brand
      let neighbors = nodes
        .filter(nodeB => nodeB !== nodeA)
        .map(nodeB => ({ node: nodeB, dist: nodeA.position.distanceTo(nodeB.position) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 2);

      neighbors.forEach(neighbor => {
        points.push(nodeA.position.x, nodeA.position.y, nodeA.position.z);
        points.push(neighbor.node.position.x, neighbor.node.position.y, neighbor.node.position.z);
      });
    });
  });

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  brandLines = new THREE.LineSegments(geometry, lineMat);
  scene.add(brandLines);
};

const playIntro = () => {
  const tl = gsap.timeline({
    onComplete: () => {
      isIntroPlaying.value = false;
      controls.enabled = true;
    }
  });

  tl.to(shipGroup.position, {
    x: -1500, y: -1000, z: 1200,
    duration: 3.5,
    ease: "power2.inOut",
    onUpdate: () => {
      if (Math.random() > 0.4) createTrailPoint(shipGroup.position.clone(), 3);
    }
  });

  tl.to(camera.position, {
    x: -300, y: 100, z: 600,
    duration: 3.2,
    ease: "power2.inOut",
    onUpdate: () => { if (controls) controls.update(); }
  }, 0.8);

  tl.to(controls.target, { x: 0, y: 0, z: 0, duration: 1, ease: "power1.inOut" }, "-=1");

  productNodes.forEach((node, i) => {
    gsap.delayedCall(1.6 + (i * 0.04), () => {
      node.visible = true;
      node.scale.setScalar(0);
      gsap.to(node.scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: "back.out(1.5)" });
    });
  });

  if (brandLines) gsap.to(brandLines.material, { opacity: 0.15, duration: 2, delay: 2.2 });

  tl.to(planet.rotation, { y: Math.PI * 0.4, x: Math.PI * 0.1, duration: 4, ease: "power1.inOut" }, 0);
};

const createTrailPoint = (pos, size = 1) => {
  const geo = new THREE.SphereGeometry(size, 4, 4);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
  const p = new THREE.Mesh(geo, mat);
  p.position.copy(pos);
  scene.add(p);
  trail.push({ mesh: p, opacity: 0.6 });
};

const animate = () => {
  animationId = requestAnimationFrame(animate);
  const dt = clock.getDelta();
  
  if (controls.enabled) controls.update();

  if (planet) {
    planet.rotation.y += 0.0005;
  }

  // Pulse Engines
  if (shipGroup && shipGroup.userData.engines) {
    const s = 1 + Math.sin(Date.now() * 0.05) * 0.3;
    shipGroup.userData.engines.forEach(f => {
      f.scale.set(s, s*1.4, s);
    });
  }

  // Trail management
  trail.forEach((p, i) => {
    p.mesh.scale.multiplyScalar(0.96);
    p.opacity *= 0.96;
    p.mesh.material.opacity = p.opacity;
    if (p.opacity < 0.01) {
      scene.remove(p.mesh);
      trail.splice(i, 1);
    }
  });

  // Pulse Engines
  if (shipGroup && shipGroup.userData.engines) {
    const s = 1 + Math.sin(Date.now() * 0.05) * 0.2;
    shipGroup.userData.engines.forEach(f => {
      f.scale.set(s, s*1.5, s);
    });
  }

  // Node effects
  if (!isIntroPlaying.value) {
    productNodes.forEach(node => {
      node.lookAt(camera.position);
      // Small pulse
      const pulse = node.children[1];
      if (pulse) {
        pulse.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.2);
      }
    });
  }

  // Update Brand Connections if lines exist
  if (brandLines && (isDragging || planet.rotation.y !== 0)) {
    const points = brandLines.geometry.attributes.position.array;
    let ptr = 0;
    
    // Group logic to match original creation
    const groups = new Map();
    productNodes.forEach(node => {
      const brand = node.userData.product.company || 'Other';
      if (!groups.has(brand)) groups.set(brand, []);
      groups.get(brand).push(node);
    });

    groups.forEach((nodes) => {
      if (nodes.length < 2) return;
      
      nodes.forEach(nodeA => {
        let neighbors = nodes
          .filter(nodeB => nodeB !== nodeA)
          .map(nodeB => ({ node: nodeB, dist: nodeA.position.distanceTo(nodeB.position) }))
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 2);

        neighbors.forEach(neighbor => {
          points[ptr++] = nodeA.position.x;
          points[ptr++] = nodeA.position.y;
          points[ptr++] = nodeA.position.z;
          points[ptr++] = neighbor.node.position.x;
          points[ptr++] = neighbor.node.position.y;
          points[ptr++] = neighbor.node.position.z;
        });
      });
    });
    brandLines.geometry.attributes.position.needsUpdate = true;
  }

  renderer.render(scene, camera);
};

const onMouseDown = (event) => {
  if (isIntroPlaying.value || showDetail.value) return;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(productNodes, true);

  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj && !obj.userData.isNode) obj = obj.parent;
    
    if (obj) {
      isDragging = true;
      draggedNode = obj;
      controls.enabled = false;
      
      const normal = camera.getWorldDirection(new THREE.Vector3()).negate();
      plane.setFromNormalAndCoplanarPoint(normal, obj.position);
      
      if (raycaster.ray.intersectPlane(plane, pIntersect)) {
        pOffset.copy(obj.position).sub(pIntersect);
      }
    }
  }
};

const onMouseUp = () => {
  if (isDragging) {
    isDragging = false;
    draggedNode = null;
    controls.enabled = true;
  }
};

const onClick = (event) => {
  if (isIntroPlaying.value || showDetail.value || isDragging) return;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(productNodes, true);

  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj && !obj.userData.isNode) obj = obj.parent;
    
    if (obj) {
      openProductDetail(obj.userData.product, obj.position);
    }
  }
};

const openProductDetail = (product, pos) => {
  selectedProduct.value = product;
  showDetail.value = true;
  gsap.to(camera.position, {
    x: pos.x * 1.2,
    y: pos.y * 1.2,
    z: pos.z * 1.2,
    duration: 1,
    ease: "power3.out"
  });
};

const onMouseMove = (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  if (isDragging && draggedNode) {
    raycaster.setFromCamera(mouse, camera);
    if (raycaster.ray.intersectPlane(plane, pIntersect)) {
      draggedNode.position.copy(pIntersect.add(pOffset));
    }
  }
};
const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

onMounted(() => {
  initData();
  initThree();
  animate();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
  cancelAnimationFrame(animationId);
  renderer?.dispose();
  scene?.clear();
});

const handleClose = () => emit('close');
const resetView = () => {
  gsap.to(camera.position, { x: 0, y: 0, z: 320, duration: 1.5 });
};
</script>

<template>
  <div class="fixed inset-0 z-50 bg-[#050505] overflow-hidden">
    <div ref="container" class="w-full h-full cursor-crosshair"></div>

    <!-- HUD Overlay -->
    <div class="pointer-events-none absolute inset-0 flex flex-col justify-between p-10 font-mono text-[10px] uppercase tracking-[0.4em] text-white/20">
      <div class="flex justify-between items-start">
        <div class="flex flex-col gap-2">
          <div class="text-white/40 text-xs font-bold tracking-[0.2em] pointer-events-auto">{{ $t('universe.initialized') }}</div>
          <div>{{ $t('universe.objectCount') }}: {{ products.length }}</div>
          <div>{{ $t('universe.style') }}: {{ $t('universe.wireframeModel') }}</div>
        </div>
        <div class="pointer-events-auto flex gap-6">
           <button @click="resetView" class="hover:text-white transition-colors">{{ $t('universe.realign') }}</button>
           <button @click="handleClose" class="text-rose-500/60 hover:text-rose-500 transition-colors">{{ $t('universe.terminate') }}</button>
        </div>
      </div>

      <div class="flex justify-between items-end">
        <div class="flex flex-col gap-2">
          <div>{{ $t('universe.loc') }}: GALAXY_SECTOR_7</div>
          <div>{{ $t('universe.status') }}: {{ $t('universe.syncStable') }}</div>
        </div>
        <div class="text-right">
          <div>LAT: 42.102.1</div>
          <div>LNG: -19.44.0</div>
        </div>
      </div>
    </div>

    <!-- Intro Text -->
    <div v-if="isIntroPlaying" class="pointer-events-none absolute inset-0 flex items-center justify-center">
       <div class="text-center animate-pulse">
         <div class="text-[10px] uppercase tracking-[1em] text-white/30 mb-4">{{ $t('universe.entering') }}</div>
         <div class="text-3xl font-light tracking-[0.5em] text-white/80">NS UNIVERSE</div>
       </div>
    </div>

    <!-- Interface Controls (Visible after intro) -->
    <div v-if="!isIntroPlaying" class="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl animate-fade-in">
       <div class="text-[9px] uppercase tracking-widest text-white/40 mr-4">{{ $t('universe.filters') }}</div>
       <button 
         v-for="cat in categories.slice(0, 5)" 
         :key="cat"
         @click="activeCategory = cat"
         class="px-4 py-1.5 rounded-full text-[10px] uppercase tracking-wider transition-all border"
         :class="activeCategory === cat ? 'bg-white text-black border-white' : 'text-white/60 border-white/10 hover:border-white/30'"
       >
         {{ cat === 'all' ? 'Core' : cat }}
       </button>
    </div>

    <!-- Product Detail Overlay -->
    <transition name="slide-up">
      <div 
        v-if="showDetail && selectedProduct" 
        class="absolute inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-lg transition-all"
        @click.self="showDetail = false"
      >
        <div class="relative w-full max-w-6xl max-h-[85vh] bg-[#080808] border border-white/15 rounded-[3rem] overflow-hidden flex flex-col md:flex-row shadow-[0_64px_180px_rgba(0,0,0,0.92)] animate-scale-up">
          <!-- Global Close Button (Always visible) -->
          <button 
            @click="showDetail = false" 
            class="absolute top-6 right-6 z-50 rounded-full bg-white/5 p-3 text-white/40 hover:bg-white/10 hover:text-white transition-all backdrop-blur-xl border border-white/10"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>

          <div class="w-full md:w-1/2 aspect-square md:aspect-auto relative p-8">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.05),_transparent_70%)]"></div>
            <img :src="selectedProduct.img" class="w-full h-full object-contain relative z-10 rounded-3xl" />
          </div>

          <div class="w-full md:w-1/2 p-10 flex flex-col justify-center overflow-y-auto no-scrollbar">
            <div class="text-[10px] uppercase tracking-[0.4em] text-indigo-400/60 font-black mb-3">{{ selectedProduct.company }}</div>
            <h2 class="text-4xl md:text-5xl font-black tracking-tight text-white mb-6 uppercase leading-[1.1]">{{ selectedProduct.name }}</h2>
            <p class="text-white/50 text-lg leading-relaxed mb-10 max-h-[12rem] overflow-y-auto pr-4">{{ selectedProduct.desc }}</p>
            
            <div class="flex items-center justify-between mb-8">
               <div class="text-4xl font-black text-white">¥{{ selectedProduct.price }}</div>
               <div class="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">Available</div>
            </div>

            <div class="grid grid-cols-[1fr_auto] gap-4">
              <button @click="addToCart(selectedProduct); showToast('Added to Cart', 'success')" class="cta-pulse bg-white text-black py-4 rounded-full font-black uppercase tracking-widest hover:bg-gray-100 transition-all">
                Acquire Object
              </button>
              <button @click="toggleFavorite(selectedProduct)" class="w-14 h-14 rounded-full border border-white/15 text-white flex items-center justify-center hover:bg-white/5 transition-all">
                 <svg class="w-6 h-6" :class="{ 'fill-rose-500 stroke-rose-500': isFavorite(selectedProduct.id) }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(40px); }

.animate-fade-in { animation: fadeIn 1s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }

.cursor-crosshair { cursor: crosshair; }
</style>
