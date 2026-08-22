import { useSoundStore } from './soundStore'

// Звуковые эффекты игры (по просьбе клиента "звуки и звуки шагов").
// Все звуки СИНТЕЗИРУЮТСЯ через Web Audio API прямо в браузере (осцилляторы
// + шум + огибающие громкости/частоты) - НЕ mp3/wav файлы. Сознательное
// решение: у сайта нет собственной звукотеки, а тянуть чужие звуковые
// библиотеки означало бы либо платный лицензионный контент, либо
// сомнительные по правам бесплатные сэмплы. Процедурный звук — бесплатно,
// без вопросов лицензирования, не увеличивает вес сборки ни на байт.
//
// AudioContext создаётся ЛЕНИВО и только по требованию первого реального
// звука - браузеры (autoplay policy) блокируют звук до жеста пользователя,
// создание контекста заранее ничего не даёт, а просто добавляет лишний
// (хоть и небольшой) риск предупреждения в консоли "AudioContext was not
// allowed to start".
let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let noiseBufferCache: AudioBuffer | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
    if (!Ctor) return null
    audioCtx = new Ctor()
    masterGain = audioCtx.createGain()
    masterGain.gain.value = useSoundStore.getState().volume
    masterGain.connect(audioCtx.destination)
    // Живая подписка - слайдер громкости в настройках (SettingsModal.tsx)
    // должен действовать мгновенно на уже идущие звуки, не только на
    // следующий вызов play*().
    useSoundStore.subscribe((state) => {
      if (masterGain) masterGain.gain.value = state.volume
    })
  }
  // Возобновление - iOS Safari и Chrome автоматически "усыпляют" контекст,
  // если он был создан вне явного пользовательского жеста, либо после
  // долгого периода без звука на некоторых платформах.
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  return audioCtx
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBufferCache) return noiseBufferCache
  const duration = 0.3
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  noiseBufferCache = buffer
  return buffer
}

// Короткий "стук"/"шорох" из отфильтрованного шума - основа для шагов,
// приземления, порталов. pan - лёгкое смещение влево/вправо (шаги
// чередуются) для более естественного ощущения, а не одна и та же точка.
function playNoiseBurst(
  ctx: AudioContext,
  { frequency, duration, peak, pan = 0 }: { frequency: number; duration: number; peak: number; pan?: number },
) {
  if (!masterGain) return
  const source = ctx.createBufferSource()
  source.buffer = getNoiseBuffer(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = frequency
  const gain = ctx.createGain()
  const panner = ctx.createStereoPanner()
  panner.pan.value = pan
  const now = ctx.currentTime
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.001), now + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(panner)
  panner.connect(masterGain)
  source.start(now)
  source.stop(now + duration + 0.02)
}

// Короткий тон с плавным скольжением частоты (свист вверх/вниз) - основа
// для прыжка/скиллов/квестовых "звоночков".
function playTone(
  ctx: AudioContext,
  {
    freqStart,
    freqEnd,
    duration,
    peak,
    type = 'sine',
    delay = 0,
  }: { freqStart: number; freqEnd: number; duration: number; peak: number; type?: OscillatorType; delay?: number },
) {
  if (!masterGain) return
  const osc = ctx.createOscillator()
  osc.type = type
  const gain = ctx.createGain()
  const now = ctx.currentTime + delay
  osc.frequency.setValueAtTime(freqStart, now)
  osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), now + duration)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(peak, now + Math.min(0.02, duration / 4))
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  osc.connect(gain)
  gain.connect(masterGain)
  osc.start(now)
  osc.stop(now + duration + 0.02)
}

// Чередование лёгкого панорамирования влево/вправо на каждый следующий
// шаг - тот же приём, что у настоящих игр для ощущения "левая-правая нога".
let footstepPanToggle = 1

export function playFootstep(running: boolean) {
  const ctx = getContext()
  if (!ctx) return
  footstepPanToggle *= -1
  playNoiseBurst(ctx, {
    frequency: running ? 480 : 340,
    duration: running ? 0.075 : 0.095,
    peak: running ? 0.22 : 0.16,
    pan: footstepPanToggle * 0.12,
  })
}

export function playJump() {
  const ctx = getContext()
  if (!ctx) return
  playTone(ctx, { freqStart: 340, freqEnd: 620, duration: 0.14, peak: 0.18, type: 'triangle' })
}

export function playLand() {
  const ctx = getContext()
  if (!ctx) return
  playNoiseBurst(ctx, { frequency: 220, duration: 0.12, peak: 0.2 })
}

// Подбор бонуса - короткое яркое "дзынь" из двух быстрых нот вверх, как
// монетка в аркадах, но синтезированное, а не сэмпл.
export function playPickup() {
  const ctx = getContext()
  if (!ctx) return
  playTone(ctx, { freqStart: 523, freqEnd: 660, duration: 0.09, peak: 0.22, type: 'sine' })
  playTone(ctx, { freqStart: 784, freqEnd: 988, duration: 0.12, peak: 0.22, type: 'sine', delay: 0.06 })
}

export function playQuestAccept() {
  const ctx = getContext()
  if (!ctx) return
  playTone(ctx, { freqStart: 300, freqEnd: 500, duration: 0.22, peak: 0.2, type: 'triangle' })
}

// Более "полное" завершение - три ноты по восходящему трезвучию, чем
// принятие задания, чтобы сдача квеста ощущалась весомее.
export function playQuestComplete() {
  const ctx = getContext()
  if (!ctx) return
  ;[392, 494, 588].forEach((freq, i) => {
    playTone(ctx, { freqStart: freq, freqEnd: freq, duration: 0.2, peak: 0.2, type: 'triangle', delay: i * 0.09 })
  })
}

export function playSkill() {
  const ctx = getContext()
  if (!ctx) return
  playTone(ctx, { freqStart: 640, freqEnd: 180, duration: 0.18, peak: 0.2, type: 'sawtooth' })
}

// "Вжух" телепорта - шум с резко растущей частотой среза фильтра, а не
// тон - лучше передаёт ощущение "пространство разрывается", чем чистая нота.
export function playPortal() {
  const ctx = getContext()
  if (!ctx || !masterGain) return
  const source = ctx.createBufferSource()
  source.buffer = getNoiseBuffer(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  const gain = ctx.createGain()
  const now = ctx.currentTime
  const duration = 0.5
  filter.frequency.setValueAtTime(200, now)
  filter.frequency.exponentialRampToValueAtTime(4000, now + duration)
  filter.Q.value = 4
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.28, now + 0.05)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(masterGain)
  source.start(now)
  source.stop(now + duration + 0.02)
}

export function playUiClick() {
  const ctx = getContext()
  if (!ctx) return
  playTone(ctx, { freqStart: 700, freqEnd: 700, duration: 0.045, peak: 0.12, type: 'square' })
}

// Гул двигателя машины (CarDriving.tsx) - непрерывный, в отличие от
// коротких one-shot эффектов выше, поэтому отдельный "живой" объект с
// собственным стартом/остановкой/обновлением интенсивности по скорости
// вместо простой функции. Пилообразная волна + lowpass - тот же приём,
// что дают многие простые аркадные звукогенераторы для "рычащего" мотора.
class EngineSound {
  private osc: OscillatorNode | null = null
  private filter: BiquadFilterNode | null = null
  private gain: GainNode | null = null

  start() {
    const ctx = getContext()
    if (!ctx || !masterGain || this.osc) return
    this.osc = ctx.createOscillator()
    this.osc.type = 'sawtooth'
    this.osc.frequency.value = 55
    this.filter = ctx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.frequency.value = 220
    this.gain = ctx.createGain()
    this.gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    this.gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.15)
    this.osc.connect(this.filter)
    this.filter.connect(this.gain)
    this.gain.connect(masterGain)
    this.osc.start()
  }

  // speedRatio: 0 (стоит) .. 1 (максимальная скорость) - двигатель звучит
  // выше и громче по мере разгона, тише и ниже на холостых.
  setSpeed(speedRatio: number) {
    if (!this.osc || !this.filter || !this.gain) return
    const ctx = this.osc.context
    const clamped = Math.min(1, Math.max(0, speedRatio))
    this.osc.frequency.setTargetAtTime(55 + clamped * 90, ctx.currentTime, 0.08)
    this.filter.frequency.setTargetAtTime(220 + clamped * 900, ctx.currentTime, 0.08)
    this.gain.gain.setTargetAtTime(0.08 + clamped * 0.1, ctx.currentTime, 0.08)
  }

  stop() {
    if (!this.osc || !this.gain) return
    const ctx = this.osc.context
    const osc = this.osc
    const gain = this.gain
    gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1)
    window.setTimeout(() => {
      osc.stop()
      osc.disconnect()
    }, 300)
    this.osc = null
    this.filter = null
    this.gain = null
  }
}

export const engineSound = new EngineSound()
