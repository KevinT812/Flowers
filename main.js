import * as THREE from 'https://cdn.skypack.dev/three@0.133.1/build/three.module'

// ---------------- DETECCIÓN ----------------
const isAndroid = /Android/i.test(navigator.userAgent)
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

// ---------------- ELEMENTOS ----------------
const canvasEl = document.querySelector('#canvas')
const cleanBtn = document.querySelector('.clean-btn')

// ---------------- POINTER ----------------
const pointer = {
	x: 0.66,
	y: 0.3,
	clicked: true,
	vanishCanvas: false
}

// demo auto
setTimeout(() => {
	pointer.x = 0.75
	pointer.y = 0.5
	pointer.clicked = true
}, 700)

// ---------------- THREE ----------------
const renderer = new THREE.WebGLRenderer({
	canvas: canvasEl,
	alpha: true,
	powerPreference: 'high-performance'
})

// 🔥 pixel ratio controlado
const DPR = isAndroid
	? Math.min(window.devicePixelRatio, 1.25)
	: Math.min(window.devicePixelRatio, 2)

renderer.setPixelRatio(DPR)

const sceneShader = new THREE.Scene()
const sceneBasic = new THREE.Scene()
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10)
const clock = new THREE.Clock()

let shaderMaterial, basicMaterial
let renderTargets = []

// ---------------- SHADER PLANE ----------------
function createPlane() {
	shaderMaterial = new THREE.ShaderMaterial({
		uniforms: {
			u_stop_time: { value: 0 },
			u_stop_randomizer: { value: new THREE.Vector2(Math.random(), Math.random()) },
			u_cursor: { value: new THREE.Vector2(pointer.x, pointer.y) },
			u_ratio: { value: window.innerWidth / window.innerHeight },
			u_texture: { value: null },
			u_clean: { value: 1 }
		},
		vertexShader: document.getElementById('vertexShader').textContent,
		fragmentShader: document.getElementById('fragmentShader').textContent
	})

	basicMaterial = new THREE.MeshBasicMaterial()

	const geo = new THREE.PlaneGeometry(2, 2)
	sceneBasic.add(new THREE.Mesh(geo, basicMaterial))
	sceneShader.add(new THREE.Mesh(geo, shaderMaterial))
}

// ---------------- RENDER TARGETS ----------------
function createRenderTargets(w, h) {
	const scale = isAndroid ? 0.6 : 1
	return [
		new THREE.WebGLRenderTarget(w * scale, h * scale),
		new THREE.WebGLRenderTarget(w * scale, h * scale)
	]
}

// ---------------- SIZE ----------------
function updateSize() {
	const w = window.innerWidth
	const h = window.innerHeight

	renderer.setSize(w, h)
	shaderMaterial.uniforms.u_ratio.value = w / h

	renderTargets.forEach(rt => rt.dispose())
	renderTargets = createRenderTargets(w, h)
}

// ---------------- INPUT ----------------
let isTouch = false

window.addEventListener('click', e => {
	if (isTouch) return
	pointer.x = e.pageX / window.innerWidth
	pointer.y = e.pageY / window.innerHeight
	pointer.clicked = true
})

window.addEventListener('touchstart', e => {
	isTouch = true
	pointer.x = e.targetTouches[0].pageX / window.innerWidth
	pointer.y = e.targetTouches[0].pageY / window.innerHeight
	pointer.clicked = true
}, { passive: true })

cleanBtn.addEventListener('click', () => {
	pointer.vanishCanvas = true
	setTimeout(() => (pointer.vanishCanvas = false), 60)
})

// ---------------- RENDER LOOP (FPS LIMIT) ----------------
let lastTime = 0
const FPS = isAndroid ? 30 : 60
const interval = 1000 / FPS

function render(time = 0) {

	if (time - lastTime < interval) {
		requestAnimationFrame(render)
		return
	}
	lastTime = time

	shaderMaterial.uniforms.u_clean.value = pointer.vanishCanvas ? 0 : 1
	shaderMaterial.uniforms.u_texture.value = renderTargets[0].texture

	if (pointer.clicked) {
		shaderMaterial.uniforms.u_cursor.value.set(
			pointer.x,
			1 - pointer.y
		)
		shaderMaterial.uniforms.u_stop_randomizer.value.set(
			Math.random(),
			Math.random()
		)
		shaderMaterial.uniforms.u_stop_time.value = 0
		pointer.clicked = false
	}

	shaderMaterial.uniforms.u_stop_time.value += clock.getDelta()

	// render feedback
	renderer.setRenderTarget(renderTargets[1])
	renderer.render(sceneShader, camera)

	basicMaterial.map = renderTargets[1].texture
	renderer.setRenderTarget(null)
	renderer.render(sceneBasic, camera)

	// swap
	;[renderTargets[0], renderTargets[1]] = [renderTargets[1], renderTargets[0]]

	requestAnimationFrame(render)
}

// ---------------- INIT ----------------
createPlane()
updateSize()
window.addEventListener('resize', () => {
	updateSize()
	pointer.vanishCanvas = true
	setTimeout(() => (pointer.vanishCanvas = false), 100)
})

render()
