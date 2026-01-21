/**
 * Love Project - Main JavaScript
 * Interstellar Math: 笛卡尔之心
 * 
 * A Three.js particle heart animation with visual effects
 */

// Three.js 将通过 script 标签全局加载

// --- 全局变量 ---
let scene, camera, renderer, particles, starfield;
let geom, starGeom;
const particleCount = 60000;
const starCount = 2000;

// 计时器起始时间
const startDate = new Date(2014, 8, 30, 1, 30, 0);

// 存储形态数据
const shapes = [];

// 动画与交互
let mouseX = 0;
let mouseY = 0;

// 心跳动画状态
let heartbeatPhase = 0;
let heartbeatScale = 1;

// 音乐状态
let audioContext = null;
let audioElement = null;
let isMusicPlaying = false;

// FPS 计算
let frameCount = 0;
let lastTime = performance.now();
let animationFrameId = null;

// --- 初始化系统 ---
function init() {
    const container = document.getElementById('canvas-container');

    // 场景
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0008);

    // 相机
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 5000);

    // 根据屏幕宽度动态调整相机位置，确保心形完整显示
    const screenWidth = window.innerWidth;
    if (screenWidth <= 375) {
        // 小屏手机（iPhone SE 等）
        camera.position.z = 1300;
        camera.position.y = 0;
    } else if (screenWidth <= 480) {
        // 普通手机
        camera.position.z = 1200;
        camera.position.y = 20;
    } else if (screenWidth <= 768) {
        // 平板端
        camera.position.z = 1000;
        camera.position.y = 60;
    } else {
        // 桌面端
        camera.position.z = 800;
        camera.position.y = 100;
    }

    // 渲染器
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true  // 保留绘图缓冲区以支持截图
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制像素比以提升性能
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);

    // 修复截图颜色空间问题
    renderer.outputColorSpace = THREE.SRGBColorSpace || THREE.sRGBEncoding;

    container.appendChild(renderer.domElement);

    // 初始化粒子系统
    initParticles();

    // 初始化星空背景
    initStarfield();

    // 事件监听
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('touchmove', onDocumentTouchMove, { passive: true });
    window.addEventListener('resize', onWindowResize, false);

    // 隐藏加载文字
    document.getElementById('loading').style.display = 'none';

    // 启动计时器 (每秒更新一次，而不是每帧)
    updateLoveTimer();
    setInterval(updateLoveTimer, 1000);

    // 检查纪念日
    checkAnniversary();

    // 启动动画
    animate();
}

// --- 粒子系统初始化 ---
function initParticles() {
    // 创建粒子纹理 (内置生成，避免外部依赖)
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    // 绘制发光粒子
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 200, 200, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 100, 100, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 50, 50, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    const sprite = new THREE.CanvasTexture(canvas);

    // 材质
    const material = new THREE.PointsMaterial({
        size: 3,
        map: sprite,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        opacity: 0.6,
        vertexColors: true
    });

    // 几何体
    geom = new THREE.BufferGeometry();

    // 初始化缓冲区
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const currentPositions = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);

    // 生成心形位置
    console.log("Generating Heart...");
    shapes.push({ name: "RON'S HEART", data: getHeartPositions(), color: new THREE.Color(0xff3366) });

    const startShape = shapes[0];
    document.getElementById('shape-name').innerText = startShape.name;

    for (let i = 0; i < particleCount; i++) {
        currentPositions[i * 3] = startShape.data[i * 3];
        currentPositions[i * 3 + 1] = startShape.data[i * 3 + 1];
        currentPositions[i * 3 + 2] = startShape.data[i * 3 + 2];

        // 保存原始位置
        originalPositions[i * 3] = startShape.data[i * 3];
        originalPositions[i * 3 + 1] = startShape.data[i * 3 + 1];
        originalPositions[i * 3 + 2] = startShape.data[i * 3 + 2];

        // 颜色设置
        if (i >= particleCount - 2) {
            // 高亮粒子
            colors[i * 3] = 2.0;
            colors[i * 3 + 1] = 1.8;
            colors[i * 3 + 2] = 1.8;
        } else {
            const shadeVar = Math.random() * 0.2;
            colors[i * 3] = startShape.color.r + shadeVar;
            colors[i * 3 + 1] = startShape.color.g + shadeVar * 0.5;
            colors[i * 3 + 2] = startShape.color.b + shadeVar * 0.5;
        }
    }

    geom.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // 保存原始位置用于心跳动画
    geom.userData = {
        originalPositions: originalPositions,
        currentColor: startShape.color
    };

    particles = new THREE.Points(geom, material);
    scene.add(particles);
}

// --- 星空背景初始化 ---
function initStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
        // 在球形空间中随机分布星星
        const radius = 1500 + Math.random() * 2000;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        starPositions[i * 3 + 2] = radius * Math.cos(phi);

        // 星星颜色 (白色到淡蓝色)
        const brightness = 0.5 + Math.random() * 0.5;
        starColors[i * 3] = brightness;
        starColors[i * 3 + 1] = brightness;
        starColors[i * 3 + 2] = brightness + Math.random() * 0.3;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    // 星星纹理
    const starCanvas = document.createElement('canvas');
    starCanvas.width = 16;
    starCanvas.height = 16;
    const starCtx = starCanvas.getContext('2d');

    const starGradient = starCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
    starGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    starGradient.addColorStop(0.3, 'rgba(200, 220, 255, 0.6)');
    starGradient.addColorStop(1, 'rgba(100, 150, 255, 0)');

    starCtx.fillStyle = starGradient;
    starCtx.fillRect(0, 0, 16, 16);

    const starSprite = new THREE.CanvasTexture(starCanvas);

    const starMaterial = new THREE.PointsMaterial({
        size: 2,
        map: starSprite,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        opacity: 0.8,
        vertexColors: true
    });

    starfield = new THREE.Points(starGeometry, starMaterial);
    scene.add(starfield);
}

// --- 心形位置生成 ---
function getHeartPositions() {
    const arr = new Float32Array(particleCount * 3);
    const scale = 25;

    for (let i = 0; i < particleCount - 2; i++) {
        let t = Math.random() * Math.PI * 2;
        let u = Math.random() * Math.PI;

        const x = 16 * Math.pow(Math.sin(t), 3) * Math.sin(u);
        const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        const z = 16 * Math.pow(Math.sin(t), 3) * Math.cos(u);

        arr[i * 3] = x * scale;
        arr[i * 3 + 1] = y * scale;
        arr[i * 3 + 2] = z * scale;
    }

    // 高亮点
    let i = particleCount - 2;
    arr[i * 3] = 16 * scale;
    arr[i * 3 + 1] = 4 * scale;
    arr[i * 3 + 2] = 0;

    i = particleCount - 1;
    arr[i * 3] = -16 * scale;
    arr[i * 3 + 1] = 4 * scale;
    arr[i * 3 + 2] = 0;

    return arr;
}

// --- 计时器更新 ---
function updateLoveTimer() {
    const now = new Date();
    const diff = now - startDate;

    if (diff < 0) {
        document.getElementById('love-timer').innerText = "T-MINUS...";
        return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const h = hours.toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    const s = seconds.toString().padStart(2, '0');

    const timerText = `${days} DAYS ${h}:${m}:${s}`;
    document.getElementById('love-timer').innerText = timerText;
}

// --- 纪念日检查 ---
function checkAnniversary() {
    const now = new Date();
    const diff = now - startDate;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    // 计算周年和月纪念日
    const years = Math.floor(days / 365);
    const months = Math.floor(days / 30);

    let anniversaryType = null;
    let message = '';

    // 检查是否是周年纪念日 (误差 1 天内)
    if (days > 0 && days % 365 <= 1) {
        anniversaryType = 'yearly';
        message = `恭喜！今天是你们的 ${years} 周年纪念日！`;
    }
    // 检查是否是整月纪念日 (每月 30 号)
    else if (now.getDate() === 30 && months > 0) {
        anniversaryType = 'monthly';
        message = `今天是你们相爱的第 ${months} 个月！`;
    }
    // 检查整百天
    else if (days > 0 && days % 100 === 0) {
        anniversaryType = 'hundred';
        message = `恭喜！今天是你们相爱的第 ${days} 天！`;
    }

    if (anniversaryType && !sessionStorage.getItem(`anniversary_shown_${days}`)) {
        showAnniversaryAlert(message);
        sessionStorage.setItem(`anniversary_shown_${days}`, 'true');
    }
}

function showAnniversaryAlert(message) {
    const alert = document.getElementById('anniversary-alert');
    const msgElement = document.getElementById('anniversary-message');

    msgElement.textContent = message;
    alert.classList.add('show');

    // 触发庆祝粒子效果
    triggerCelebration();
}

function hideAnniversaryAlert() {
    const alert = document.getElementById('anniversary-alert');
    alert.classList.remove('show');
}

function triggerCelebration() {
    // 临时增强心跳效果
    const originalScale = 1;
    let celebrationTime = 0;

    const celebrationInterval = setInterval(() => {
        celebrationTime += 50;
        heartbeatScale = 1 + Math.sin(celebrationTime * 0.02) * 0.15;

        if (celebrationTime > 3000) {
            clearInterval(celebrationInterval);
            heartbeatScale = originalScale;
        }
    }, 50);
}

// --- 截图与分享 ---
function captureScreenshot() {
    // 渲染一帧以确保画面最新
    renderer.render(scene, camera);

    // 获取 canvas 图像数据
    const dataURL = renderer.domElement.toDataURL('image/png');

    // 创建下载链接
    const link = document.createElement('a');
    link.download = `love-heart-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
}

async function shareImage() {
    if (navigator.share && navigator.canShare) {
        try {
            renderer.render(scene, camera);

            const canvas = renderer.domElement;
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

            const file = new File([blob], 'love-heart.png', { type: 'image/png' });

            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: '我们的爱情时光',
                    text: document.getElementById('love-timer').innerText,
                    files: [file]
                });
                return;
            }
        } catch (err) {
            console.log('Share failed:', err);
        }
    }

    // 降级为下载
    captureScreenshot();
}

// --- 背景音乐控制 ---
function toggleMusic() {
    const musicBtn = document.getElementById('music-btn');
    const wavesEl = musicBtn.querySelector('.music-waves');

    if (!audioElement) {
        // 创建 Audio 元素播放 MP3
        audioElement = new Audio();

        // 尝试加载用户提供的 MP3 文件
        // 优先级：assets/music.mp3 > assets/bgm.mp3 > 合成音乐
        const musicFiles = ['assets/music.mp3', 'assets/bgm.mp3'];
        let musicLoaded = false;

        // 尝试加载第一个可用的音乐文件
        for (const file of musicFiles) {
            audioElement.src = file;
            audioElement.loop = true;
            audioElement.volume = 0.3;

            // 检测文件是否存在
            audioElement.addEventListener('canplaythrough', function () {
                if (!musicLoaded) {
                    musicLoaded = true;
                    console.log('Loaded music:', file);
                }
            }, { once: true });

            audioElement.addEventListener('error', function (e) {
                console.log('Failed to load:', file);
                // 如果所有文件都失败，使用合成音乐
                if (!musicLoaded && file === musicFiles[musicFiles.length - 1]) {
                    console.log('Using synthesized music as fallback');
                    audioElement = null;
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    createAmbientMusic();
                }
            }, { once: true });

            break; // 只尝试第一个文件
        }

        if (audioElement) {
            audioElement.play().then(() => {
                isMusicPlaying = true;
                wavesEl.classList.remove('paused');
            }).catch(err => {
                console.log('Playback failed:', err);
                // 降级到合成音乐
                audioElement = null;
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                createAmbientMusic();
                isMusicPlaying = true;
                wavesEl.classList.remove('paused');
            });
        }
    } else {
        // 切换播放/暂停
        if (isMusicPlaying) {
            if (audioElement.pause) {
                audioElement.pause();
            } else if (audioContext) {
                audioContext.suspend();
            }
            isMusicPlaying = false;
            wavesEl.classList.add('paused');
        } else {
            if (audioElement.play) {
                audioElement.play();
            } else if (audioContext) {
                audioContext.resume();
            }
            isMusicPlaying = true;
            wavesEl.classList.remove('paused');
        }
    }
}

// 合成音乐作为降级方案
function createAmbientMusic() {
    const duration = 8;
    const baseFreq = 220;

    function playChord(time, frequencies, volume = 0.05) {
        frequencies.forEach(freq => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, time);

            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(volume, time + 0.5);
            gainNode.gain.linearRampToValueAtTime(0, time + duration - 0.5);

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start(time);
            oscillator.stop(time + duration);
        });
    }

    function scheduleChords() {
        const now = audioContext.currentTime;
        playChord(now, [baseFreq, baseFreq * 1.2, baseFreq * 1.5]);
        playChord(now + duration, [baseFreq * 0.8, baseFreq, baseFreq * 1.2]);
        playChord(now + duration * 2, [baseFreq * 1.2, baseFreq * 1.5, baseFreq * 1.8]);
        playChord(now + duration * 3, [baseFreq * 0.9, baseFreq * 1.1, baseFreq * 1.35]);
        setTimeout(scheduleChords, duration * 4 * 1000);
    }

    scheduleChords();
}

// --- 事件处理 ---
function onDocumentMouseMove(event) {
    mouseX = (event.clientX - window.innerWidth / 2) * 0.5;
    mouseY = (event.clientY - window.innerHeight / 2) * 0.5;

    const coordsEl = document.getElementById('coords');
    if (coordsEl) {
        coordsEl.innerText = `${Math.round(mouseX)}, ${Math.round(mouseY)}`;
    }
}

function onDocumentTouchMove(event) {
    if (event.touches.length > 0) {
        mouseX = (event.touches[0].clientX - window.innerWidth / 2) * 0.3;
        mouseY = (event.touches[0].clientY - window.innerHeight / 2) * 0.3;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 根据新的窗口宽度动态调整相机位置
    const screenWidth = window.innerWidth;
    if (screenWidth <= 375) {
        camera.position.z = 1300;
        camera.position.y = 0;
    } else if (screenWidth <= 480) {
        camera.position.z = 1200;
        camera.position.y = 20;
    } else if (screenWidth <= 768) {
        camera.position.z = 1000;
        camera.position.y = 60;
    } else {
        camera.position.z = 800;
        camera.position.y = 100;
    }
}

function toggleUI() {
    const uiContainer = document.getElementById('ui-container');
    uiContainer.classList.toggle('hidden');
}

// --- FPS 更新 ---
function updateFPS() {
    frameCount++;
    const time = performance.now();
    if (time - lastTime >= 1000) {
        const fps = frameCount;
        document.getElementById('fps-num').innerText = fps;

        const fill = document.getElementById('fps-fill');
        const width = Math.min(100, (fps / 60) * 100);
        fill.style.width = width + '%';
        fill.style.backgroundColor = fps > 50 ? '#0f0' : (fps > 30 ? '#ff0' : '#f00');
        fill.style.boxShadow = `0 0 10px ${fill.style.backgroundColor}`;

        frameCount = 0;
        lastTime = time;
    }
}

// --- 心跳动画 ---
function updateHeartbeat(time) {
    // 心跳周期：约 1.5 秒
    const heartbeatPeriod = 1.5;
    const phase = (time % heartbeatPeriod) / heartbeatPeriod;

    // 双峰心跳曲线
    let beat;
    if (phase < 0.1) {
        beat = Math.sin(phase * Math.PI / 0.1) * 0.08;
    } else if (phase < 0.2) {
        beat = Math.sin((phase - 0.1) * Math.PI / 0.1) * 0.05;
    } else {
        beat = 0;
    }

    heartbeatScale = 1 + beat;
}

// --- 主动画循环 ---
function animate() {
    animationFrameId = requestAnimationFrame(animate);
    updateFPS();

    const time = Date.now() * 0.001;

    // 更新心跳
    updateHeartbeat(time);

    // 心形旋转
    particles.rotation.y += 0.003;

    // 应用心跳缩放
    particles.scale.set(heartbeatScale, heartbeatScale, heartbeatScale);

    // 粒子波动 (每 3 帧更新一次以提升性能)
    if (frameCount % 3 === 0) {
        const positions = geom.attributes.position.array;
        const originalPositions = geom.userData.originalPositions;

        for (let i = 0; i < particleCount; i++) {
            const waveOffset = Math.sin(time * 2 + i * 0.05) * 0.5;
            positions[i * 3] = originalPositions[i * 3] + waveOffset;
            positions[i * 3 + 1] = originalPositions[i * 3 + 1] + Math.cos(time * 2 + i * 0.05) * 0.5;
        }
        geom.attributes.position.needsUpdate = true;
    }

    // 鼠标交互倾斜
    particles.rotation.x += (mouseY * 0.0005 - particles.rotation.x) * 0.05;
    particles.rotation.z += (mouseX * 0.0005 - particles.rotation.z) * 0.05;

    // 星空缓慢旋转
    if (starfield) {
        starfield.rotation.y += 0.0002;
        starfield.rotation.x += 0.0001;
    }

    // 渲染
    renderer.render(scene, camera);
}

// --- 启动 ---
window.addEventListener('DOMContentLoaded', init);

// 导出函数供 HTML 调用
window.toggleMusic = toggleMusic;
window.shareImage = shareImage;
window.captureScreenshot = captureScreenshot;
window.hideAnniversaryAlert = hideAnniversaryAlert;
window.toggleUI = toggleUI;
