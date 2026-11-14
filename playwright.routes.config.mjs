import {defineConfig} from './backend/node_modules/@playwright/test/index.mjs';
const executablePath=process.env.PLAYWRIGHT_EXECUTABLE_PATH;
export default defineConfig({testDir:'./tests',testMatch:'routes-mobile.spec.mjs',workers:1,timeout:240000,expect:{timeout:30000},reporter:'list',use:{...(!executablePath?{channel:'chrome'}:{}),baseURL:'http://127.0.0.1:8000',reducedMotion:'reduce',actionTimeout:30000,navigationTimeout:30000,trace:'off',screenshot:'off',launchOptions:{args:['--disable-gpu'],...(executablePath?{executablePath}:{})}},outputDir:'test-results/routes-mobile'});
