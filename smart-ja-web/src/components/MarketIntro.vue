<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import * as THREE from 'three';
import gsap from 'gsap';

const container = ref(null);
const emit = defineEmits(['complete']);

let scene, camera, renderer, animationId;
let planet, ship, shipGroup, trail = [];
let isReady = ref(false);

const initScene = () => {
  if (!container.value) return;

  // Scene & Camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 0, 100);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.value.appendChild(renderer.domElement);

  // 1. Create Planet (Low-poly White Model)
  const planetGeo = new THREE.IcosahedronGeometry(15, 4);
  const edges = new THREE.EdgesGeometry(planetGeo);
  const planetMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
  planet = new THREE.LineSegments(edges, planetMaterial);
  
  // Add some specific structures to the planet surface
  const planetInnerGeo = new THREE.IcosahedronGeometry(14.8, 1);
  const innerEdges = new THREE.EdgesGeometry(planetInnerGeo);
  const innerMat = new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.2 });
  const planetInner = new THREE.LineSegments(innerEdges, innerMat);
  planet.add(planetInner);
  
  // Add a "Product Slot" crater on the positive Z face
  const slotGeo = new THREE.TorusGeometry(1.5, 0.1, 8, 32);
  const slotEdges = new THREE.EdgesGeometry(slotGeo);
  const slotLines = new THREE.LineSegments(slotEdges, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
  slotLines.position.set(0, 0, 15);
  planet.add(slotLines);

  scene.add(planet);

  // 2. Create M-Ship (Milan-style simplified)
  shipGroup = new THREE.Group();
  
  // Cockpit
  const cockGeo = new THREE.BoxGeometry(0.8, 0.4, 1.5);
  const cockEdges = new THREE.EdgesGeometry(cockGeo);
  const shipMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  const cockpit = new THREE.LineSegments(cockEdges, shipMat);
  shipGroup.add(cockpit);
  
  // Wings (simplified Milan-style)
  const wingGeo = new THREE.BoxGeometry(3, 0.1, 1);
  const leftWing = new THREE.LineSegments(new THREE.EdgesGeometry(wingGeo), shipMat);
  leftWing.position.set(-1.5, 0, 0);
  leftWing.rotation.z = Math.PI / 12;
  shipGroup.add(leftWing);
  
  const rightWing = new THREE.LineSegments(new THREE.EdgesGeometry(wingGeo), shipMat);
  rightWing.position.set(1.5, 0, 0);
  rightWing.rotation.z = -Math.PI / 12;
  shipGroup.add(rightWing);

  scene.add(shipGroup);
  
  // Animation setup
  shipGroup.position.set(60, 40, -20);
  shipGroup.lookAt(-60, -40, 20);

  startAnimation();
};

const startAnimation = () => {
  const tl = gsap.timeline({
    onComplete: () => {
      setTimeout(() => emit('complete'), 500);
    }
  });

  // Phase 1: Ship Fly-by
  tl.to(shipGroup.position, {
    x: -80,
    y: -50,
    z: 30,
    duration: 3.5,
    ease: "power2.inOut",
    onUpdate: () => {
      // Trail effect
      if (Math.random() > 0.6) createTrailPoint(shipGroup.position.clone());
    }
  });

  // Phase 2: Camera Zoom and Planet Focus
  tl.to(camera.position, {
    x: 0,
    y: 0,
    z: 18.5, // Stop right in front of the "slot"
    duration: 2.2,
    ease: "expo.inOut",
    delay: -1.2 // Overlap with ship flight
  }, "-=1.5");
  
  tl.to(planet.rotation, {
    y: Math.PI * 0.1,
    duration: 2,
    ease: "power1.inOut"
  }, "<");
};

const createTrailPoint = (pos) => {
  const geo = new THREE.SphereGeometry(0.05, 4, 4);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
  const p = new THREE.Mesh(geo, mat);
  p.position.copy(pos);
  scene.add(p);
  trail.push({ mesh: p, opacity: 0.6 });
};

const animate = () => {
  animationId = requestAnimationFrame(animate);
  
  // Gentle planet rotation
  if (planet) {
    planet.rotation.y += 0.001;
    planet.rotation.x += 0.0005;
  }
  
  // Animate trail points
  for (let i = trail.length - 1; i >= 0; i--) {
    trail[i].opacity -= 0.012;
    trail[i].mesh.material.opacity = trail[i].opacity;
    if (trail[i].opacity <= 0) {
      scene.remove(trail[i].mesh);
      trail.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
};

onMounted(() => {
  initScene();
  animate();
  window.addEventListener('resize', handleResize);
  setTimeout(() => isReady.value = true, 100);
});

const handleResize = () => {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  cancelAnimationFrame(animationId);
  renderer?.dispose();
  scene?.clear();
});
</script>

<template>
  <div class="fixed inset-0 z-[100] bg-[#050505]" :class="{ 'opacity-0 pointer-events-none transition-opacity duration-1000': !isReady }">
    <div ref="container" class="h-full w-full"></div>
    
    <!-- UI Overlays for aesthetic -->
    <div class="pointer-events-none absolute inset-0 flex flex-col justify-between p-10 font-mono">
      <div class="flex justify-between text-[10px] uppercase tracking-[0.4em] text-white/20">
        <div>NS_MATRIX // CORE_SCAN</div>
        <div>SYS_VERSION_0.94b</div>
      </div>
      <div class="flex justify-between text-[10px] uppercase tracking-[0.4em] text-white/20">
        <div>SECTOR_G12 // GRID_ACTIVE</div>
        <div>ALIGNMENT_SYNC_COMPLETE</div>
      </div>
    </div>

    <!-- Center focus overlay -->
    <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
       <div class="h-64 w-64 rounded-full border border-white/[0.03] animate-pulse"></div>
       <div class="absolute h-[1px] w-32 bg-white/5 left-[10%]"></div>
       <div class="absolute h-[1px] w-32 bg-white/5 right-[10%]"></div>
    </div>
  </div>
</template>

<style scoped>
.font-mono {
  font-family: 'SF Mono', 'Fira Code', 'Roboto Mono', monospace;
}
</style>
