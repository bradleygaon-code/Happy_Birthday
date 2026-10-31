        const storySections = [
            document.getElementById('welcomeSection'),
            document.getElementById('timelineSection'),
            document.getElementById('reasonsSection'),
            document.getElementById('photosSection'),
            document.getElementById('letterSection')
        ];
        const previousSection = document.getElementById('previousSection');
        const nextSection = document.getElementById('nextSection');
        let currentSection = 0;
        let cameraStream = null;
        let audioContext = null;
        let blowAnimationFrame = null;
        let blowStartedAt = 0;

        function showSection(index) {
            if (index !== 0) {
                stopCamera();
            }

            currentSection = index;
            storySections.forEach((section, sectionIndex) => {
                section.hidden = sectionIndex !== currentSection;
            });

            previousSection.disabled = currentSection === 0;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        previousSection.addEventListener('click', () => {
            if (currentSection > 0) {
                showSection(currentSection - 1);
            }
        });

        nextSection.addEventListener('click', () => {
            showSection(currentSection === storySections.length - 1 ? 0 : currentSection + 1);
        });

        const letterContent = document.getElementById('letterContent');
        const letterToggle = document.getElementById('letterToggle');
        const welcomeSection = document.getElementById('welcomeSection');
        const cameraPreview = document.getElementById('cameraPreview');
        const birthdayCamera = document.getElementById('birthdayCamera');
        const candleStatus = document.getElementById('candleStatus');
        const startBlowDetection = document.getElementById('startBlowDetection');
        const manualExtinguish = document.getElementById('manualExtinguish');
        const stopCameraButton = document.getElementById('stopCamera');

        letterToggle.addEventListener('click', () => {
            const isOpening = letterContent.hidden;
            letterContent.hidden = !isOpening;
            letterToggle.setAttribute('aria-expanded', String(isOpening));
            letterToggle.textContent = isOpening ? 'Close' : 'Open';
        });

        function stopCamera() {
            if (blowAnimationFrame !== null) {
                cancelAnimationFrame(blowAnimationFrame);
                blowAnimationFrame = null;
            }

            if (cameraStream) {
                cameraStream.getTracks().forEach((track) => track.stop());
                cameraStream = null;
            }

            birthdayCamera.srcObject = null;
            cameraPreview.hidden = true;
            stopCameraButton.hidden = true;

            if (audioContext) {
                const contextToClose = audioContext;
                audioContext = null;
                contextToClose.close().catch((error) => {
                    console.error('Unable to close the audio context:', error);
                });
            }

            blowStartedAt = 0;
        }

        function extinguishCandle(message) {
            if (welcomeSection.classList.contains('candle-out')) {
                return;
            }

            welcomeSection.classList.add('candle-out');
            stopCamera();
            startBlowDetection.disabled = true;
            startBlowDetection.textContent = 'Candle is out';
            manualExtinguish.textContent = 'Relight candle';
            candleStatus.textContent = message;
            launchConfetti();
        }

        function relightCandle() {
            welcomeSection.classList.remove('candle-out');
            startBlowDetection.disabled = false;
            startBlowDetection.textContent = 'Turn on camera';
            manualExtinguish.textContent = 'Blow out candle';
            candleStatus.textContent = 'The candle is lit again!';
            stopConfetti();
        }

        /* ════════════════════════════════════════════
           CELEBRATION ANIMATION
           ════════════════════════════════════════════ */
        let celebCanvas       = null;
        let celebAnimFrame    = null;
        let celebPieces       = [];
        let celebBanner       = null;
        let celebStartTime    = null;
        const CELEB_DURATION  = 5500;

        const CONFETTI_COLORS = [
            '#f5a0b4', '#e86080', '#ffd6e0',
            '#ffb347', '#ffe066', '#c9b8f0',
            '#b5ead7', '#ff9ebc', '#ffffff'
        ];

        /* ── entry factories ── */
        function makeConfetti(canvasW, canvasH, side) {
            // "side" 0 = left cannon, 1 = right cannon
            const x  = side === 0 ? canvasW * 0.18 : canvasW * 0.82;
            const vy = -(12 + Math.random() * 10);
            const vx = (side === 0 ? 1 : -1) * (2 + Math.random() * 6);
            return {
                kind: 'confetti',
                x, y: canvasH * 0.6,
                vx, vy,
                w: 7 + Math.random() * 9,
                h: 4 + Math.random() * 6,
                angle: Math.random() * Math.PI * 2,
                spin:  (Math.random() - 0.5) * 0.22,
                color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                shape: Math.random() > 0.35 ? 'rect' : 'circle',
                alpha: 1
            };
        }

        function makeHeart(canvasW, canvasH) {
            return {
                kind:  'heart',
                x:     canvasW * (0.1 + Math.random() * 0.8),
                y:     canvasH + 20,
                vy:    -(1.4 + Math.random() * 2.2),
                vx:    (Math.random() - 0.5) * 0.9,
                size:  14 + Math.random() * 22,
                color: CONFETTI_COLORS[Math.floor(Math.random() * 4)],
                alpha: 0,
                delay: Math.random() * 1200   // ms before it starts rising
            };
        }

        function makeStar(canvasW, canvasH) {
            const cx    = canvasW / 2;
            const cy    = canvasH * 0.38;
            const angle = Math.random() * Math.PI * 2;
            const speed = 6 + Math.random() * 10;
            return {
                kind:  'star',
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 4,
                r:  3 + Math.random() * 4,
                color: ['#ffe066','#ffb347','#ffffff','#f5a0b4'][Math.floor(Math.random()*4)],
                trail: [],
                alpha: 1
            };
        }

        /* ── heart path helper ── */
        function drawHeart(ctx, x, y, size) {
            ctx.beginPath();
            ctx.moveTo(x, y + size * 0.3);
            ctx.bezierCurveTo(x, y, x - size * 0.5, y, x - size * 0.5, y + size * 0.3);
            ctx.bezierCurveTo(x - size * 0.5, y + size * 0.65, x, y + size * 0.95, x, y + size);
            ctx.bezierCurveTo(x, y + size * 0.95, x + size * 0.5, y + size * 0.65, x + size * 0.5, y + size * 0.3);
            ctx.bezierCurveTo(x + size * 0.5, y, x, y, x, y + size * 0.3);
            ctx.closePath();
        }

        /* ── main launch ── */
        function launchConfetti() {
            stopConfetti();

            celebCanvas = document.createElement('canvas');
            celebCanvas.style.cssText = [
                'position:fixed','inset:0','width:100%','height:100%',
                'pointer-events:none','z-index:9999'
            ].join(';');
            document.body.appendChild(celebCanvas);

            const resize = () => {
                celebCanvas.width  = window.innerWidth;
                celebCanvas.height = window.innerHeight;
            };
            resize();
            window.addEventListener('resize', resize);
            celebCanvas._resize = resize;

            const W = () => celebCanvas.width;
            const H = () => celebCanvas.height;

            // Confetti: two big cannon bursts
            for (let i = 0; i < 90; i++) celebPieces.push(makeConfetti(W(), H(), 0));
            for (let i = 0; i < 90; i++) celebPieces.push(makeConfetti(W(), H(), 1));

            // Stars: central ring burst
            for (let i = 0; i < 40; i++) celebPieces.push(makeStar(W(), H()));

            // Hearts: rising stream
            for (let i = 0; i < 28; i++) celebPieces.push(makeHeart(W(), H()));

            // Banner
            celebBanner = { alpha: 0, scale: 0.4, phase: 'in' };

            const ctx = celebCanvas.getContext('2d');
            celebStartTime = null;

            const tick = (now) => {
                if (!celebStartTime) celebStartTime = now;
                const elapsed = now - celebStartTime;
                const fadeOut = Math.max(0, 1 - (elapsed - (CELEB_DURATION - 900)) / 900);

                ctx.clearRect(0, 0, W(), H());

                /* ── draw each piece ── */
                celebPieces.forEach(p => {
                    if (p.kind === 'confetti') {
                        p.x     += p.vx;
                        p.y     += p.vy;
                        p.vy    += 0.32;          // gravity
                        p.vx    *= 0.992;
                        p.angle += p.spin;
                        p.alpha  = fadeOut;

                        ctx.save();
                        ctx.globalAlpha = p.alpha;
                        ctx.translate(p.x, p.y);
                        ctx.rotate(p.angle);
                        ctx.fillStyle = p.color;
                        if (p.shape === 'rect') {
                            ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
                        } else {
                            ctx.beginPath();
                            ctx.arc(0, 0, p.w/2, 0, Math.PI*2);
                            ctx.fill();
                        }
                        ctx.restore();

                    } else if (p.kind === 'star') {
                        p.trail.push({ x: p.x, y: p.y });
                        if (p.trail.length > 7) p.trail.shift();
                        p.x  += p.vx;
                        p.y  += p.vy;
                        p.vy += 0.25;
                        p.vx *= 0.98;
                        p.alpha = fadeOut;

                        // trail
                        p.trail.forEach((tp, ti) => {
                            const ta = (ti / p.trail.length) * 0.45 * p.alpha;
                            ctx.beginPath();
                            ctx.arc(tp.x, tp.y, p.r * (ti / p.trail.length), 0, Math.PI*2);
                            ctx.fillStyle = p.color;
                            ctx.globalAlpha = ta;
                            ctx.fill();
                        });

                        // head
                        ctx.save();
                        ctx.globalAlpha = p.alpha;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
                        ctx.fillStyle = p.color;
                        ctx.shadowColor = p.color;
                        ctx.shadowBlur  = 8;
                        ctx.fill();
                        ctx.restore();

                    } else if (p.kind === 'heart') {
                        if (elapsed < p.delay) return;
                        const age = elapsed - p.delay;
                        p.y += p.vy;
                        p.x += p.vx;
                        // fade in then fade out with global
                        p.alpha = Math.min(1, age / 400) * fadeOut;

                        ctx.save();
                        ctx.globalAlpha = p.alpha * 0.82;
                        ctx.fillStyle = p.color;
                        drawHeart(ctx, p.x - p.size/2, p.y - p.size/2, p.size);
                        ctx.fill();
                        ctx.restore();
                    }
                });

                /* ── banner ── */
                if (celebBanner) {
                    const bannerAge = elapsed;
                    if (bannerAge < 400) {
                        celebBanner.scale = 0.4 + (bannerAge / 400) * 0.65;
                        celebBanner.alpha = bannerAge / 400;
                    } else if (bannerAge < CELEB_DURATION - 900) {
                        // slight bounce settle
                        const t = (bannerAge - 400) / 300;
                        const bounce = t < 1 ? 1.05 - 0.05 * Math.sin(t * Math.PI) : 1;
                        celebBanner.scale = bounce;
                        celebBanner.alpha = 1;
                    } else {
                        celebBanner.alpha = fadeOut;
                        celebBanner.scale = 1;
                    }

                    ctx.save();
                    ctx.globalAlpha = celebBanner.alpha;
                    ctx.translate(W() / 2, H() * 0.22);
                    ctx.scale(celebBanner.scale, celebBanner.scale);

                    const text = 'Happy Birthday! 🎉';
                    const fs   = Math.max(28, Math.min(56, W() * 0.065));
                    ctx.font       = `700 ${fs}px 'Brush Script MT', cursive`;
                    ctx.textAlign  = 'center';
                    ctx.textBaseline = 'middle';

                    // soft glow
                    ctx.shadowColor = 'rgba(232,96,128,0.55)';
                    ctx.shadowBlur  = 22;
                    ctx.fillStyle   = '#c2607a';
                    ctx.fillText(text, 0, 0);

                    // white outline
                    ctx.shadowBlur  = 0;
                    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                    ctx.lineWidth   = 2;
                    ctx.strokeText(text, 0, 0);

                    ctx.restore();
                }

                if (elapsed < CELEB_DURATION) {
                    celebAnimFrame = requestAnimationFrame(tick);
                } else {
                    stopConfetti();
                }
            };

            celebAnimFrame = requestAnimationFrame(tick);
        }

        function stopConfetti() {
            if (celebAnimFrame !== null) {
                cancelAnimationFrame(celebAnimFrame);
                celebAnimFrame = null;
            }
            if (celebCanvas) {
                window.removeEventListener('resize', celebCanvas._resize);
                celebCanvas.remove();
                celebCanvas = null;
            }
            celebPieces    = [];
            celebBanner    = null;
            celebStartTime = null;
        }

        function listenForBlow(stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (!audioTrack) {
                candleStatus.textContent = 'No microphone was found. You can use the button to blow out the candle.';
                return;
            }

            // Re-use or create AudioContext
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 1024;
            const samples = new Float32Array(analyser.fftSize);

            // Skip the high-pass filter — it can suppress blow noise on some mics
            source.connect(analyser);

            const startListening = () => {
                if (welcomeSection.classList.contains('candle-out') || !cameraStream) {
                    return;
                }

                candleStatus.textContent = 'Listening... blow toward the microphone.';

                const detectBlow = (timestamp) => {
                    if (!cameraStream || welcomeSection.classList.contains('candle-out')) {
                        return;
                    }

                    analyser.getFloatTimeDomainData(samples);
                    let sumSquares = 0;
                    for (const sample of samples) {
                        sumSquares += sample * sample;
                    }
                    const volume = Math.sqrt(sumSquares / samples.length);

                    // Show live volume so it's easy to debug sensitivity
                    const bars = Math.min(20, Math.round(volume * 400));
                    const bar = '█'.repeat(bars) + '░'.repeat(20 - bars);
                    candleStatus.textContent = `Volume: [${bar}] — keep blowing!`;

                    // Lowered threshold: 0.012 RMS (was 0.065)
                    if (volume > 0.012) {
                        if (blowStartedAt === 0) {
                            blowStartedAt = timestamp;
                        } else if (timestamp - blowStartedAt >= 600) {
                            extinguishCandle('You did it! You blew out the candle! 🎉');
                            return;
                        }
                    } else {
                        blowStartedAt = 0;
                    }

                    blowAnimationFrame = requestAnimationFrame(detectBlow);
                };

                blowAnimationFrame = requestAnimationFrame(detectBlow);
            };

            // AudioContext may be suspended (especially on file://) — resume it
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(startListening).catch((error) => {
                    candleStatus.textContent = `Could not start the microphone: ${error.message}. Use the button instead.`;
                    console.error('Unable to resume AudioContext:', error);
                });
            } else {
                startListening();
            }
        }

        startBlowDetection.addEventListener('click', async () => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                candleStatus.textContent = 'Camera access is unavailable on this page. Open it over HTTPS or localhost, or use the button to blow out the candle.';
                return;
            }

            startBlowDetection.disabled = true;
            candleStatus.textContent = 'Requesting camera and microphone access...';

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false
                    },
                    video: { facingMode: 'user' }
                });

                if (currentSection !== 0 || welcomeSection.classList.contains('candle-out')) {
                    stream.getTracks().forEach((track) => track.stop());
                    startBlowDetection.disabled = false;
                    return;
                }

                cameraStream = stream;
                birthdayCamera.srcObject = cameraStream;
                cameraPreview.hidden = false;
                stopCameraButton.hidden = false;
                listenForBlow(cameraStream);
                startBlowDetection.textContent = 'Listening...';
            } catch (error) {
                stopCamera();
                startBlowDetection.disabled = false;
                startBlowDetection.textContent = 'Try again';
                if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    candleStatus.textContent = 'Camera or microphone access was denied. Allow access in your browser settings, or use the button to blow out the candle.';
                } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                    candleStatus.textContent = 'No camera or microphone was found. You can use the button to blow out the candle.';
                } else {
                    candleStatus.textContent = `Could not access the camera or microphone: ${error.message}. You can use the button to blow out the candle.`;
                }
                console.error('Unable to access the camera and microphone:', error);
            }
        });

        manualExtinguish.addEventListener('click', () => {
            if (welcomeSection.classList.contains('candle-out')) {
                relightCandle();
            } else {
                extinguishCandle('You blew out the candle!');
            }
        });

        stopCameraButton.addEventListener('click', () => {
            stopCamera();
            if (!welcomeSection.classList.contains('candle-out')) {
                startBlowDetection.disabled = false;
                startBlowDetection.textContent = 'Turn on camera';
                candleStatus.textContent = 'The camera and microphone are off.';
            }
        });

        window.addEventListener('pagehide', stopCamera);

        // Add staggered animation to timeline items
        window.addEventListener('load', () => {
            const timelineItems = document.querySelectorAll('.timeline-item');
            timelineItems.forEach((item, index) => {
                item.style.animationDelay = (index * 0.2) + 's';
            });

            const reasonItems = document.querySelectorAll('.reason-item');
            reasonItems.forEach((item, index) => {
                item.style.animation = `fadeIn 0.6s ease-out ${(index * 0.1)}s both`;
            });
        });