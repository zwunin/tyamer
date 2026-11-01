import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Этот конфиг сохраняет оригинальную плавную сборку React + Tailwind, но без внутренних ошибок Kimi
export default defineConfig({
  plugins: [react()],
  base: './',
})
