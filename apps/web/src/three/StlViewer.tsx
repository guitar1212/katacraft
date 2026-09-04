import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type CameraPreset = 'isometric' | 'front' | 'top' | 'side';

export interface StlViewerHandle {
  setCameraPreset: (preset: CameraPreset) => void;
}

interface StlViewerProps {
  /** Absolute URL to an STL file to load. Null/undefined clears the scene. */
  url?: string | null;
  className?: string;
}

/**
 * Minimal Three.js STL viewer: scene + perspective camera + orbit controls,
 * with a couple of camera preset shortcuts. Re-renders continuously via
 * requestAnimationFrame while mounted.
 */
export const StlViewer = forwardRef<StlViewerHandle, StlViewerProps>(function StlViewer({ url, className }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const frameRef = useRef<number>(0);
  const radiusRef = useRef<number>(80);

  useImperativeHandle(ref, () => ({
    setCameraPreset(preset: CameraPreset) {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;
      const r = radiusRef.current;
      switch (preset) {
        case 'isometric':
          camera.position.set(r, r, r);
          break;
        case 'front':
          camera.position.set(0, 0, r * 1.5);
          break;
        case 'top':
          camera.position.set(0, r * 1.5, 0.01);
          break;
        case 'side':
          camera.position.set(r * 1.5, 0, 0);
          break;
      }
      controls.target.set(0, 0, 0);
      controls.update();
    },
  }));

  // Scene bootstrap (once).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3f4f6);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    camera.position.set(80, 80, 80);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(1, 1, 1);
    scene.add(dir);
    const grid = new THREE.GridHelper(200, 20, 0xcccccc, 0xe5e7eb);
    scene.add(grid);

    const resize = () => {
      if (!container) return;
      const { clientWidth, clientHeight } = container;
      if (clientWidth === 0 || clientHeight === 0) return;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Load / replace STL mesh when url changes.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      (meshRef.current.material as THREE.Material).dispose();
      meshRef.current = null;
    }

    if (!url) return;

    let cancelled = false;
    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        if (cancelled || !sceneRef.current) return;
        geometry.center();
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
        const radius = geometry.boundingSphere?.radius ?? 40;
        radiusRef.current = Math.max(radius * 2.2, 20);

        const material = new THREE.MeshStandardMaterial({ color: 0x60a5fa, metalness: 0.1, roughness: 0.6 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        scene.add(mesh);
        meshRef.current = mesh;

        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (camera && controls) {
          camera.position.set(radiusRef.current, radiusRef.current, radiusRef.current);
          controls.target.set(0, 0, 0);
          controls.update();
        }
      },
      undefined,
      (err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to load STL', err);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [url]);

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }} />;
});
