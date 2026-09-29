// Raw track.getCapabilities() of the Pixel 10 rear camera (Chrome 153), measured on the phone.
export const PIXEL10_RAW = {
  colorTemperature: { max: 7000, min: 2850, step: 50 },
  exposureCompensation: { max: 4, min: -4, step: 0.1666666716337204 },
  exposureMode: ['continuous', 'manual'],
  exposureTime: { max: 160000.02085, min: 0.56968, step: 0.1 },
  facingMode: ['environment'],
  focusDistance: { max: 3.772224187850952, min: 0.05000000074505806, step: 0.009999999776482582 },
  focusMode: ['manual', 'single-shot', 'continuous'],
  iso: { max: 7518, min: 30, step: 1 },
  torch: true,
  whiteBalanceMode: ['continuous', 'manual'],
  zoom: { max: 20, min: 1, step: 0.1 },
}
