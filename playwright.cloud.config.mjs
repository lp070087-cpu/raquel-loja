import {defineConfig} from './backend/node_modules/@playwright/test/index.mjs';
const baseURL=process.env.RAQUEL_PREVIEW_URL,executablePath=process.env.PLAYWRIGHT_EXECUTABLE_PATH;
if(!baseURL||!/^https:\/\/raquel-loja-ew91-[a-z0-9-]+\.vercel\.app$/.test(baseURL))throw new Error('VERIFIED_PREVIEW_URL_REQUIRED');
export default defineConfig({testDir:'./tests',testMatch:'cloud-checkout.spec.mjs',workers:1,timeout:600000,expect:{timeout:30000},reporter:'list',use:{baseURL,reducedMotion:'reduce',actionTimeout:30000,navigationTimeout:30000,trace:'off',screenshot:'off',...(!executablePath?{channel:'chrome'}:{}),launchOptions:{args:['--disable-gpu'],...(executablePath?{executablePath}:{})}},outputDir:'test-results/cloud-checkout'});
